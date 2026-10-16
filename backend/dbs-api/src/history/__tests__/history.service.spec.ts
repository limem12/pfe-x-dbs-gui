import { Test, TestingModule } from '@nestjs/testing';
import { PG_POOL } from '../../database/database.module';
import { HistoryService } from '../history.service';

const mockPool = {
  query: jest.fn(),
};
const legacyCreation = `Cr${'\u00c3\u00a9'}ation`;

describe('HistoryService', () => {
  let service: HistoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoryService,
        {
          provide: PG_POOL,
          useValue: mockPool,
        },
      ],
    }).compile();

    service = module.get<HistoryService>(HistoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('devrait normaliser les libelles avant insertion', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ username: 'Admin' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user: 'Admin',
            avatar: null,
            action: 'Creation',
            entity: 'Produit',
            details: 'Creation du produit: Alpha',
            date: '2026-04-10T10:00:00.000Z',
          },
        ],
      });

    const result = await service.create({
      user_name: 'Admin',
      action: 'Creation',
      entity: 'Product',
      entity_id: '12' as unknown as number,
      details: 'Creation du produit: Alpha',
    });

    expect(mockPool.query).toHaveBeenLastCalledWith(
      expect.stringContaining("NOW() AT TIME ZONE 'UTC'"),
      ['Admin', 'Creation', 'Produit', 12, 'Creation du produit: Alpha'],
    );
    expect(result).toEqual({
      id: 1,
      user: 'Admin',
      avatar: null,
      action: 'Creation',
      entity: 'Produit',
      details: 'Creation du produit: Alpha',
      date: '2026-04-10T10:00:00.000Z',
    });
  });

  it('devrait accepter Role comme entite historisee', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ username: 'Admin' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 7,
            user: 'Admin',
            avatar: null,
            action: 'Modification',
            entity: 'Role',
            details: 'Modification du role: ADMIN',
            date: '2026-05-25T11:00:00.000Z',
          },
        ],
      });

    const result = await service.create({
      user_name: 'Admin',
      action: 'Modification',
      entity: 'Role',
      entity_id: '0' as unknown as number,
      details: 'Modification du role: ADMIN',
    });

    expect(mockPool.query).toHaveBeenLastCalledWith(
      expect.stringContaining('INSERT INTO history'),
      ['Admin', 'Modification', 'Role', 0, 'Modification du role: ADMIN'],
    );
    expect(result.entity).toBe('Role');
  });

  it('findAll devrait retourner les valeurs normalisees', async () => {
    mockPool.query.mockResolvedValue({
      rows: [
        {
          id: 1,
          user: 'Admin',
          avatar: '/uploads/admin.png',
          action: 'Creation',
          entity: 'Produit',
          details: 'Creation du produit: Alpha',
          date: '2026-04-10T10:00:00.000Z',
        },
        {
          id: 2,
          user: 'Admin',
          avatar: null,
          action: 'Deconnexion',
          entity: 'User',
          details: 'Deconnexion',
          date: '2026-04-10T10:05:00.000Z',
        },
      ],
    });

    await expect(service.findAll()).resolves.toEqual([
      {
        id: 1,
        user: 'Admin',
        avatar: '/uploads/admin.png',
        action: 'Creation',
        entity: 'Produit',
        details: 'Creation du produit: Alpha',
        date: '2026-04-10T10:00:00.000Z',
      },
      {
        id: 2,
        user: 'Admin',
        avatar: null,
        action: 'Deconnexion',
        entity: 'User',
        details: 'Deconnexion',
        date: '2026-04-10T10:05:00.000Z',
      },
    ]);
  });

  it("findAll ne doit pas echouer si une ancienne valeur n'est pas reconnue", async () => {
    mockPool.query.mockResolvedValue({
      rows: [
        {
          id: 99,
          user: 'Admin',
          avatar: null,
          action: legacyCreation,
          entity: 'Produit',
          details: 'Ancienne entree',
          date: '2026-04-10T10:10:00.000Z',
        },
        {
          id: 100,
          user: 'Admin',
          avatar: null,
          action: 'ActionLegacy',
          entity: 'LegacyEntity',
          details: 'Valeur legacy',
          date: '2026-04-10T10:15:00.000Z',
        },
      ],
    });

    await expect(service.findAll()).resolves.toEqual([
      {
        id: 99,
        user: 'Admin',
        avatar: null,
        action: legacyCreation,
        entity: 'Produit',
        details: 'Ancienne entree',
        date: '2026-04-10T10:10:00.000Z',
      },
      {
        id: 100,
        user: 'Admin',
        avatar: null,
        action: 'ActionLegacy',
        entity: 'LegacyEntity',
        details: 'Valeur legacy',
        date: '2026-04-10T10:15:00.000Z',
      },
    ]);
  });
});
