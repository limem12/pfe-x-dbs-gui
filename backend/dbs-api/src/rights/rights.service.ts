import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../database/database.module';
import { CreateRightDto, UpdateRightDto } from './dto';
import { Right } from './right.interface';

type RightRow = {
  id_right: string;
  description: string | null;
  module: string | null;
  created_at: string;
};

@Injectable()
export class RightsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private normalizeRightId(idRight: string): string {
    return idRight.trim().toUpperCase();
  }

  private mapRight(row: RightRow): Right {
    return {
      id_right: row.id_right,
      description: row.description || '',
      module: row.module || null,
      created_at: row.created_at,
    };
  }

  private normalizeDescription(description?: string): string | null {
    if (description === undefined) {
      return null;
    }

    const trimmedDescription = description.trim();
    return trimmedDescription.length > 0 ? trimmedDescription : null;
  }

  private normalizeModule(module?: string | null): string | null {
    if (module === undefined || module === null) {
      return null;
    }

    const normalizedModule = module.trim().toUpperCase();
    return normalizedModule.length > 0 ? normalizedModule : null;
  }

  private async assertRightExists(
    client: Pool | PoolClient,
    idRight: string,
  ): Promise<void> {
    const result = await client.query<{ id_right: string }>(
      `SELECT id_right
       FROM public.rights
       WHERE id_right = $1`,
      [idRight],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Droit ${idRight} introuvable`);
    }
  }

  async findAll(): Promise<Right[]> {
    const result = await this.pool.query<RightRow>(
      `SELECT id_right, description, module, created_at
       FROM public.rights
       ORDER BY module NULLS LAST, id_right`,
    );

    return result.rows.map((row) => this.mapRight(row));
  }

  async findOne(idRight: string): Promise<Right> {
    const normalizedId = this.normalizeRightId(idRight);
    const result = await this.pool.query<RightRow>(
      `SELECT id_right, description, module, created_at
       FROM public.rights
       WHERE id_right = $1`,
      [normalizedId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Droit ${normalizedId} introuvable`);
    }

    return this.mapRight(result.rows[0]);
  }

  async create(dto: CreateRightDto): Promise<Right> {
    const idRight = this.normalizeRightId(dto.id_right);

    try {
      const result = await this.pool.query<RightRow>(
        `INSERT INTO public.rights (id_right, description, module)
         VALUES ($1, $2, $3)
         RETURNING id_right, description, module, created_at`,
        [
          idRight,
          this.normalizeDescription(dto.description),
          this.normalizeModule(dto.module),
        ],
      );

      return this.mapRight(result.rows[0]);
    } catch (error: unknown) {
      const pgError = error as { code?: string };

      if (pgError.code === '23505') {
        throw new ConflictException(`Le droit ${idRight} existe deja`);
      }

      throw error;
    }
  }

  async update(idRight: string, dto: UpdateRightDto): Promise<Right> {
    const normalizedId = this.normalizeRightId(idRight);

    if (dto.description === undefined && dto.module === undefined) {
      return this.findOne(normalizedId);
    }

    const updates: string[] = [];
    const values: Array<string | null> = [];
    let parameterIndex = 1;

    if (dto.description !== undefined) {
      updates.push(`description = $${parameterIndex++}`);
      values.push(this.normalizeDescription(dto.description));
    }

    if (dto.module !== undefined) {
      updates.push(`module = $${parameterIndex++}`);
      values.push(this.normalizeModule(dto.module));
    }

    values.push(normalizedId);
    const result = await this.pool.query<RightRow>(
      `UPDATE public.rights
       SET ${updates.join(', ')}
       WHERE id_right = $${parameterIndex}
       RETURNING id_right, description, module, created_at`,
      values,
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Droit ${normalizedId} introuvable`);
    }

    return this.mapRight(result.rows[0]);
  }

  async remove(idRight: string): Promise<{ message: string }> {
    const client = await this.pool.connect();
    const normalizedId = this.normalizeRightId(idRight);

    try {
      await client.query('BEGIN');
      await this.assertRightExists(client, normalizedId);

      const linkedRoles = await client.query<{ id_role: string }>(
        `SELECT id_role
         FROM public.role
         WHERE $1 = ANY(rights)
         ORDER BY id_role`,
        [normalizedId],
      );

      if (linkedRoles.rows.length > 0) {
        throw new ConflictException(
          `Impossible de supprimer le droit ${normalizedId} car il est utilise par ${linkedRoles.rows.length} role(s)`,
        );
      }

      await client.query(`DELETE FROM public.rights WHERE id_right = $1`, [
        normalizedId,
      ]);

      await client.query('COMMIT');
      return { message: `Droit ${normalizedId} supprime` };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
