import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CreateProductExecutionConfigDto } from './dto/create-product-execution-config.dto';
import { UpdateProductExecutionConfigDto } from './dto/update-product-execution-config.dto';

@Injectable()
export class ProductExecutionConfigService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private validateTarget(sequenceId?: number | null, stepId?: number | null) {
    const hasSequence = sequenceId !== undefined && sequenceId !== null;
    const hasStep = stepId !== undefined && stepId !== null;

    if (hasSequence === hasStep) {
      throw new BadRequestException(
        'Fournir exactement un target: sequence_id ou step_id',
      );
    }
  }

  async findAll() {
    const result = await this.pool.query(
      `SELECT pec.id,
              pec.product_id,
              p.name AS product_name,
              pec.execution_mode_id,
              em.name AS mode_name,
              pec.sequence_id,
              seq.name AS sequence_name,
              pec.step_id,
              st.name AS step_name,
              pec.is_active,
              pec.ignore_fail,
              pec.retry_on_fail,
              pec.repeat_count,
              pec.retry_delay_ms,
              pec.created_at
       FROM product_execution_config pec
       LEFT JOIN product p ON pec.product_id = p.product_id
       LEFT JOIN execution_mode em ON pec.execution_mode_id = em.id
       LEFT JOIN "sequence" seq ON pec.sequence_id = seq.id
       LEFT JOIN step st ON pec.step_id = st.id
       ORDER BY pec.product_id, pec.execution_mode_id, pec.id`,
    );

    return result.rows;
  }

  async findOne(id: number) {
    const result = await this.pool.query(
      `SELECT pec.id,
              pec.product_id,
              p.name AS product_name,
              pec.execution_mode_id,
              em.name AS mode_name,
              pec.sequence_id,
              seq.name AS sequence_name,
              pec.step_id,
              st.name AS step_name,
              pec.is_active,
              pec.ignore_fail,
              pec.retry_on_fail,
              pec.repeat_count,
              pec.retry_delay_ms,
              pec.created_at
       FROM product_execution_config pec
       LEFT JOIN product p ON pec.product_id = p.product_id
       LEFT JOIN execution_mode em ON pec.execution_mode_id = em.id
       LEFT JOIN "sequence" seq ON pec.sequence_id = seq.id
       LEFT JOIN step st ON pec.step_id = st.id
       WHERE pec.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Configuration execution ${id} non trouvee`);
    }

    return result.rows[0];
  }

  async create(dto: CreateProductExecutionConfigDto) {
    this.validateTarget(dto.sequence_id, dto.step_id);

    const result = await this.pool.query(
      `INSERT INTO product_execution_config (
         product_id,
         execution_mode_id,
         sequence_id,
         step_id,
         is_active,
         ignore_fail,
         retry_on_fail,
         repeat_count,
         retry_delay_ms,
         created_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [
        dto.product_id,
        dto.execution_mode_id,
        dto.sequence_id ?? null,
        dto.step_id ?? null,
        dto.is_active ?? true,
        dto.ignore_fail ?? false,
        dto.retry_on_fail ?? 0,
        dto.repeat_count ?? 1,
        dto.retry_delay_ms ?? 0,
      ],
    );

    return result.rows[0];
  }

  async update(id: number, dto: UpdateProductExecutionConfigDto) {
    const current = await this.pool.query(
      `SELECT product_id, execution_mode_id, sequence_id, step_id
       FROM product_execution_config
       WHERE id = $1`,
      [id],
    );

    if (current.rows.length === 0) {
      throw new NotFoundException(`Configuration execution ${id} non trouvee`);
    }

    const targetSequence =
      dto.sequence_id !== undefined
        ? dto.sequence_id
        : current.rows[0].sequence_id;
    const targetStep =
      dto.step_id !== undefined ? dto.step_id : current.rows[0].step_id;
    this.validateTarget(targetSequence, targetStep);

    const result = await this.pool.query(
      `UPDATE product_execution_config
       SET product_id = COALESCE($1, product_id),
           execution_mode_id = COALESCE($2, execution_mode_id),
           sequence_id = $3,
           step_id = $4,
           is_active = COALESCE($5, is_active),
           ignore_fail = COALESCE($6, ignore_fail),
           retry_on_fail = COALESCE($7, retry_on_fail),
           repeat_count = COALESCE($8, repeat_count),
           retry_delay_ms = COALESCE($9, retry_delay_ms)
       WHERE id = $10
       RETURNING *`,
      [
        dto.product_id,
        dto.execution_mode_id,
        targetSequence,
        targetStep,
        dto.is_active,
        dto.ignore_fail,
        dto.retry_on_fail,
        dto.repeat_count,
        dto.retry_delay_ms,
        id,
      ],
    );

    return result.rows[0];
  }

  async remove(id: number): Promise<{ message: string }> {
    const result = await this.pool.query(
      `DELETE FROM product_execution_config
       WHERE id = $1
       RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Configuration execution ${id} non trouvee`);
    }

    return { message: `Configuration execution ${id} supprimee` };
  }
}
