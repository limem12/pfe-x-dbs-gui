import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../database/database.module';
import { HistoryService } from '../history/history.service';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { Sequence } from './sequence.interface';

type SequenceRow = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  createdBy: string;
  stepIds: number[] | null;
};

@Injectable()
export class SequencesService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly historyService: HistoryService,
  ) {}

  private convertToNumber(id: string | number): number {
    if (typeof id === 'number') return id;

    const match = id.match(/\d+/);
    return match ? parseInt(match[0], 10) : NaN;
  }

  private parseStepIds(stepIds?: Array<string | number>): number[] {
    return (stepIds ?? [])
      .map((rawId) => this.convertToNumber(rawId))
      .filter((stepId) => !isNaN(stepId));
  }

  private async validateStepIds(
    client: PoolClient,
    stepIds: number[],
  ): Promise<void> {
    if (stepIds.length === 0) {
      return;
    }

    const uniqueStepIds = [...new Set(stepIds)];
    const result = await client.query<{ step_id: number }>(
      `SELECT id as step_id FROM step WHERE id = ANY($1::int[])`,
      [uniqueStepIds],
    );

    const existingStepIds = new Set(result.rows.map((row) => row.step_id));
    const missingStepIds = uniqueStepIds.filter(
      (stepId) => !existingStepIds.has(stepId),
    );

    if (missingStepIds.length > 0) {
      throw new BadRequestException(
        `Impossible d'utiliser des steps inexistants: ${missingStepIds.join(', ')}`,
      );
    }
  }

  private async replaceSequenceSteps(
    client: PoolClient,
    sequenceId: number,
    stepIds: number[],
  ): Promise<void> {
    await client.query(`DELETE FROM sequence_step WHERE sequence_id = $1`, [
      sequenceId,
    ]);

    for (const [index, stepId] of stepIds.entries()) {
      await client.query(
        `INSERT INTO sequence_step (sequence_id, step_id, order_index, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (sequence_id, order_index) DO UPDATE
         SET step_id = EXCLUDED.step_id`,
        [sequenceId, stepId, index + 1],
      );
    }
  }

  private async ensureProductExecutionConfigsForSequence(
    client: PoolClient,
    sequenceId: number,
    stepIds: number[],
  ): Promise<void> {
    if (stepIds.length === 0) {
      return;
    }

    await client.query(
      `INSERT INTO product_execution_config (
         product_id,
         execution_mode_id,
         sequence_id,
         step_id,
         is_active,
         ignore_fail,
         retry_on_fail,
         repeat_count,
         retry_delay_ms,
         created_at
       )
       SELECT
         pp.product_id,
         em.id,
         NULL,
         target.step_id,
         TRUE,
         FALSE,
         0,
         1,
         0,
         NOW()
       FROM product_pipeline pp
       CROSS JOIN execution_mode em
       CROSS JOIN unnest($2::int[]) AS target(step_id)
       WHERE pp.zone = 'SEQUENCE'
         AND pp.sequence_id = $1
         AND EXISTS (SELECT 1 FROM step st WHERE st.id = target.step_id)
       ON CONFLICT DO NOTHING`,
      [sequenceId, [...new Set(stepIds)]],
    );
  }

  private async createHistoryEntry(entry: {
    userName?: string;
    action: string;
    entityId: number;
    details: string;
  }) {
    try {
      await this.historyService.create({
        user_name: entry.userName || 'System',
        action: entry.action,
        entity: 'Sequence',
        entity_id: entry.entityId,
        details: entry.details,
      });
    } catch (historyError) {
      console.error('Error logging sequence history:', historyError);
    }
  }

  private mapSequenceRow(row: SequenceRow): Sequence {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      createdAt: row.createdAt,
      createdBy: row.createdBy,
      stepIds: Array.isArray(row.stepIds)
        ? row.stepIds.map((stepId: number) => String(stepId))
        : [],
    };
  }

  async findAll(): Promise<Sequence[]> {
    const result = await this.pool.query<SequenceRow>(`
      SELECT s.id, s.name, COALESCE(s.description, '') as description,
             TO_CHAR(s.created_at, 'YYYY-MM-DD') as "createdAt",
             'System' as "createdBy",
             COALESCE(
               (SELECT array_agg(step_id ORDER BY order_index)
                FROM sequence_step
                WHERE sequence_id = s.id),
               ARRAY[]::integer[]
             ) as "stepIds"
      FROM "sequence" s
      ORDER BY s.id
    `);

    return result.rows.map((row) => this.mapSequenceRow(row));
  }

  async findOne(id: number): Promise<Sequence> {
    const result = await this.pool.query<SequenceRow>(
      `SELECT s.id, s.name, COALESCE(s.description, '') as description,
              TO_CHAR(s.created_at, 'YYYY-MM-DD') as "createdAt",
              'System' as "createdBy",
              COALESCE(
                (SELECT array_agg(step_id ORDER BY order_index)
                 FROM sequence_step
                 WHERE sequence_id = s.id),
                ARRAY[]::integer[]
              ) as "stepIds"
       FROM "sequence" s
       WHERE s.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Sequence ${id} non trouvee`);
    }

    return this.mapSequenceRow(result.rows[0]);
  }

  async create(
    dto: CreateSequenceDto,
    actorUsername?: string,
    actorName?: string,
  ): Promise<Sequence> {
    const client = await this.pool.connect();
    void actorUsername;

    try {
      await client.query('BEGIN');

      const parsedStepIds = this.parseStepIds(dto.stepIds);
      await this.validateStepIds(client, parsedStepIds);

      const sequenceResult = await client.query<{ id: number }>(
        `INSERT INTO "sequence" (name, description, created_at)
         VALUES ($1, $2, NOW())
         RETURNING id`,
        [dto.name, dto.description || ''],
      );
      const sequenceId = sequenceResult.rows[0].id;

      await this.replaceSequenceSteps(client, sequenceId, parsedStepIds);
      await this.ensureProductExecutionConfigsForSequence(
        client,
        sequenceId,
        parsedStepIds,
      );

      await client.query('COMMIT');

      const createdSequence = await this.findOne(sequenceId);
      await this.createHistoryEntry({
        userName: actorName,
        action: 'Creation',
        entityId: sequenceId,
        details: `Creation de la sequence: ${createdSequence.name}`,
      });

      return createdSequence;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async update(
    id: number,
    dto: Partial<CreateSequenceDto>,
    actorUsername?: string,
    actorName?: string,
  ): Promise<Sequence> {
    const client = await this.pool.connect();
    void actorUsername;

    try {
      await client.query('BEGIN');

      const existingSequence = await client.query(
        `SELECT id
         FROM "sequence"
         WHERE id = $1
         FOR UPDATE`,
        [id],
      );

      if (existingSequence.rows.length === 0) {
        throw new NotFoundException(`Sequence ${id} non trouvee`);
      }

      if (dto.name !== undefined || dto.description !== undefined) {
        const updates: string[] = [];
        const values: Array<string | number | null> = [];
        let idx = 1;

        if (dto.name !== undefined) {
          updates.push(`name = $${idx++}`);
          values.push(dto.name);
        }

        if (dto.description !== undefined) {
          updates.push(`description = $${idx++}`);
          values.push(dto.description);
        }

        values.push(id);
        await client.query(
          `UPDATE "sequence" SET ${updates.join(', ')} WHERE id = $${idx}`,
          values,
        );
      }

      if (dto.stepIds !== undefined) {
        const parsedStepIds = this.parseStepIds(dto.stepIds);
        await this.validateStepIds(client, parsedStepIds);
        await this.replaceSequenceSteps(client, id, parsedStepIds);
        await this.ensureProductExecutionConfigsForSequence(
          client,
          id,
          parsedStepIds,
        );
      }

      await client.query('COMMIT');

      const updatedSequence = await this.findOne(id);
      await this.createHistoryEntry({
        userName: actorName,
        action: 'Modification',
        entityId: id,
        details: `Modification de la sequence: ${updatedSequence.name}`,
      });

      return updatedSequence;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async remove(
    id: number,
    actorUsername?: string,
    actorName?: string,
  ): Promise<{ message: string }> {
    const client = await this.pool.connect();
    void actorUsername;

    try {
      await client.query('BEGIN');

      const sequenceResult = await client.query<{ name: string }>(
        `SELECT name FROM "sequence" WHERE id = $1`,
        [id],
      );

      if (sequenceResult.rows.length === 0) {
        throw new NotFoundException(`Sequence ${id} non trouvee`);
      }

      const sequenceName = sequenceResult.rows[0].name;

      await client.query(`DELETE FROM sequence_step WHERE sequence_id = $1`, [
        id,
      ]);
      const result = await client.query(
        `DELETE FROM "sequence" WHERE id = $1 RETURNING id`,
        [id],
      );

      if (result.rowCount === 0) {
        throw new NotFoundException(`Sequence ${id} non trouvee`);
      }

      await client.query('COMMIT');

      await this.createHistoryEntry({
        userName: actorName,
        action: 'Suppression',
        entityId: id,
        details: `Suppression de la sequence: ${sequenceName}`,
      });

      return { message: 'Sequence supprimee' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
