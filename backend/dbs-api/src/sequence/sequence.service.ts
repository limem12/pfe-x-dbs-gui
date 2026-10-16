import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';

@Injectable()
export class SequenceService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll() {
    const result = await this.pool.query(
      `SELECT seq.id, seq.name, seq.description, seq.depends_on,
              parent.name AS depends_on_name, seq.created_at
       FROM "sequence" seq
       LEFT JOIN "sequence" parent ON seq.depends_on = parent.id
       ORDER BY seq.id`,
    );

    return result.rows;
  }

  async findOne(id: number) {
    const result = await this.pool.query(
      `SELECT seq.id, seq.name, seq.description, seq.depends_on,
              parent.name AS depends_on_name, seq.created_at
       FROM "sequence" seq
       LEFT JOIN "sequence" parent ON seq.depends_on = parent.id
       WHERE seq.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Sequence ${id} non trouvee`);
    }

    return result.rows[0];
  }

  async create(dto: CreateSequenceDto) {
    const result = await this.pool.query(
      `INSERT INTO "sequence" (name, description, depends_on, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, name, description, depends_on, created_at`,
      [dto.name, dto.description ?? null, dto.depends_on ?? null],
    );

    return result.rows[0];
  }

  async update(id: number, dto: UpdateSequenceDto) {
    const dependsOn = Object.prototype.hasOwnProperty.call(dto, 'depends_on')
      ? dto.depends_on
      : undefined;

    const result = await this.pool.query(
      `UPDATE "sequence"
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           depends_on = COALESCE($3, depends_on)
       WHERE id = $4
       RETURNING id, name, description, depends_on, created_at`,
      [dto.name, dto.description, dependsOn, id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Sequence ${id} non trouvee`);
    }

    return result.rows[0];
  }

  async remove(id: number): Promise<{ message: string }> {
    const result = await this.pool.query(
      `DELETE FROM "sequence"
       WHERE id = $1
       RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Sequence ${id} non trouvee`);
    }

    return { message: `Sequence ${id} supprimee` };
  }
}
