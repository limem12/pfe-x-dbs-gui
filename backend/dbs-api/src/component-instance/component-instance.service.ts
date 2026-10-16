import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CreateComponentInstanceDto } from './dto/create-component-instance.dto';
import { UpdateComponentInstanceDto } from './dto/update-component-instance.dto';

@Injectable()
export class ComponentInstanceService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private selectQuery(where = '') {
    return `SELECT ci.id, ci.product_id, p.name AS product_name,
              ci.step_id, s.name AS step_name,
              ci.instance_index, ci.instance_name, ci.description,
              ci.physical_ref, ci.is_active, ci.created_at
       FROM component_instance ci
       LEFT JOIN product p ON p.product_id = ci.product_id
       LEFT JOIN step s ON s.id = ci.step_id
       ${where}`;
  }

  async findAll() {
    const result = await this.pool.query(
      `${this.selectQuery()} ORDER BY ci.product_id, ci.step_id, ci.instance_index, ci.id`,
    );
    return result.rows;
  }

  async findOne(id: number) {
    const result = await this.pool.query(this.selectQuery('WHERE ci.id = $1'), [
      id,
    ]);

    if (result.rows.length === 0) {
      throw new NotFoundException(`Instance composant ${id} non trouvee`);
    }

    return result.rows[0];
  }

  async create(dto: CreateComponentInstanceDto) {
    const result = await this.pool.query(
      `INSERT INTO component_instance (
         product_id, step_id, instance_index, instance_name,
         description, physical_ref, is_active, created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, TRUE), NOW())
       RETURNING id`,
      [
        dto.product_id,
        dto.step_id,
        dto.instance_index,
        dto.instance_name,
        dto.description ?? null,
        dto.physical_ref ?? null,
        dto.is_active ?? null,
      ],
    );

    return this.findOne(result.rows[0].id);
  }

  async update(id: number, dto: UpdateComponentInstanceDto) {
    const result = await this.pool.query(
      `UPDATE component_instance
       SET product_id = COALESCE($1, product_id),
           step_id = COALESCE($2, step_id),
           instance_index = COALESCE($3, instance_index),
           instance_name = COALESCE($4, instance_name),
           description = COALESCE($5, description),
           physical_ref = COALESCE($6, physical_ref),
           is_active = COALESCE($7, is_active)
       WHERE id = $8
       RETURNING id`,
      [
        dto.product_id,
        dto.step_id,
        dto.instance_index,
        dto.instance_name,
        dto.description,
        dto.physical_ref,
        dto.is_active,
        id,
      ],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Instance composant ${id} non trouvee`);
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const result = await this.pool.query(
      `DELETE FROM component_instance WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Instance composant ${id} non trouvee`);
    }

    return { message: `Instance composant ${id} supprimee` };
  }
}
