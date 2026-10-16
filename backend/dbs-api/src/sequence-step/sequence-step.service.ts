import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CreateSequenceStepDto } from './dto/create-sequence-step.dto';
import { UpdateSequenceStepDto } from './dto/update-sequence-step.dto';

@Injectable()
export class SequenceStepService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll() {
    const result = await this.pool.query(
      `SELECT ss.id, ss.sequence_id, seq.name AS sequence_name,
              ss.step_id, st.name AS step_name, ss.order_index, ss.created_at
       FROM sequence_step ss
       LEFT JOIN "sequence" seq ON ss.sequence_id = seq.id
       LEFT JOIN step st ON ss.step_id = st.id
       ORDER BY ss.sequence_id, ss.order_index, ss.id`,
    );

    return result.rows;
  }

  async findOne(id: number) {
    const result = await this.pool.query(
      `SELECT ss.id, ss.sequence_id, seq.name AS sequence_name,
              ss.step_id, st.name AS step_name, ss.order_index, ss.created_at
       FROM sequence_step ss
       LEFT JOIN "sequence" seq ON ss.sequence_id = seq.id
       LEFT JOIN step st ON ss.step_id = st.id
       WHERE ss.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(
        `Association sequence-step ${id} non trouvee`,
      );
    }

    return result.rows[0];
  }

  async create(dto: CreateSequenceStepDto) {
    const result = await this.pool.query(
      `INSERT INTO sequence_step (sequence_id, step_id, order_index, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, sequence_id, step_id, order_index, created_at`,
      [dto.sequence_id, dto.step_id, dto.order_index],
    );

    return result.rows[0];
  }

  async update(id: number, dto: UpdateSequenceStepDto) {
    const result = await this.pool.query(
      `UPDATE sequence_step
       SET sequence_id = COALESCE($1, sequence_id),
           step_id = COALESCE($2, step_id),
           order_index = COALESCE($3, order_index)
       WHERE id = $4
       RETURNING id, sequence_id, step_id, order_index, created_at`,
      [dto.sequence_id, dto.step_id, dto.order_index, id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(
        `Association sequence-step ${id} non trouvee`,
      );
    }

    return result.rows[0];
  }

  async remove(id: number): Promise<{ message: string }> {
    const result = await this.pool.query(
      `DELETE FROM sequence_step
       WHERE id = $1
       RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(
        `Association sequence-step ${id} non trouvee`,
      );
    }

    return { message: `Association sequence-step ${id} supprimee` };
  }
}
