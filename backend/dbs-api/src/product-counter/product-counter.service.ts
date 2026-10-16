import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CreateProductCounterDto } from './dto/create-product-counter.dto';
import { UpdateProductCounterDto } from './dto/update-product-counter.dto';

@Injectable()
export class ProductCounterService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll() {
    const result = await this.pool.query(
      `SELECT product_id, count, updated_at
       FROM product_counter
       ORDER BY product_id`,
    );

    return result.rows;
  }

  async findOne(productId: number) {
    const result = await this.pool.query(
      `SELECT product_id, count, updated_at
       FROM product_counter
       WHERE product_id = $1`,
      [productId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Compteur produit ${productId} non trouve`);
    }

    return result.rows[0];
  }

  async create(dto: CreateProductCounterDto) {
    const result = await this.pool.query(
      `INSERT INTO product_counter (product_id, count, updated_at)
       VALUES ($1, COALESCE($2, 0), NOW())
       RETURNING product_id, count, updated_at`,
      [dto.product_id, dto.count],
    );

    return result.rows[0];
  }

  async update(productId: number, dto: UpdateProductCounterDto) {
    const result = await this.pool.query(
      `UPDATE product_counter
       SET count = COALESCE($1, count),
           updated_at = NOW()
       WHERE product_id = $2
       RETURNING product_id, count, updated_at`,
      [dto.count, productId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Compteur produit ${productId} non trouve`);
    }

    return result.rows[0];
  }

  async remove(productId: number): Promise<{ message: string }> {
    const result = await this.pool.query(
      `DELETE FROM product_counter
       WHERE product_id = $1
       RETURNING product_id`,
      [productId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Compteur produit ${productId} non trouve`);
    }

    return { message: `Compteur produit ${productId} supprime` };
  }
}
