import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';

@Injectable()
export class StepService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private async assertValidDependency(
    stepId: number | null,
    dependsOn: number | null | undefined,
  ) {
    if (dependsOn === null || dependsOn === undefined) {
      return;
    }

    if (stepId !== null && dependsOn === stepId) {
      throw new BadRequestException('Un step ne peut pas dependre de lui-meme');
    }

    const dependency = await this.pool.query(`SELECT id FROM step WHERE id = $1`, [
      dependsOn,
    ]);

    if (dependency.rows.length === 0) {
      throw new BadRequestException(`Le step dependant ${dependsOn} est introuvable`);
    }

    if (stepId === null) {
      return;
    }

    const cycle = await this.pool.query(
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

  async findAll() {
    const result = await this.pool.query(
      `SELECT s.id, s.name, s.description, s.depends_on,
              d.name AS depends_on_name, s.created_at,
              NULLIF(NULLIF(s.created_by, ''), 'System') AS created_by,
              NULLIF(NULLIF(s.modified_by, ''), 'System') AS modified_by,
              s.modified_at
       FROM step s
       LEFT JOIN step d ON s.depends_on = d.id
       ORDER BY s.id`,
    );

    return result.rows;
  }

  async findOne(id: number) {
    const result = await this.pool.query(
      `SELECT s.id, s.name, s.description, s.depends_on,
              d.name AS depends_on_name, s.created_at,
              NULLIF(NULLIF(s.created_by, ''), 'System') AS created_by,
              NULLIF(NULLIF(s.modified_by, ''), 'System') AS modified_by,
              s.modified_at
       FROM step s
       LEFT JOIN step d ON s.depends_on = d.id
       WHERE s.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Step ${id} non trouve`);
    }

    return result.rows[0];
  }

  async create(dto: CreateStepDto, actorUsername?: string) {
    await this.assertValidDependency(null, dto.depends_on ?? null);

    const result = await this.pool.query(
      `INSERT INTO step (
         name, description, depends_on, created_by, modified_by,
         modified_at, created_at
       )
       VALUES ($1, $2, $3, $4, $4, NOW(), NOW())
       RETURNING id, name, description, depends_on, created_at,
                 created_by, modified_by, modified_at`,
      [
        dto.name,
        dto.description ?? null,
        dto.depends_on ?? null,
        actorUsername || null,
      ],
    );

    return result.rows[0];
  }

  async update(id: number, dto: UpdateStepDto, actorUsername?: string) {
    const dependsOn = Object.prototype.hasOwnProperty.call(dto, 'depends_on')
      ? dto.depends_on
      : undefined;
    await this.assertValidDependency(id, dependsOn);

    const result = await this.pool.query(
      `UPDATE step
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           depends_on = CASE WHEN $3::boolean THEN $4 ELSE depends_on END,
           modified_by = $5,
           modified_at = NOW()
       WHERE id = $6
       RETURNING id, name, description, depends_on, created_at,
                 created_by, modified_by, modified_at`,
      [
        dto.name,
        dto.description,
        Object.prototype.hasOwnProperty.call(dto, 'depends_on'),
        dependsOn ?? null,
        actorUsername || null,
        id,
      ],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Step ${id} non trouve`);
    }

    return result.rows[0];
  }

  async remove(id: number): Promise<{ message: string }> {
    const result = await this.pool.query(
      `DELETE FROM step
       WHERE id = $1
       RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Step ${id} non trouve`);
    }

    return { message: `Step ${id} supprime` };
  }
}
