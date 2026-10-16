import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CreateStepParamDto } from './dto/create-step-param.dto';
import { UpdateStepParamDto } from './dto/update-step-param.dto';

@Injectable()
export class StepParamService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private async ensureNormalizedStep(stepId: number): Promise<void> {
    const normalized = await this.pool.query(
      `SELECT id FROM step WHERE id = $1`,
      [stepId],
    );

    if (normalized.rows.length > 0) {
      return;
    }

    throw new BadRequestException(`Step ${stepId} inexistant`);
  }

  async findAll() {
    const result = await this.pool.query(
      `SELECT sp.id, sp.step_id, s.name AS step_name, sp.param_name,
              sp.param_type, sp.default_value, sp.created_at
       FROM step_param sp
       LEFT JOIN step s ON sp.step_id = s.id
       ORDER BY sp.step_id, sp.id`,
    );

    return result.rows;
  }

  async findOne(id: number) {
    const result = await this.pool.query(
      `SELECT sp.id, sp.step_id, s.name AS step_name, sp.param_name,
              sp.param_type, sp.default_value, sp.created_at
       FROM step_param sp
       LEFT JOIN step s ON sp.step_id = s.id
       WHERE sp.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Parametre step ${id} non trouve`);
    }

    return result.rows[0];
  }

  async create(dto: CreateStepParamDto) {
    await this.ensureNormalizedStep(dto.step_id);

    const result = await this.pool.query(
      `INSERT INTO step_param (step_id, param_name, param_type, default_value, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, step_id, param_name, param_type, default_value, created_at`,
      [dto.step_id, dto.param_name, dto.param_type, dto.default_value ?? null],
    );

    return result.rows[0];
  }

  async update(id: number, dto: UpdateStepParamDto) {
    if (dto.step_id !== undefined) {
      await this.ensureNormalizedStep(dto.step_id);
    }

    const result = await this.pool.query(
      `UPDATE step_param
       SET step_id = COALESCE($1, step_id),
           param_name = COALESCE($2, param_name),
           param_type = COALESCE($3, param_type),
           default_value = COALESCE($4, default_value)
       WHERE id = $5
       RETURNING id, step_id, param_name, param_type, default_value, created_at`,
      [dto.step_id, dto.param_name, dto.param_type, dto.default_value, id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Parametre step ${id} non trouve`);
    }

    return result.rows[0];
  }

  async remove(id: number): Promise<{ message: string }> {
    const result = await this.pool.query(
      `DELETE FROM step_param
       WHERE id = $1
       RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Parametre step ${id} non trouve`);
    }

    return { message: `Parametre step ${id} supprime` };
  }
}
