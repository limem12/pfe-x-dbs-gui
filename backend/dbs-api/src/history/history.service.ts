import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

type HistoryRow = {
  id: number;
  user: string;
  avatar: string | null;
  action: string;
  entity: string;
  details: string;
  date: string;
};

@Injectable()
export class HistoryService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private readonly actionMap: Record<string, string> = {
    creation: 'Creation',
    modification: 'Modification',
    suppression: 'Suppression',
    connexion: 'Connexion',
    deconnexion: 'Deconnexion',
    reordonner: 'Reordonner',
    deplacer: 'Deplacer',
  };

  private readonly entityMap: Record<string, string> = {
    product: 'Produit',
    produit: 'Produit',
    step: 'Step',
    stepparam: 'StepParam',
    steplimit: 'StepLimit',
    sequence: 'Sequence',
    sequencestep: 'SequenceStep',
    productsequence: 'ProductSequence',
    productstepparam: 'ProductStepParam',
    componentinstance: 'ComponentInstance',
    productsteplimit: 'ProductStepLimit',
    executionconfig: 'ExecutionConfig',
    modeexecution: 'ModeExecution',
    right: 'Right',
    avatar: 'Avatar',
    productcounter: 'ProductCounter',
    productstatus: 'ProductStatus',
    status: 'Status',
    stepstatus: 'StepStatus',
    user: 'User',
    role: 'Role',
  };

  private normalizeLabel(value: string | undefined | null): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private resolveStoredAction(action: string): string {
    const storedAction = this.actionMap[this.normalizeLabel(action)];

    if (!storedAction) {
      throw new BadRequestException(`Action historique invalide: ${action}`);
    }

    return storedAction;
  }

  private resolveStoredEntity(entity: string): string {
    const storedEntity = this.entityMap[this.normalizeLabel(entity)];

    if (!storedEntity) {
      throw new BadRequestException(`Entite historique invalide: ${entity}`);
    }

    return storedEntity;
  }

  private mapStoredValue(
    value: string | undefined | null,
    valueMap: Record<string, string>,
  ): string {
    const normalizedValue = valueMap[this.normalizeLabel(value)];

    if (normalizedValue) {
      return normalizedValue;
    }

    return (value || '').trim();
  }

  private mapRow(row: HistoryRow): HistoryRow {
    return {
      ...row,
      action: this.mapStoredValue(row.action, this.actionMap),
      entity: this.mapStoredValue(row.entity, this.entityMap),
    };
  }

  private async resolveStoredUserName(
    userName: string | undefined | null,
  ): Promise<string | null> {
    const normalizedUserName = (userName || '').trim();

    if (!normalizedUserName) {
      return null;
    }

    const result = await this.pool.query<{ username: string }>(
      `SELECT username
       FROM "user"
       WHERE LOWER(username) = LOWER($1)
       LIMIT 1`,
      [normalizedUserName],
    );

    return result.rows[0]?.username ?? null;
  }

  async findAll() {
    const result = await this.pool.query<HistoryRow>(`
      SELECT
        history_id as id,
        user_name as user,
        history_user.avatar as avatar,
        action,
        entity,
        details,
        history.created_at AT TIME ZONE 'UTC' as date
      FROM history
      LEFT JOIN "user" history_user
        ON LOWER(history_user.username) = LOWER(history.user_name)
      ORDER BY history.created_at DESC
    `);

    return result.rows.map((row) => this.mapRow(row));
  }

  async create(dto: {
    user_name: string;
    action: string;
    entity: string;
    entity_id?: string | number | null;
    details: string;
  }) {
    const storedAction = this.resolveStoredAction(dto.action);
    const storedEntity = this.resolveStoredEntity(dto.entity);
    const storedUserName = await this.resolveStoredUserName(dto.user_name);
    const entityId =
      dto.entity_id === undefined || dto.entity_id === null
        ? Number.NaN
        : Number(dto.entity_id);

    try {
      const result = await this.pool.query<HistoryRow>(
        `INSERT INTO history (user_name, action, entity, entity_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW() AT TIME ZONE 'UTC')
         RETURNING
           history_id as id,
           user_name as user,
           NULL::text as avatar,
           action,
           entity,
          details,
          created_at AT TIME ZONE 'UTC' as date`,
        [
          storedUserName,
          storedAction,
          storedEntity,
          Number.isNaN(entityId) ? null : entityId,
          dto.details,
        ],
      );

      return this.mapRow(result.rows[0]);
    } catch (error: unknown) {
      const pgError = error as { code?: string; detail?: string };

      if (pgError.code === '23505') {
        const existing = await this.pool.query<HistoryRow>(
          `SELECT
             history_id as id,
             user_name as user,
             history_user.avatar as avatar,
             action,
             entity,
             details,
             history.created_at AT TIME ZONE 'UTC' as date
           FROM history
           LEFT JOIN "user" history_user
             ON LOWER(history_user.username) = LOWER(history.user_name)
           WHERE user_name = $1
             AND action = $2
             AND entity = $3
             AND entity_id IS NOT DISTINCT FROM $4
             AND details = $5
           ORDER BY history.created_at DESC
          LIMIT 1`,
          [
            storedUserName,
            storedAction,
            storedEntity,
            Number.isNaN(entityId) ? null : entityId,
            dto.details,
          ],
        );

        if (existing.rows.length > 0) {
          return this.mapRow(existing.rows[0]);
        }
      }

      throw error;
    }
  }
}
