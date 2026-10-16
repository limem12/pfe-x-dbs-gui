import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import type { AuthenticatedUser, LoginResponse } from './permissions';

type AuthenticatedUserRow = {
  username: string;
  password: string;
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

type AuthSchemaMetadata = {
  hasAvatar: boolean;
  hasStatus: boolean;
  roleTableKey: 'id_role' | 'role_name';
  userRoleColumn: 'role' | 'role_name';
};

@Injectable()
export class AuthService {
  private authSchemaMetadataPromise?: Promise<AuthSchemaMetadata>;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly jwtService: JwtService,
  ) {}

  private async getAuthSchemaMetadata(): Promise<AuthSchemaMetadata> {
    if (!this.authSchemaMetadataPromise) {
      this.authSchemaMetadataPromise = this.loadAuthSchemaMetadata();
    }

    return this.authSchemaMetadataPromise;
  }

  private async loadAuthSchemaMetadata(): Promise<AuthSchemaMetadata> {
    const result = await this.pool.query<{
      column_name: string;
      table_name: string;
    }>(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = ANY($1::text[])
         AND column_name = ANY($2::text[])`,
      [
        ['user', 'role'],
        ['role', 'role_name', 'status', 'avatar', 'id_role'],
      ],
    );

    const userColumns = new Set(
      result.rows
        .filter((row) => row.table_name === 'user')
        .map((row) => row.column_name),
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
    };
  }

  private buildValidateUserQuery(metadata: AuthSchemaMetadata): string {
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
         u.password,
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
         ON u.${metadata.userRoleColumn} = r.${metadata.roleTableKey}
       WHERE LOWER(u.username) = LOWER($1)`;
  }

  async validateUser(
    username: string,
    password: string,
  ): Promise<AuthenticatedUser> {
    const normalizedUsername = username.trim();
    const schemaMetadata = await this.getAuthSchemaMetadata();
    const result = await this.pool.query<AuthenticatedUserRow>(
      this.buildValidateUserQuery(schemaMetadata),
      [normalizedUsername],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException(
        "Nom d'utilisateur ou mot de passe incorrect",
      );
    }

    const user = result.rows[0];

    if (user.status !== 'ENABLED') {
      throw new UnauthorizedException('Compte desactive');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        "Nom d'utilisateur ou mot de passe incorrect",
      );
    }

    await this.pool.query(
      `UPDATE "user" SET last_login = NOW() WHERE LOWER(username) = LOWER($1)`,
      [normalizedUsername],
    );

    return {
      username: user.username,
      role: user.role,
      rights: user.rights || [],
      email: user.email || null,
      phone: user.phone || null,
      address: user.address || null,
      avatar: user.avatar || null,
      status: user.status,
      lastLogin: user.lastLogin || null,
      createdAt: user.createdAt,
    };
  }

  login(user: AuthenticatedUser): LoginResponse {
    const payload = {
      sub: user.username,
      username: user.username,
      role: user.role,
      rights: user.rights || [],
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        username: user.username,
        role: user.role,
        rights: user.rights || [],
        email: user.email || null,
        phone: user.phone || null,
        address: user.address || null,
        avatar: user.avatar || null,
        status: user.status,
        lastLogin: user.lastLogin || null,
        createdAt: user.createdAt,
      },
    };
  }
}
