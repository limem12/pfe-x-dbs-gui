import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CreateStepStatusDto } from './dto/create-step-status.dto';
import { UpdateStepStatusDto } from './dto/update-step-status.dto';

@Injectable()
export class StepStatusService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll() {
    const result = await this.pool.query(
      `SELECT status_id, product_id, test_id, parameter_id, vtype, dvalue, ivalue, svalue, created_at
       FROM step_status
       ORDER BY status_id`,
    );

    return result.rows;
  }

  async findOne(statusId: number) {
    const result = await this.pool.query(
      `SELECT status_id, product_id, test_id, parameter_id, vtype, dvalue, ivalue, svalue, created_at
       FROM step_status
       WHERE status_id = $1`,
      [statusId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Step status ${statusId} non trouve`);
    }

    return result.rows[0];
  }

  async create(dto: CreateStepStatusDto) {
    const result = await this.pool.query(
      `INSERT INTO step_status (product_id, test_id, parameter_id, vtype, dvalue, ivalue, svalue, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING status_id, product_id, test_id, parameter_id, vtype, dvalue, ivalue, svalue, created_at`,
      [
        dto.product_id,
        dto.test_id,
        dto.parameter_id,
        dto.vtype,
        dto.dvalue,
        dto.ivalue,
        dto.svalue,
      ],
    );

    return result.rows[0];
  }

  async update(statusId: number, dto: UpdateStepStatusDto) {
    const result = await this.pool.query(
      `UPDATE step_status
       SET product_id = COALESCE($1, product_id),
           test_id = COALESCE($2, test_id),
           parameter_id = COALESCE($3, parameter_id),
           vtype = COALESCE($4, vtype),
           dvalue = COALESCE($5, dvalue),
           ivalue = COALESCE($6, ivalue),
           svalue = COALESCE($7, svalue)
       WHERE status_id = $8
       RETURNING status_id, product_id, test_id, parameter_id, vtype, dvalue, ivalue, svalue, created_at`,
      [
        dto.product_id,
        dto.test_id,
        dto.parameter_id,
        dto.vtype,
        dto.dvalue,
        dto.ivalue,
        dto.svalue,
        statusId,
      ],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Step status ${statusId} non trouve`);
    }

    return result.rows[0];
  }

  async remove(statusId: number): Promise<{ message: string }> {
    const result = await this.pool.query(
      `DELETE FROM step_status
       WHERE status_id = $1
       RETURNING status_id`,
      [statusId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Step status ${statusId} non trouve`);
    }

    return { message: `Step status ${statusId} supprime` };
  }
}
