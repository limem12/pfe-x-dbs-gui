import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PG_POOL } from '../../database/database.module';
import { HistoryService } from '../../history/history.service';
import { UsersService } from '../users.service';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
};

const mockHistoryService = {
  create: jest.fn(),
};

const currentUserSchemaRows = [
  { table_name: 'user', column_name: 'role', data_type: 'character varying' },
  { table_name: 'user', column_name: 'status', data_type: 'character varying' },
  { table_name: 'user', column_name: 'avatar', data_type: 'text' },
  {
    table_name: 'user',
    column_name: 'admin_id',
    data_type: 'character varying',
  },
  {
    table_name: 'role',
    column_name: 'id_role',
    data_type: 'character varying',
  },
];

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PG_POOL,
          useValue: mockPool,
        },
        {
          provide: HistoryService,
          useValue: mockHistoryService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('devrait etre defini', () => {
    expect(service).toBeDefined();
  });

  it('findAll devrait retourner les utilisateurs avec leurs droits effectifs', async () => {
    mockPool.query.mockResolvedValue({
      rows: [
        {
          username: 'Admin',
          role: 'Admin',
          status: 'ENABLED',
          rights: ['Gerer Users'],
          email: null,
          phone: null,
          address: null,
          avatar: null,
          createdAt: '2026-04-30',
          lastLogin: null,
        },
      ],
    });

    await expect(service.findAll()).resolves.toEqual([
      {
        username: 'Admin',
        role: 'Admin',
        status: 'ENABLED',
        rights: ['Gerer Users'],
        email: null,
        phone: null,
        address: null,
        avatar: null,
        createdAt: '2026-04-30',
        lastLogin: null,
      },
    ]);
  });

  it('findOne devrait lever une erreur si utilisateur introuvable', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await expect(service.findOne('999')).rejects.toThrow(
      'Utilisateur 999 non trouve',
    );
  });

  it('create devrait valider le role, hasher le mot de passe et historiser', async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool.connect.mockResolvedValue(client);
    mockHistoryService.create.mockResolvedValue({});
    mockedBcrypt.hash.mockResolvedValue('hashedPassword123' as never);

    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ role_id: 'Utilisateur' }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    mockPool.query
      .mockResolvedValueOnce({ rows: currentUserSchemaRows })
      .mockResolvedValueOnce({
        rows: [
          {
            username: 'NewUser',
            role: 'Utilisateur',
            status: 'ENABLED',
            rights: ['Voir Data'],
            email: null,
            phone: null,
            address: null,
            avatar: null,
            createdAt: '2026-04-30',
            lastLogin: null,
          },
        ],
      });

    const result = await service.create(
      {
        username: 'NewUser',
        password: 'password123',
        role: 'Utilisateur',
      },
      'Admin',
    );

    expect(result.username).toBe('NewUser');
    expect(mockedBcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('LOWER(username) = LOWER($1)'),
      ['NewUser', null],
    );
    expect(mockHistoryService.create).toHaveBeenCalledWith({
      user_name: 'Admin',
      action: 'Creation',
      entity: 'User',
      entity_id: 'NewUser',
      details: "Creation de l'utilisateur: NewUser",
    });
  });

  it('create devrait refuser un username deja utilise avec une casse differente', async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool.connect.mockResolvedValue(client);

    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ username: 'houssem' }] })
      .mockResolvedValueOnce({});
    mockPool.query.mockResolvedValueOnce({ rows: currentUserSchemaRows });

    await expect(
      service.create({
        username: 'Houssem',
        password: 'password123',
        role: 'Utilisateur',
      }),
    ).rejects.toThrow("L'utilisateur Houssem existe deja");

    expect(client.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('LOWER(username) = LOWER($1)'),
      ['Houssem', null],
    );
    expect(client.query).toHaveBeenLastCalledWith('ROLLBACK');
  });

  it('changePassword devrait mettre a jour le mot de passe', async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool.connect.mockResolvedValue(client);
    mockHistoryService.create.mockResolvedValue({});
    mockedBcrypt.compare.mockResolvedValue(true as never);
    mockedBcrypt.hash.mockResolvedValue('newHashedPassword' as never);

    client.query
      .mockResolvedValueOnce({ rows: [{ password: 'hashedPassword' }] })
      .mockResolvedValueOnce({});

    await expect(
      service.changePassword('Admin', 'oldPassword', 'newPassword123', 'Admin'),
    ).resolves.toEqual({
      message: 'Mot de passe modifie avec succes',
    });
    expect(mockHistoryService.create).toHaveBeenCalledWith({
      user_name: 'Admin',
      action: 'Modification',
      entity: 'User',
      entity_id: 'Admin',
      details: 'Changement du mot de passe pour Admin',
    });
  });

  it('update devrait historiser les champs utilisateur modifies', async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool.connect.mockResolvedValue(client);
    mockHistoryService.create.mockResolvedValue({});
    mockPool.query
      .mockResolvedValueOnce({ rows: currentUserSchemaRows })
      .mockResolvedValueOnce({
        rows: [
          {
            username: 'rabie',
            role: 'USER',
            status: 'DISABLED',
            rights: [],
            email: 'user@example.com',
            phone: '065432',
            address: null,
            avatar: null,
            createdAt: '2026-04-30',
            lastLogin: null,
          },
        ],
      });

    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [
          {
            username: 'rabie',
            role: 'USER',
            status: 'ENABLED',
            email: 'user@example.com',
            phone: '061234',
            address: null,
            avatar: null,
          },
        ],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    await service.update(
      'rabie',
      {
        email: 'user@example.com',
        phone: '065432',
        status: 'DISABLED',
      },
      'Admin',
    );

    expect(mockHistoryService.create).toHaveBeenCalledWith({
      user_name: 'Admin',
      action: 'Modification',
      entity: 'User',
      entity_id: 'rabie',
      details:
        "Modification de l'utilisateur rabie: email de 'user@example.com' a 'user@example.com', telephone de '061234' a '065432', statut de 'ENABLED' a 'DISABLED'",
    });
  });

  it('changePassword devrait refuser un mot de passe actuel incorrect', async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool.connect.mockResolvedValue(client);
    mockedBcrypt.compare.mockResolvedValue(false as never);
    client.query.mockResolvedValue({ rows: [{ password: 'hashedPassword' }] });

    await expect(
      service.changePassword(
        'Admin',
        'wrongPassword',
        'newPassword123',
        'Admin',
      ),
    ).rejects.toThrow(
      new UnauthorizedException('Mot de passe actuel incorrect'),
    );
  });

  it("resetPassword devrait refuser l'auto-reinitialisation", async () => {
    await expect(
      service.resetPassword('Admin', 'newPassword123', 'Admin'),
    ).rejects.toThrow(
      new ForbiddenException(
        'Un administrateur ne peut pas reinitialiser son propre mot de passe depuis cette action',
      ),
    );
  });

  it("resetPassword devrait lever une erreur si l'utilisateur est introuvable", async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool.connect.mockResolvedValue(client);
    client.query.mockResolvedValue({ rows: [] });

    await expect(
      service.resetPassword('999', 'newPassword123', 'Admin'),
    ).rejects.toThrow(new NotFoundException('Utilisateur 999 non trouve'));
  });
});

