import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CreateProductStepParamDto } from './dto/create-product-step-param.dto';
import { UpdateProductStepParamDto } from './dto/update-product-step-param.dto';

@Injectable()
export class ProductStepParamService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll() {
    const result = await this.pool.query(
      `SELECT psp.id, psp.product_id, p.name AS product_name,
              psp.step_param_id, sp.param_name, sp.param_type,
              sp.step_id, st.name AS step_name,
              psp.value, psp.created_at
       FROM product_step_param psp
       LEFT JOIN product p ON psp.product_id = p.product_id
       LEFT JOIN step_param sp ON psp.step_param_id = sp.id
       LEFT JOIN step st ON sp.step_id = st.id
       ORDER BY psp.product_id, sp.step_id, psp.id`,
    );

    return result.rows;
  }

  async findOne(id: number) {
    const result = await this.pool.query(
      `SELECT psp.id, psp.product_id, p.name AS product_name,
              psp.step_param_id, sp.param_name, sp.param_type,
              sp.step_id, st.name AS step_name,
              psp.value, psp.created_at
       FROM product_step_param psp
       LEFT JOIN product p ON psp.product_id = p.product_id
       LEFT JOIN step_param sp ON psp.step_param_id = sp.id
       LEFT JOIN step st ON sp.step_id = st.id
       WHERE psp.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Parametre produit-step ${id} non trouve`);
    }

    return result.rows[0];
  }

  async create(dto: CreateProductStepParamDto) {
    const result = await this.pool.query(
      `INSERT INTO product_step_param (product_id, step_param_id, value, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, product_id, step_param_id, value, created_at`,
      [dto.product_id, dto.step_param_id, dto.value],
    );

    return result.rows[0];
  }

  async update(id: number, dto: UpdateProductStepParamDto) {
    const result = await this.pool.query(
      `UPDATE product_step_param
       SET product_id = COALESCE($1, product_id),
           step_param_id = COALESCE($2, step_param_id),
           value = COALESCE($3, value)
       WHERE id = $4
       RETURNING id, product_id, step_param_id, value, created_at`,
      [dto.product_id, dto.step_param_id, dto.value, id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Parametre produit-step ${id} non trouve`);
    }

    return result.rows[0];
  }

  async remove(id: number): Promise<{ message: string }> {
    const result = await this.pool.query(
      `DELETE FROM product_step_param
       WHERE id = $1
       RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Parametre produit-step ${id} non trouve`);
    }

    return { message: `Parametre produit-step ${id} supprime` };
  }
}
