import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { PG_POOL } from '../database/database.module';
import { HistoryService } from '../history/history.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './role.interface';

function isUniqueViolation(error: unknown): error is { code: string } {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: string }).code === '23505',
  );
}

type RoleRow = {
  id_role: string;
  description: string | null;
  rights: string[] | null;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class RolesService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly historyService: HistoryService,
  ) {}

  private normalizeRoleId(roleId: string): string {
    return roleId.trim().toUpperCase();
  }

  private mapRole(row: RoleRow): Role {
    return {
      id_role: row.id_role,
      description: row.description || '',
      rights: row.rights || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private async ensureRightsExist(
    client: Pool | PoolClient,
    rights: string[],
  ): Promise<void> {
    if (rights.length === 0) {
      return;
    }

    const normalizedRights = [...new Set(rights.map((right) => right.trim()))];
    const result = await client.query<{ id_right: string }>(
      `SELECT id_right FROM public.rights WHERE id_right = ANY($1::text[])`,
      [normalizedRights],
    );

    const existingRights = new Set(result.rows.map((row) => row.id_right));
    const missingRights = normalizedRights.filter(
      (right) => !existingRights.has(right),
    );

    if (missingRights.length > 0) {
      throw new BadRequestException(
        `Droits inconnus: ${missingRights.join(', ')}`,
      );
    }
  }

  private async createHistoryEntry(entry: {
    userName?: string;
    action: string;
    entityId: string;
    details: string;
  }) {
    try {
      await this.historyService.create({
        user_name: entry.userName || 'System',
        action: entry.action,
        entity: 'Role',
        entity_id: entry.entityId,
        details: entry.details,
      });
    } catch (error) {
      console.error('Error logging role history:', error);
    }
  }

  async findAll(): Promise<Role[]> {
    const result = await this.pool.query<RoleRow>(
      `SELECT id_role, description, rights, created_at, updated_at
       FROM public.role
       ORDER BY id_role`,
    );

    return result.rows.map((row) => this.mapRole(row));
  }

  async findOne(id_role: string): Promise<Role> {
    const normalizedId = this.normalizeRoleId(id_role);
    const result = await this.pool.query<RoleRow>(
      `SELECT id_role, description, rights, created_at, updated_at
       FROM public.role
       WHERE id_role = $1`,
      [normalizedId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Role ${normalizedId} introuvable`);
    }

    return this.mapRole(result.rows[0]);
  }

  async create(dto: CreateRoleDto, actorUsername?: string): Promise<Role> {
    const client = await this.pool.connect();
    const idRole = this.normalizeRoleId(dto.id_role);
    const rights = [
      ...new Set((dto.rights || []).map((right) => right.trim())),
    ];

    try {
      await client.query('BEGIN');
      await this.ensureRightsExist(client, rights);

      await client.query(
        `INSERT INTO public.role (id_role, description, rights)
         VALUES ($1, $2, $3)`,
        [idRole, dto.description.trim(), rights],
      );

      await client.query('COMMIT');

      await this.createHistoryEntry({
        userName: actorUsername,
        action: 'Creation',
        entityId: idRole,
        details: `Creation du role: ${idRole}`,
      });

      return this.findOne(idRole);
    } catch (error) {
      await client.query('ROLLBACK');

      if (isUniqueViolation(error)) {
        throw new ConflictException(`Le role ${idRole} existe deja`);
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async update(
    id_role: string,
    dto: UpdateRoleDto,
    actorUsername?: string,
  ): Promise<Role> {
    const client = await this.pool.connect();
    const normalizedId = this.normalizeRoleId(id_role);

    try {
      await client.query('BEGIN');

      const existing = await client.query(
        `SELECT id_role FROM public.role WHERE id_role = $1 FOR UPDATE`,
        [normalizedId],
      );

      if (existing.rows.length === 0) {
        throw new NotFoundException(`Role ${normalizedId} introuvable`);
      }

      const updates: string[] = [];
      const values: Array<string | string[]> = [];
      let parameterIndex = 1;

      if (dto.description !== undefined) {
        updates.push(`description = $${parameterIndex++}`);
        values.push(dto.description.trim());
      }

      if (dto.rights !== undefined) {
        const rights = [...new Set(dto.rights.map((right) => right.trim()))];
        await this.ensureRightsExist(client, rights);
        updates.push(`rights = $${parameterIndex++}`);
        values.push(rights);
      }

      if (updates.length > 0) {
        values.push(normalizedId);

        await client.query(
          `UPDATE public.role
           SET ${updates.join(', ')}, updated_at = NOW()
           WHERE id_role = $${parameterIndex}`,
          values,
        );
      }

      await client.query('COMMIT');

      await this.createHistoryEntry({
        userName: actorUsername,
        action: 'Modification',
        entityId: normalizedId,
        details: `Modification du role: ${normalizedId}`,
      });

      return this.findOne(normalizedId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async remove(
    id_role: string,
    actorUsername?: string,
  ): Promise<{ message: string }> {
    const client = await this.pool.connect();
    const normalizedId = this.normalizeRoleId(id_role);

    try {
      await client.query('BEGIN');

      const existing = await client.query(
        `SELECT id_role FROM public.role WHERE id_role = $1 FOR UPDATE`,
        [normalizedId],
      );

      if (existing.rows.length === 0) {
        throw new NotFoundException(`Role ${normalizedId} introuvable`);
      }

      const linkedUsers = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM public."user" WHERE role = $1`,
        [normalizedId],
      );

      if (Number(linkedUsers.rows[0]?.count || '0') > 0) {
        throw new ConflictException(
          `Le role ${normalizedId} est encore attribue a un ou plusieurs utilisateurs`,
        );
      }

      await client.query(`DELETE FROM public.role WHERE id_role = $1`, [
        normalizedId,
      ]);

      await client.query('COMMIT');

      await this.createHistoryEntry({
        userName: actorUsername,
        action: 'Suppression',
        entityId: normalizedId,
        details: `Suppression du role: ${normalizedId}`,
      });

      return { message: 'Role supprime' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
