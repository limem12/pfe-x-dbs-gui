import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PG_POOL } from '../../database/database.module';
import { AuthService } from '../auth.service';

const mockPool = {
  query: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('fake-jwt-token'),
};

const currentAuthSchemaRows = [
  { table_name: 'user', column_name: 'role' },
  { table_name: 'user', column_name: 'status' },
  { table_name: 'user', column_name: 'avatar' },
  { table_name: 'role', column_name: 'id_role' },
];

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PG_POOL,
          useValue: mockPool,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('devrait etre defini', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('devrait valider un utilisateur avec les bons identifiants', async () => {
      const mockUser = {
        username: 'Admin',
        role: 'Admin',
        status: 'ENABLED',
        rights: ['Voir Data'],
        email: 'user@example.com',
        phone: null,
        address: null,
        avatar: null,
        lastLogin: null,
        createdAt: '2024-01-01',
        password: 'hashedPassword123',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: currentAuthSchemaRows })
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({});
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validateUser('Admin', '123456');

      expect(result).toEqual({
        username: 'Admin',
        role: 'Admin',
        status: 'ENABLED',
        rights: ['Voir Data'],
        email: 'user@example.com',
        phone: null,
        address: null,
        avatar: null,
        lastLogin: null,
        createdAt: '2024-01-01',
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        '123456',
        'hashedPassword123',
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('LOWER(u.username) = LOWER($1)'),
        ['Admin'],
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('UPDATE "user" SET last_login = NOW()'),
        ['Admin'],
      );
    });

    it('devrait permettre une connexion avec une casse differente', async () => {
      const mockUser = {
        username: 'HOUSSEM',
        role: 'Admin',
        status: 'ENABLED',
        rights: ['Voir Data'],
        email: 'user@example.com',
        phone: null,
        address: null,
        avatar: null,
        lastLogin: null,
        createdAt: '2024-01-01',
        password: 'hashedPassword123',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: currentAuthSchemaRows })
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({});
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validateUser('houssem', '123456');

      expect(result.username).toBe('HOUSSEM');
      expect(mockPool.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('LOWER(u.username) = LOWER($1)'),
        ['houssem'],
      );
    });

    it("devrait conserver les droits specifiques de l'utilisateur dans la session", async () => {
      const mockUser = {
        username: 'Technicien',
        role: 'Utilisateur',
        status: 'ENABLED',
        rights: ['Voir Data', 'Editer Produit', 'Gerer Users'],
        email: 'user@example.com',
        phone: null,
        address: null,
        avatar: null,
        lastLogin: null,
        createdAt: '2024-01-02',
        password: 'hashedPassword123',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: currentAuthSchemaRows })
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({});
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validateUser('Technicien', 'password123');

      expect(result.rights).toEqual([
        'Voir Data',
        'Editer Produit',
        'Gerer Users',
      ]);
    });

    it("devrait lever une exception si l'utilisateur n'existe pas", async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: currentAuthSchemaRows })
        .mockResolvedValueOnce({ rows: [] });

      await expect(service.validateUser('Inconnu', 'password')).rejects.toThrow(
        "Nom d'utilisateur ou mot de passe incorrect",
      );
    });

    it('devrait lever une exception si le mot de passe est incorrect', async () => {
      const mockUser = {
        username: 'Admin',
        role: 'Admin',
        status: 'ENABLED',
        rights: [],
        email: null,
        phone: null,
        address: null,
        avatar: null,
        lastLogin: null,
        createdAt: '2024-01-01',
        password: 'hashedPassword123',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: currentAuthSchemaRows })
        .mockResolvedValueOnce({ rows: [mockUser] });
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        service.validateUser('Admin', 'wrongpassword'),
      ).rejects.toThrow("Nom d'utilisateur ou mot de passe incorrect");
    });

    it('devrait lever une exception si le compte est inactif', async () => {
      const mockUser = {
        username: 'Admin',
        role: 'Admin',
        status: 'DISABLED',
        rights: [],
        email: null,
        phone: null,
        address: null,
        avatar: null,
        lastLogin: null,
        createdAt: '2024-01-01',
        password: 'hashedPassword123',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: currentAuthSchemaRows })
        .mockResolvedValueOnce({ rows: [mockUser] });
      mockedBcrypt.compare.mockResolvedValue(true as never);

      await expect(service.validateUser('Admin', '123456')).rejects.toThrow(
        'Compte desactive',
      );
    });
  });

  describe('login', () => {
    it('devrait retourner un token JWT et les informations utilisateur', () => {
      const user = {
        username: 'Admin',
        role: 'Admin',
        status: 'ENABLED',
        rights: ['Voir Data', 'Editer Produit'],
        email: null,
        phone: null,
        address: null,
        avatar: null,
        lastLogin: null,
        createdAt: '2024-01-01',
      };

      const result = service.login(user);

      expect(result).toEqual({
        access_token: 'fake-jwt-token',
        user,
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'Admin',
        username: 'Admin',
        role: 'Admin',
        rights: ['Voir Data', 'Editer Produit'],
      });
    });
  });
});

