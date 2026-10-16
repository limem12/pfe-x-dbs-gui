import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CreateStatusDto } from './dto/create-status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Injectable()
export class StatusService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll() {
    const result = await this.pool.query(
      `SELECT id, item_id, terminated, started_at, ended_at
       FROM status
       ORDER BY id`,
    );

    return result.rows;
  }

  async findOne(id: number) {
    const result = await this.pool.query(
      `SELECT id, item_id, terminated, started_at, ended_at
       FROM status
       WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Status ${id} non trouve`);
    }

    return result.rows[0];
  }

  async create(dto: CreateStatusDto) {
    const result = await this.pool.query(
      `INSERT INTO status (item_id, terminated, started_at, ended_at)
       VALUES ($1, COALESCE($2, FALSE), COALESCE($3, NOW()), $4)
       RETURNING id, item_id, terminated, started_at, ended_at`,
      [dto.item_id, dto.terminated, dto.started_at, dto.ended_at],
    );

    return result.rows[0];
  }

  async update(id: number, dto: UpdateStatusDto) {
    const result = await this.pool.query(
      `UPDATE status
       SET item_id = COALESCE($1, item_id),
           terminated = COALESCE($2, terminated),
           started_at = COALESCE($3, started_at),
           ended_at = COALESCE($4, ended_at)
       WHERE id = $5
       RETURNING id, item_id, terminated, started_at, ended_at`,
      [dto.item_id, dto.terminated, dto.started_at, dto.ended_at, id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Status ${id} non trouve`);
    }

    return result.rows[0];
  }

  async remove(id: number): Promise<{ message: string }> {
    const result = await this.pool.query(
      `DELETE FROM status
       WHERE id = $1
       RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Status ${id} non trouve`);
    }

    return { message: `Status ${id} supprime` };
  }
}
