import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CreateStepLimitDto } from './dto/create-step-limit.dto';
import { UpdateStepLimitDto } from './dto/update-step-limit.dto';

@Injectable()
export class StepLimitService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll() {
    const result = await this.pool.query(
      `SELECT sl.id, sl.step_id, s.name AS step_name, sl.limit_name,
              sl.limit_type, sl.comparison_type, sl.limit_value,
              sl.limit_min, sl.limit_max, sl.unit, sl.description,
              sl.created_at, sl.modified_by, sl.modified_at
       FROM step_limit sl
       LEFT JOIN step s ON sl.step_id = s.id
       ORDER BY sl.step_id, sl.id`,
    );

    return result.rows;
  }

  async findOne(id: number) {
    const result = await this.pool.query(
      `SELECT sl.id, sl.step_id, s.name AS step_name, sl.limit_name,
              sl.limit_type, sl.comparison_type, sl.limit_value,
              sl.limit_min, sl.limit_max, sl.unit, sl.description,
              sl.created_at, sl.modified_by, sl.modified_at
       FROM step_limit sl
       LEFT JOIN step s ON sl.step_id = s.id
       WHERE sl.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Limite step ${id} non trouvee`);
    }

    return result.rows[0];
  }

  async create(dto: CreateStepLimitDto, actorUsername?: string) {
    const result = await this.pool.query(
      `INSERT INTO step_limit (
         step_id, limit_name, limit_type, comparison_type,
         limit_value, limit_min, limit_max, unit, created_at, modified_by, modified_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, NOW())
       RETURNING id, step_id, limit_name, limit_type, comparison_type,
                 limit_value, limit_min, limit_max, unit, created_at,
                 modified_by, modified_at`,
      [
        dto.step_id,
        dto.limit_name,
        dto.limit_type,
        dto.comparison_type,
        dto.limit_value ?? null,
        dto.limit_min ?? null,
        dto.limit_max ?? null,
        dto.unit ?? null,
        actorUsername || null,
      ],
    );

    return result.rows[0];
  }

  async update(id: number, dto: UpdateStepLimitDto, actorUsername?: string) {
    const result = await this.pool.query(
      `UPDATE step_limit
       SET step_id = COALESCE($1, step_id),
           limit_name = COALESCE($2, limit_name),
           limit_type = COALESCE($3, limit_type),
           comparison_type = COALESCE($4, comparison_type),
           limit_value = COALESCE($5, limit_value),
           limit_min = COALESCE($6, limit_min),
           limit_max = COALESCE($7, limit_max),
           unit = COALESCE($8, unit),
           modified_by = $9,
           modified_at = NOW()
       WHERE id = $10
       RETURNING id, step_id, limit_name, limit_type, comparison_type,
                 limit_value, limit_min, limit_max, unit, created_at,
                 modified_by, modified_at`,
      [
        dto.step_id,
        dto.limit_name,
        dto.limit_type,
        dto.comparison_type,
        dto.limit_value,
        dto.limit_min,
        dto.limit_max,
        dto.unit,
        actorUsername || null,
        id,
      ],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Limite step ${id} non trouvee`);
    }

    return result.rows[0];
  }

  async remove(id: number): Promise<{ message: string }> {
    const result = await this.pool.query(
      `DELETE FROM step_limit
       WHERE id = $1
       RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Limite step ${id} non trouvee`);
    }

    return { message: `Limite step ${id} supprimee` };
  }
}
