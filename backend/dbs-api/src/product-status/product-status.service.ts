import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CreateProductStatusDto } from './dto/create-product-status.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';

@Injectable()
export class ProductStatusService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findAll() {
    const result = await this.pool.query(
      `SELECT status_id, product_id, barcode, duration, failed, mode_id, created_at
       FROM product_status
       ORDER BY status_id`,
    );

    return result.rows;
  }

  async findOne(statusId: number) {
    const result = await this.pool.query(
      `SELECT status_id, product_id, barcode, duration, failed, mode_id, created_at
       FROM product_status
       WHERE status_id = $1`,
      [statusId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Statut produit ${statusId} non trouve`);
    }

    return result.rows[0];
  }

  async create(dto: CreateProductStatusDto) {
    const result = await this.pool.query(
      `INSERT INTO product_status (product_id, barcode, duration, failed, mode_id, created_at)
       VALUES ($1, $2, $3, COALESCE($4, FALSE), $5, NOW())
       RETURNING status_id, product_id, barcode, duration, failed, mode_id, created_at`,
      [dto.product_id, dto.barcode, dto.duration, dto.failed, dto.mode_id],
    );

    return result.rows[0];
  }

  async update(statusId: number, dto: UpdateProductStatusDto) {
    const result = await this.pool.query(
      `UPDATE product_status
       SET product_id = COALESCE($1, product_id),
           barcode = COALESCE($2, barcode),
           duration = COALESCE($3, duration),
           failed = COALESCE($4, failed),
           mode_id = COALESCE($5, mode_id)
       WHERE status_id = $6
       RETURNING status_id, product_id, barcode, duration, failed, mode_id, created_at`,
      [
        dto.product_id,
        dto.barcode,
        dto.duration,
        dto.failed,
        dto.mode_id,
        statusId,
      ],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Statut produit ${statusId} non trouve`);
    }

    return result.rows[0];
  }

  async remove(statusId: number): Promise<{ message: string }> {
    const result = await this.pool.query(
      `DELETE FROM product_status
       WHERE status_id = $1
       RETURNING status_id`,
      [statusId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Statut produit ${statusId} non trouve`);
    }

    return { message: `Statut produit ${statusId} supprime` };
  }
}
