import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import {
  describeFieldChange,
  describeParamChanges,
} from '../common/history-details.util';
import { PG_POOL } from '../database/database.module';
import { HistoryService } from '../history/history.service';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { Step } from './step.interface';

@Injectable()
export class StepsService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly historyService: HistoryService,
  ) {}

  private validateParamType(type: string, value: string): boolean {
    if (!type || type === '') return true;

    switch (type.toLowerCase()) {
      case 'string':
        return true;
      case 'integer':
        return /^-?\d+$/.test(value);
      case 'float':
        return /^-?\d+(\.\d+)?$/.test(value);
      case 'boolean':
        return (
          value.toLowerCase() === 'true' ||
          value.toLowerCase() === 'false' ||
          value === '0' ||
          value === '1'
        );
      default:
        return true;
    }
  }

  private normalizeParamType(type?: string): string {
    switch (type?.toLowerCase()) {
      case 'integer':
      case 'int':
        return 'int';
      case 'float':
        return 'float';
      case 'boolean':
        return 'boolean';
      default:
        return 'string';
    }
  }

  private async assertValidDependency(
    client: PoolClient,
    stepId: number | null,
    dependsOn: number | null | undefined,
  ) {
    if (dependsOn === null || dependsOn === undefined) {
      return;
    }

    if (stepId !== null && dependsOn === stepId) {
      throw new BadRequestException('Un step ne peut pas dependre de lui-meme');
    }

    const dependency = await client.query(`SELECT id FROM step WHERE id = $1`, [
      dependsOn,
    ]);

    if (dependency.rows.length === 0) {
      throw new BadRequestException(`Le step dependant ${dependsOn} est introuvable`);
    }

    if (stepId === null) {
      return;
    }

    const cycle = await client.query(
      `WITH RECURSIVE dependency_chain AS (
         SELECT id, depends_on
         FROM step
         WHERE id = $1
         UNION ALL
         SELECT parent.id, parent.depends_on
         FROM step parent
         JOIN dependency_chain child ON parent.id = child.depends_on
         WHERE child.depends_on IS NOT NULL
       )
       SELECT 1
       FROM dependency_chain
       WHERE id = $2
       LIMIT 1`,
      [dependsOn, stepId],
    );

    if (cycle.rows.length > 0) {
      throw new BadRequestException(
        'Cette dependance cree une boucle entre steps',
      );
    }
  }

  private buildStepSelect(whereClause = ''): string {
    return `SELECT s.id, s.name, COALESCE(s.description, '') as description,
              s.depends_on as "dependsOn",
              d.name as "dependsOnName",
              TO_CHAR(s.created_at, 'YYYY-MM-DD') as "createdAt",
              NULLIF(NULLIF(s.created_by, ''), 'System') as "createdBy",
              NULLIF(NULLIF(s.modified_by, ''), 'System') as "modifiedBy",
              TO_CHAR(s.modified_at, 'YYYY-MM-DD HH24:MI:SS') as "modifiedAt",
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', p.id,
                    'name', p.param_name,
                    'type', CASE p.param_type
                      WHEN 'int' THEN 'Integer'
                      WHEN 'float' THEN 'Float'
                      WHEN 'boolean' THEN 'Boolean'
                      ELSE 'String'
                    END,
                    'value', COALESCE(p.default_value, '')
                  )
                  ORDER BY p.id
                ) FILTER (WHERE p.id IS NOT NULL),
                '[]'::json
              ) as params
       FROM step s
       LEFT JOIN step d ON s.depends_on = d.id
       LEFT JOIN step_param p ON s.id = p.step_id
       ${whereClause}
       GROUP BY s.id, d.name`;
  }

  private async getStepSnapshot(
    client: PoolClient,
    stepId: number,
  ): Promise<Step> {
    const result = await client.query<Step>(
      this.buildStepSelect('WHERE s.id = $1'),
      [stepId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Step ${stepId} non trouve`);
    }

    return result.rows[0];
  }

  private buildUpdateHistoryDetails(
    previousStep: Step,
    updatedStep: Step,
    dto: UpdateStepDto,
  ): string {
    const stepName = previousStep.name || `Step ${previousStep.id}`;
    const changes: string[] = [];

    if (dto.name !== undefined) {
      const change = describeFieldChange('nom', previousStep.name, dto.name);
      if (change) changes.push(change);
    }

    if (dto.description !== undefined) {
      const change = describeFieldChange(
        'description',
        previousStep.description,
        dto.description ?? '',
      );
      if (change) changes.push(change);
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'dependsOn')) {
      const previousDependency =
        previousStep.dependsOnName || previousStep.dependsOn || '';
      const nextDependency = updatedStep.dependsOnName || updatedStep.dependsOn || '';
      const change = describeFieldChange(
        'dependance',
        previousDependency,
        nextDependency,
      );
      if (change) changes.push(change);
    }

    if (dto.params !== undefined) {
      changes.push(...describeParamChanges(previousStep.params, dto.params));
    }

    if (changes.length === 1 && changes[0].startsWith('parametre ')) {
      return `Modification du ${changes[0]} sur step ${stepName}`;
    }

    return changes.length > 0
      ? `Modification du step ${stepName}: ${changes.join(', ')}`
      : `Modification du step: ${stepName}`;
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
        entity: 'Step',
        entity_id: entry.entityId,
        details: entry.details,
      });
    } catch (historyError) {
      console.error('Error logging step history:', historyError);
    }
  }

  async findAll(): Promise<Step[]> {
    const result = await this.pool.query<Step>(`
      ${this.buildStepSelect()}
      ORDER BY s.id
    `);

    return result.rows;
  }

  async findOne(id: number): Promise<Step> {
    const result = await this.pool.query<Step>(
      this.buildStepSelect('WHERE s.id = $1'),
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Step ${id} non trouve`);
    }

    return result.rows[0];
  }

  async create(
    dto: CreateStepDto,
    actorUsername?: string,
    actorName?: string,
  ): Promise<Step> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const param of dto.params ?? []) {
        if (
          param.type &&
          param.type !== '' &&
          !this.validateParamType(param.type, param.value || '')
        ) {
          throw new BadRequestException(
            `Le parametre "${param.name}" a une valeur "${param.value}" qui ne correspond pas au type "${param.type}"`,
          );
        }
      }

      const actor = actorName || actorUsername || null;
      const dependsOn = dto.dependsOn ?? null;
      await this.assertValidDependency(client, null, dependsOn);

      const stepResult = await client.query<{ id: number }>(
        `INSERT INTO step (
           name, description, depends_on, created_by, modified_by,
           modified_at, created_at
         )
         VALUES ($1, $2, $3, $4, $4, NOW(), NOW())
         RETURNING id`,
        [dto.name, dto.description || '', dependsOn, actor],
      );
      const stepId = stepResult.rows[0].id;

      for (const param of dto.params ?? []) {
        await client.query(
          `INSERT INTO step_param (step_id, param_name, param_type, default_value, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [
            stepId,
            param.name,
            this.normalizeParamType(param.type),
            param.value || '',
          ],
        );
      }

      await client.query('COMMIT');

      const createdStep = await this.findOne(stepId);
      await this.createHistoryEntry({
        userName: actorName,
        action: 'Creation',
        entityId: stepId,
        details: `Creation du step: ${createdStep.name}`,
      });

      return createdStep;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async update(
    id: number,
    dto: UpdateStepDto,
    actorUsername?: string,
    actorName?: string,
  ): Promise<Step> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const existingStep = await client.query(
        `SELECT id
         FROM step
         WHERE id = $1
         FOR UPDATE`,
        [id],
      );

      if (existingStep.rows.length === 0) {
        throw new NotFoundException(`Step ${id} non trouve`);
      }

      const previousStep = await this.getStepSnapshot(client, id);
      const shouldUpdateDependency = Object.prototype.hasOwnProperty.call(
        dto,
        'dependsOn',
      );
      const dependsOn = shouldUpdateDependency ? dto.dependsOn ?? null : undefined;

      for (const param of dto.params ?? []) {
        if (
          param.type &&
          param.type !== '' &&
          !this.validateParamType(param.type, param.value || '')
        ) {
          throw new BadRequestException(
            `Le parametre "${param.name}" a une valeur "${param.value}" qui ne correspond pas au type "${param.type}"`,
          );
        }
      }

      if (
        dto.name !== undefined ||
        dto.description !== undefined ||
        shouldUpdateDependency
      ) {
        await this.assertValidDependency(client, id, dependsOn);

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

        if (shouldUpdateDependency) {
          updates.push(`depends_on = $${idx++}`);
          values.push(dependsOn ?? null);
        }

        updates.push(`modified_by = $${idx++}`);
        values.push(actorName || actorUsername || null);
        updates.push(`modified_at = NOW()`);

        values.push(id);
        await client.query(
          `UPDATE step SET ${updates.join(', ')} WHERE id = $${idx}`,
          values,
        );
      }

      if (dto.params !== undefined) {
        await client.query(`DELETE FROM step_param WHERE step_id = $1`, [id]);

        for (const param of dto.params) {
          await client.query(
            `INSERT INTO step_param (step_id, param_name, param_type, default_value, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [
              id,
              param.name,
              this.normalizeParamType(param.type),
              param.value || '',
            ],
          );
        }
      }

      await client.query('COMMIT');

      const updatedStep = await this.findOne(id);
      const historyDetails = this.buildUpdateHistoryDetails(
        previousStep,
        updatedStep,
        dto,
      );
      await this.createHistoryEntry({
        userName: actorName,
        action: 'Modification',
        entityId: id,
        details: historyDetails,
      });

      return updatedStep;
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

    try {
      await client.query('BEGIN');

      const stepResult = await client.query<{ name: string }>(
        `SELECT name FROM step WHERE id = $1`,
        [id],
      );
      if (stepResult.rows.length === 0) {
        throw new NotFoundException(`Step ${id} non trouve`);
      }

      const stepName = stepResult.rows[0].name;

      await client.query(`DELETE FROM step_param WHERE step_id = $1`, [id]);
      const result = await client.query<{ id: number }>(
        `DELETE FROM step WHERE id = $1 RETURNING id`,
        [id],
      );

      if (result.rowCount === 0) {
        throw new NotFoundException(`Step ${id} non trouve`);
      }

      await client.query('COMMIT');

      await this.createHistoryEntry({
        userName: actorName,
        action: 'Suppression',
        entityId: id,
        details: `Suppression du step: ${stepName}`,
      });

      return { message: 'Step supprime' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
