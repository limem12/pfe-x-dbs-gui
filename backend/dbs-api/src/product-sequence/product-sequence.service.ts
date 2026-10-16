import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CreateProductSequenceDto } from './dto/create-product-sequence.dto';
import { UpdateProductSequenceDto } from './dto/update-product-sequence.dto';

@Injectable()
export class ProductSequenceService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll() {
    const result = await this.pool.query(
      `SELECT ps.id, ps.product_id, p.name AS product_name,
              ps.sequence_id, seq.name AS sequence_name,
              ps.order_index, ps.created_at
       FROM product_sequence ps
       LEFT JOIN product p ON ps.product_id = p.product_id
       LEFT JOIN "sequence" seq ON ps.sequence_id = seq.id
       ORDER BY ps.product_id, ps.order_index, ps.id`,
    );

    return result.rows;
  }

  async findOne(id: number) {
    const result = await this.pool.query(
      `SELECT ps.id, ps.product_id, p.name AS product_name,
              ps.sequence_id, seq.name AS sequence_name,
              ps.order_index, ps.created_at
       FROM product_sequence ps
       LEFT JOIN product p ON ps.product_id = p.product_id
       LEFT JOIN "sequence" seq ON ps.sequence_id = seq.id
       WHERE ps.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(
        `Association produit-sequence ${id} non trouvee`,
      );
    }

    return result.rows[0];
  }

  async create(dto: CreateProductSequenceDto) {
    const result = await this.pool.query(
      `INSERT INTO product_sequence (product_id, sequence_id, order_index, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, product_id, sequence_id, order_index, created_at`,
      [dto.product_id, dto.sequence_id, dto.order_index],
    );

    return result.rows[0];
  }

  async update(id: number, dto: UpdateProductSequenceDto) {
    const result = await this.pool.query(
      `UPDATE product_sequence
       SET product_id = COALESCE($1, product_id),
           sequence_id = COALESCE($2, sequence_id),
           order_index = COALESCE($3, order_index)
       WHERE id = $4
       RETURNING id, product_id, sequence_id, order_index, created_at`,
      [dto.product_id, dto.sequence_id, dto.order_index, id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(
        `Association produit-sequence ${id} non trouvee`,
      );
    }

    return result.rows[0];
  }

  async remove(id: number): Promise<{ message: string }> {
    const result = await this.pool.query(
      `DELETE FROM product_sequence
       WHERE id = $1
       RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(
        `Association produit-sequence ${id} non trouvee`,
      );
    }

    return { message: `Association produit-sequence ${id} supprimee` };
  }
}
