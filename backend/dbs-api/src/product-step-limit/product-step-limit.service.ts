import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CreateProductStepLimitDto } from './dto/create-product-step-limit.dto';
import { UpdateProductStepLimitDto } from './dto/update-product-step-limit.dto';

@Injectable()
export class ProductStepLimitService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private selectQuery(where = '') {
    return `SELECT psl.id, psl.component_instance_id,
              ci.product_id, p.name AS product_name,
              ci.step_id, st.name AS step_name,
              ci.instance_index, ci.instance_name, ci.physical_ref,
              psl.step_limit_id, sl.limit_name, sl.limit_type,
              sl.comparison_type, sl.limit_value AS default_limit_value,
              sl.limit_min AS default_limit_min, sl.limit_max AS default_limit_max,
              sl.unit, psl.limit_value, psl.limit_min, psl.limit_max,
              psl.is_active, psl.execution_mode_id, em.name AS mode_name,
              psl.created_at, psl.updated_at
       FROM product_step_limit psl
       LEFT JOIN component_instance ci ON ci.id = psl.component_instance_id
       LEFT JOIN product p ON p.product_id = ci.product_id
       LEFT JOIN step st ON st.id = ci.step_id
       LEFT JOIN step_limit sl ON sl.id = psl.step_limit_id
       LEFT JOIN execution_mode em ON em.id = psl.execution_mode_id
       ${where}`;
  }

  async findAll() {
    const result = await this.pool.query(
      `${this.selectQuery()} ORDER BY ci.product_id, ci.step_id, ci.instance_index, sl.id, psl.execution_mode_id NULLS FIRST`,
    );
    return result.rows;
  }

  async findOne(id: number) {
    const result = await this.pool.query(this.selectQuery('WHERE psl.id = $1'), [
      id,
    ]);

    if (result.rows.length === 0) {
      throw new NotFoundException(`Limite produit-step ${id} non trouvee`);
    }

    return result.rows[0];
  }

  async create(dto: CreateProductStepLimitDto) {
    const result = await this.pool.query(
      `INSERT INTO product_step_limit (
         component_instance_id, step_limit_id, limit_value,
         limit_min, limit_max, is_active, execution_mode_id,
         created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, TRUE), $7, NOW(), NOW())
       RETURNING id`,
      [
        dto.component_instance_id,
        dto.step_limit_id,
        dto.limit_value ?? null,
        dto.limit_min ?? null,
        dto.limit_max ?? null,
        dto.is_active ?? null,
        dto.execution_mode_id ?? null,
      ],
    );

    return this.findOne(result.rows[0].id);
  }

  async update(id: number, dto: UpdateProductStepLimitDto) {
    const result = await this.pool.query(
      `UPDATE product_step_limit
       SET component_instance_id = COALESCE($1, component_instance_id),
           step_limit_id = COALESCE($2, step_limit_id),
           limit_value = $3,
           limit_min = $4,
           limit_max = $5,
           is_active = COALESCE($6, is_active),
           execution_mode_id = $7,
           updated_at = NOW()
       WHERE id = $8
       RETURNING id`,
      [
        dto.component_instance_id,
        dto.step_limit_id,
        dto.limit_value ?? null,
        dto.limit_min ?? null,
        dto.limit_max ?? null,
        dto.is_active,
        dto.execution_mode_id ?? null,
        id,
      ],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Limite produit-step ${id} non trouvee`);
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const result = await this.pool.query(
      `DELETE FROM product_step_limit WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Limite produit-step ${id} non trouvee`);
    }

    return { message: `Limite produit-step ${id} supprimee` };
  }
}
