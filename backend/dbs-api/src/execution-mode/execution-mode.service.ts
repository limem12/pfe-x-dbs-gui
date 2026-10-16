import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CreateExecutionModeDto } from './dto/create-execution-mode.dto';
import { UpdateExecutionModeDto } from './dto/update-execution-mode.dto';

@Injectable()
export class ExecutionModeService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll() {
    const result = await this.pool.query(
      `SELECT id, name, description, created_at
       FROM execution_mode
       ORDER BY id`,
    );

    return result.rows;
  }

  async findOne(id: number) {
    const result = await this.pool.query(
      `SELECT id, name, description, created_at
       FROM execution_mode
       WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Mode d'execution ${id} non trouve`);
    }

    return result.rows[0];
  }

  async create(dto: CreateExecutionModeDto) {
    const result = await this.pool.query(
      `INSERT INTO execution_mode (name, description, created_at)
       VALUES ($1, $2, NOW())
       RETURNING id, name, description, created_at`,
      [dto.name, dto.description ?? null],
    );

    return result.rows[0];
  }

  async update(id: number, dto: UpdateExecutionModeDto) {
    const result = await this.pool.query(
      `UPDATE execution_mode
       SET name = COALESCE($1, name),
           description = COALESCE($2, description)
       WHERE id = $3
       RETURNING id, name, description, created_at`,
      [dto.name, dto.description, id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Mode d'execution ${id} non trouve`);
    }

    return result.rows[0];
  }

  async remove(id: number): Promise<{ message: string }> {
    const result = await this.pool.query(
      `DELETE FROM execution_mode
       WHERE id = $1
       RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Mode d'execution ${id} non trouve`);
    }

    return { message: `Mode d'execution ${id} supprime` };
  }
}
