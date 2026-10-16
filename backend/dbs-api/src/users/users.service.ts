import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Pool, PoolClient } from 'pg';
import {
  describeFieldChange,
  formatHistoryValue,
  hasHistoryValueChanged,
} from '../common/history-details.util';
import { PG_POOL } from '../database/database.module';
import { HistoryService } from '../history/history.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.interface';

const BCRYPT_SALT_ROUNDS = 10;

function normalizeUsernameInput(username: string): string {
  return username.trim();
}

function isUniqueViolation(error: unknown): error is { code: string } {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: string }).code === '23505',
  );
}

type UserRow = {
  username: string;
  role: string;
  status: 'ENABLED' | 'DISABLED';
  rights: string[] | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  avatar?: string | null;
  lastLogin?: string | null;
  createdAt: string;
};

type UserSchemaMetadata = {
  hasAvatar: boolean;
  hasStatus: boolean;
  roleTableKey: 'id_role' | 'role_name';
  userRoleColumn: 'role' | 'role_name';
  adminIdDataType: string;
};

type UserForUpdateRow = {
  username: string;
  role: string;
  status: 'ENABLED' | 'DISABLED';
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  avatar?: string | null;
};

@Injectable()
export class UsersService {
  private userSchemaMetadataPromise?: Promise<UserSchemaMetadata>;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly historyService: HistoryService,
    @Optional() private readonly uploadsService?: UploadsService,
  ) {}

  private async getUserSchemaMetadata(): Promise<UserSchemaMetadata> {
    if (!this.userSchemaMetadataPromise) {
      this.userSchemaMetadataPromise = this.loadUserSchemaMetadata();
    }

    return this.userSchemaMetadataPromise;
  }

  private async loadUserSchemaMetadata(): Promise<UserSchemaMetadata> {
    const result = await this.pool.query<{
      column_name: string;
      data_type: string;
      table_name: string;
    }>(
      `SELECT table_name, column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])
         AND column_name = ANY($2::text[])`,
      [
        ['user', 'role'],
        ['role', 'role_name', 'status', 'avatar', 'id_role', 'admin_id'],
      ],
    );

    const userColumns = new Map(
      result.rows
        .filter((row) => row.table_name === 'user')
        .map((row) => [row.column_name, row.data_type]),
    );
    const roleColumns = new Set(
      result.rows
        .filter((row) => row.table_name === 'role')
        .map((row) => row.column_name),
    );

    return {
      hasAvatar: userColumns.has('avatar'),
      hasStatus: userColumns.has('status'),
      roleTableKey: roleColumns.has('id_role') ? 'id_role' : 'role_name',
      userRoleColumn: userColumns.has('role') ? 'role' : 'role_name',
      adminIdDataType: userColumns.get('admin_id') || 'integer',
    };
  }

  private buildUserSelectQuery(
    metadata: UserSchemaMetadata,
    suffix = '',
  ): string {
    const roleSelect =
      metadata.userRoleColumn === 'role' ? 'u.role' : 'u.role_name as role';
    const statusSelect = metadata.hasStatus
      ? 'u.status'
      : `CASE
           WHEN COALESCE(u.is_active, TRUE) THEN 'ENABLED'
           ELSE 'DISABLED'
         END as status`;
    const avatarSelect = metadata.hasAvatar
      ? 'u.avatar'
      : 'NULL::text as avatar';
    const rightsSelect = 'COALESCE(r.rights, ARRAY[]::text[]) as rights';

    return `SELECT
         u.username,
         ${roleSelect},
         ${statusSelect},
         u.email,
         u.phone,
         u.address,
         ${avatarSelect},
         u.last_login as "lastLogin",
         u.created_at as "createdAt",
         ${rightsSelect}
       FROM "user" u
       LEFT JOIN public.role r
         ON r.${metadata.roleTableKey} = u.${metadata.userRoleColumn}
       ${suffix}`;
  }

  private async resolveAdminIdValue(
    client: Pool | PoolClient,
    actorUsername: string | undefined,
    metadata: UserSchemaMetadata,
  ): Promise<string | number | null> {
    if (!actorUsername) {
      return null;
    }

    if (
      metadata.adminIdDataType !== 'integer' &&
      metadata.adminIdDataType !== 'bigint' &&
      metadata.adminIdDataType !== 'smallint'
    ) {
      return normalizeUsernameInput(actorUsername);
    }

    const result = await client.query<{ user_id: number }>(
      `SELECT user_id
       FROM "user"
       WHERE LOWER(username) = LOWER($1)
       LIMIT 1`,
      [actorUsername],
    );

    return result.rows[0]?.user_id ?? null;
  }

  private mapUser(row: UserRow): User {
    return {
      username: row.username,
      role: row.role,
      rights: row.rights || [],
      status: row.status,
      email: row.email || null,
      phone: row.phone || null,
      address: row.address || null,
      avatar: row.avatar || null,
      lastLogin: row.lastLogin || null,
      createdAt: row.createdAt,
    };
  }

  private buildUserForUpdateQuery(metadata: UserSchemaMetadata): string {
    const roleSelect =
      metadata.userRoleColumn === 'role' ? 'role' : 'role_name as role';
    const statusSelect = metadata.hasStatus
      ? 'status'
      : `CASE
           WHEN COALESCE(is_active, TRUE) THEN 'ENABLED'
           ELSE 'DISABLED'
         END as status`;
    const avatarSelect = metadata.hasAvatar ? 'avatar' : 'NULL::text as avatar';

    return `SELECT
        username,
        ${roleSelect},
        ${statusSelect},
        email,
        phone,
        address,
        ${avatarSelect}
      FROM "user"
      WHERE LOWER(username) = LOWER($1)
      FOR UPDATE`;
  }

  private buildUpdateHistoryDetails(
    previousUser: UserForUpdateRow,
    nextUsername: string,
    dto: UpdateUserDto,
    metadata: UserSchemaMetadata,
  ): string {
    const changes: string[] = [];

    if (dto.username !== undefined) {
      const change = describeFieldChange(
        'identifiant',
        previousUser.username,
        nextUsername,
      );
      if (change) changes.push(change);
    }

    if (dto.password) {
      changes.push('mot de passe modifie');
    }

    if (dto.role !== undefined) {
      const change = describeFieldChange('role', previousUser.role, dto.role);
      if (change) changes.push(change);
    }

    if (dto.email !== undefined) {
      const change = describeFieldChange(
        'email',
        previousUser.email,
        dto.email ?? null,
      );
      if (change) changes.push(change);
    }

    if (dto.phone !== undefined) {
      const change = describeFieldChange(
        'telephone',
        previousUser.phone,
        dto.phone ?? null,
      );
      if (change) changes.push(change);
    }

    if (dto.address !== undefined) {
      const change = describeFieldChange(
        'adresse',
        previousUser.address,
        dto.address ?? null,
      );
      if (change) changes.push(change);
    }

    if (
      metadata.hasAvatar &&
      dto.avatar !== undefined &&
      hasHistoryValueChanged(previousUser.avatar, dto.avatar)
    ) {
      const previousAvatar = formatHistoryValue(previousUser.avatar);
      const nextAvatar = formatHistoryValue(dto.avatar);

      if (!nextAvatar) {
        changes.push('avatar supprime');
      } else if (!previousAvatar) {
        changes.push('avatar ajoute');
      } else {
        changes.push('avatar modifie');
      }
    }

    if (dto.status !== undefined) {
      const change = describeFieldChange(
        'statut',
        previousUser.status,
        dto.status,
      );
      if (change) changes.push(change);
    }

    return changes.length > 0
      ? `Modification de l'utilisateur ${previousUser.username}: ${changes.join(', ')}`
      : `Modification de l'utilisateur: ${nextUsername}`;
  }

  private async ensureRoleExists(
    client: Pool | PoolClient,
    roleId: string,
  ): Promise<void> {
    const schemaMetadata = await this.getUserSchemaMetadata();
    const result = await client.query<{ role_id: string }>(
      `SELECT ${schemaMetadata.roleTableKey} as role_id
       FROM public.role
       WHERE ${schemaMetadata.roleTableKey} = $1`,
      [roleId],
    );

    if (result.rows.length === 0) {
      throw new BadRequestException(`Le role ${roleId} n'existe pas`);
    }
  }

  private async ensureUniqueUsername(
    client: Pool | PoolClient,
    username: string,
    excludedUsername?: string,
  ): Promise<void> {
    const normalizedUsername = normalizeUsernameInput(username);
    const result = await client.query<{ username: string }>(
      `SELECT username
       FROM "user"
       WHERE LOWER(username) = LOWER($1)
         AND ($2::varchar IS NULL OR LOWER(username) <> LOWER($2))`,
      [normalizedUsername, excludedUsername || null],
    );

    if (result.rows.length > 0) {
      throw new ConflictException(
        `L'utilisateur ${normalizedUsername} existe deja`,
      );
    }
  }

  private async createHistoryEntry(entry: {
    userName?: string;
    action: string;
    entityId: string;
    details: string;
  }): Promise<void> {
    try {
      await this.historyService.create({
        user_name: entry.userName || 'System',
        action: entry.action,
        entity: 'User',
        entity_id: entry.entityId,
        details: entry.details,
      });
    } catch (historyError) {
      console.error('Error logging user history:', historyError);
    }
  }

  private async cleanupAvatarIfNeeded(
    previousAvatar?: string | null,
    nextAvatar?: string | null,
  ): Promise<void> {
    if (
      !this.uploadsService ||
      !previousAvatar ||
      previousAvatar === nextAvatar ||
      !this.uploadsService.isManagedAvatarUrl(previousAvatar)
    ) {
      return;
    }

    await this.uploadsService.deleteAvatar(previousAvatar);
  }

  async findAll(): Promise<User[]> {
    const schemaMetadata = await this.getUserSchemaMetadata();
    const result = await this.pool.query<UserRow>(
      this.buildUserSelectQuery(schemaMetadata, 'ORDER BY u.username'),
    );

    return result.rows.map((row) => this.mapUser(row));
  }

  async findOne(username: string): Promise<User> {
    const normalizedUsername = normalizeUsernameInput(username);
    const schemaMetadata = await this.getUserSchemaMetadata();
    const result = await this.pool.query<UserRow>(
      this.buildUserSelectQuery(
        schemaMetadata,
        'WHERE LOWER(u.username) = LOWER($1)',
      ),
      [normalizedUsername],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Utilisateur ${username} non trouve`);
    }

    return this.mapUser(result.rows[0]);
  }

  async changePassword(
    username: string,
    currentPassword: string,
    newPassword: string,
    actorName?: string,
  ): Promise<{ message: string }> {
    if (!username) {
      throw new UnauthorizedException('Authentification requise');
    }

    const client = await this.pool.connect();

    try {
      const result = await client.query<{ password: string }>(
        `SELECT password FROM "user" WHERE LOWER(username) = LOWER($1)`,
        [username],
      );

      if (result.rows.length === 0 || !result.rows[0].password) {
        throw new UnauthorizedException('Utilisateur non trouve');
      }

      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        result.rows[0].password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Mot de passe actuel incorrect');
      }

      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

      await client.query(
        `UPDATE "user"
         SET password = $1, updated_at = NOW()
         WHERE LOWER(username) = LOWER($2)`,
        [hashedPassword, username],
      );

      await this.createHistoryEntry({
        userName: actorName,
        action: 'Modification',
        entityId: username,
        details: `Changement du mot de passe pour ${username}`,
      });

      return { message: 'Mot de passe modifie avec succes' };
    } finally {
      client.release();
    }
  }

  async resetPassword(
    username: string,
    newPassword: string,
    adminUsername: string,
  ): Promise<{ message: string }> {
    if (username.toLowerCase() === adminUsername.toLowerCase()) {
      throw new ForbiddenException(
        'Un administrateur ne peut pas reinitialiser son propre mot de passe depuis cette action',
      );
    }

    const client = await this.pool.connect();

    try {
      const existingUser = await client.query<{ username: string }>(
        `SELECT username FROM "user" WHERE LOWER(username) = LOWER($1)`,
        [username],
      );

      if (existingUser.rows.length === 0) {
        throw new NotFoundException(`Utilisateur ${username} non trouve`);
      }

      const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

      await client.query(
        `UPDATE "user"
         SET password = $1, updated_at = NOW()
         WHERE LOWER(username) = LOWER($2)`,
        [hashedPassword, username],
      );

      await this.createHistoryEntry({
        userName: adminUsername,
        action: 'Modification',
        entityId: existingUser.rows[0].username,
        details: `Reinitialisation du mot de passe pour ${existingUser.rows[0].username}`,
      });

      return { message: 'Mot de passe reinitialise avec succes' };
    } finally {
      client.release();
    }
  }

  async create(dto: CreateUserDto, actorUsername?: string): Promise<User> {
    const client = await this.pool.connect();
    const normalizedUsername = normalizeUsernameInput(dto.username);
    const schemaMetadata = await this.getUserSchemaMetadata();

    try {
      await client.query('BEGIN');

      const roleId =
        dto.role ||
        (schemaMetadata.roleTableKey === 'id_role' ? 'USER' : 'Utilisateur');
      await this.ensureUniqueUsername(client, normalizedUsername);
      await this.ensureRoleExists(client, roleId);

      const hashedPassword = await bcrypt.hash(
        dto.password,
        BCRYPT_SALT_ROUNDS,
      );
      const adminId = await this.resolveAdminIdValue(
        client,
        actorUsername,
        schemaMetadata,
      );
      const statusValue = schemaMetadata.hasStatus ? 'ENABLED' : true;

      await client.query(
        `INSERT INTO "user" (
           username,
           password,
           ${schemaMetadata.userRoleColumn},
           email,
           phone,
           address,
           ${schemaMetadata.hasAvatar ? 'avatar,' : ''}
           ${schemaMetadata.hasStatus ? 'status' : 'is_active'},
           admin_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, ${schemaMetadata.hasAvatar ? '$7, ' : ''}${schemaMetadata.hasAvatar ? '$8' : '$7'}, ${schemaMetadata.hasAvatar ? '$9' : '$8'})`,
        [
          normalizedUsername,
          hashedPassword,
          roleId,
          dto.email || null,
          dto.phone || null,
          dto.address || null,
          ...(schemaMetadata.hasAvatar ? [dto.avatar || null] : []),
          statusValue,
          adminId,
        ],
      );

      await client.query('COMMIT');

      await this.createHistoryEntry({
        userName: actorUsername,
        action: 'Creation',
        entityId: normalizedUsername,
        details: `Creation de l'utilisateur: ${normalizedUsername}`,
      });

      return this.findOne(normalizedUsername);
    } catch (error) {
      await client.query('ROLLBACK');

      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `L'utilisateur ${normalizedUsername} existe deja`,
        );
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async update(
    username: string,
    dto: UpdateUserDto,
    actorUsername?: string,
  ): Promise<User> {
    const client = await this.pool.connect();
    const normalizedUsername = normalizeUsernameInput(username);
    const schemaMetadata = await this.getUserSchemaMetadata();

    try {
      await client.query('BEGIN');

      const existingUser = await client.query<UserForUpdateRow>(
        this.buildUserForUpdateQuery(schemaMetadata),
        [normalizedUsername],
      );

      if (existingUser.rows.length === 0) {
        throw new NotFoundException(`Utilisateur ${username} non trouve`);
      }

      const nextUsername =
        dto.username !== undefined
          ? normalizeUsernameInput(dto.username)
          : existingUser.rows[0].username;

      if (dto.username !== undefined) {
        await this.ensureUniqueUsername(
          client,
          nextUsername,
          existingUser.rows[0].username,
        );
      }

      if (dto.role !== undefined) {
        await this.ensureRoleExists(client, dto.role);
      }

      const updates: string[] = [];
      const values: Array<string | boolean | null> = [];
      let parameterIndex = 1;

      if (dto.username !== undefined) {
        updates.push(`username = $${parameterIndex++}`);
        values.push(nextUsername);
      }

      if (dto.password) {
        const hashedPassword = await bcrypt.hash(
          dto.password,
          BCRYPT_SALT_ROUNDS,
        );
        updates.push(`password = $${parameterIndex++}`);
        values.push(hashedPassword);
      }

      if (dto.role !== undefined) {
        updates.push(`${schemaMetadata.userRoleColumn} = $${parameterIndex++}`);
        values.push(dto.role);
      }

      if (dto.email !== undefined) {
        updates.push(`email = $${parameterIndex++}`);
        values.push(dto.email ?? null);
      }

      if (dto.phone !== undefined) {
        updates.push(`phone = $${parameterIndex++}`);
        values.push(dto.phone ?? null);
      }

      if (dto.address !== undefined) {
        updates.push(`address = $${parameterIndex++}`);
        values.push(dto.address ?? null);
      }

      if (schemaMetadata.hasAvatar && dto.avatar !== undefined) {
        updates.push(`avatar = $${parameterIndex++}`);
        values.push(dto.avatar ?? null);
      }

      if (dto.status !== undefined) {
        updates.push(
          `${schemaMetadata.hasStatus ? 'status' : 'is_active'} = $${parameterIndex++}`,
        );
        values.push(
          schemaMetadata.hasStatus ? dto.status : dto.status === 'ENABLED',
        );
      }

      updates.push('updated_at = NOW()');
      values.push(normalizedUsername);

      await client.query(
        `UPDATE "user"
         SET ${updates.join(', ')}
         WHERE LOWER(username) = LOWER($${parameterIndex})`,
        values,
      );

      await client.query('COMMIT');
      await this.cleanupAvatarIfNeeded(
        existingUser.rows[0].avatar || null,
        dto.avatar !== undefined
          ? (dto.avatar ?? null)
          : existingUser.rows[0].avatar || null,
      );

      const historyDetails = this.buildUpdateHistoryDetails(
        existingUser.rows[0],
        nextUsername,
        dto,
        schemaMetadata,
      );
      await this.createHistoryEntry({
        userName: actorUsername,
        action: 'Modification',
        entityId: nextUsername,
        details: historyDetails,
      });

      return this.findOne(nextUsername);
    } catch (error) {
      await client.query('ROLLBACK');

      if (isUniqueViolation(error) && dto.username !== undefined) {
        throw new ConflictException(
          `L'utilisateur ${normalizeUsernameInput(dto.username)} existe deja`,
        );
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async remove(
    username: string,
    actorUsername?: string,
  ): Promise<{ message: string }> {
    const client = await this.pool.connect();
    const normalizedUsername = normalizeUsernameInput(username);
    const schemaMetadata = await this.getUserSchemaMetadata();

    try {
      await client.query('BEGIN');

      const existingUser = await client.query<{
        username: string;
        avatar?: string | null;
      }>(
        `SELECT username${schemaMetadata.hasAvatar ? ', avatar' : ', NULL::text as avatar'}
         FROM "user"
         WHERE LOWER(username) = LOWER($1)
         FOR UPDATE`,
        [normalizedUsername],
      );

      if (existingUser.rows.length === 0) {
        throw new NotFoundException(`Utilisateur ${username} non trouve`);
      }

      await client.query(
        `DELETE FROM "user" WHERE LOWER(username) = LOWER($1)`,
        [normalizedUsername],
      );

      await client.query('COMMIT');
      await this.cleanupAvatarIfNeeded(
        existingUser.rows[0].avatar || null,
        null,
      );

      await this.createHistoryEntry({
        userName: actorUsername,
        action: 'Suppression',
        entityId: existingUser.rows[0].username,
        details: `Suppression de l'utilisateur: ${existingUser.rows[0].username}`,
      });

      return { message: 'Utilisateur supprime' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
