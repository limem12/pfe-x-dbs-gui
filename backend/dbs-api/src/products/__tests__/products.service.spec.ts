import { Test, TestingModule } from '@nestjs/testing';
import { PG_POOL } from '../../database/database.module';
import { HistoryService } from '../../history/history.service';
import { ProductsService } from '../products.service';

const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
};

const mockHistoryService = {
  create: jest.fn(),
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
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

    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('devrait etre defini', () => {
    expect(service).toBeDefined();
  });

  it('findAll devrait mapper les produits detailles', async () => {
    mockPool.query.mockResolvedValue({
      rows: [
        {
          id: 1,
          name: 'Produit 1',
          description: 'Desc 1',
          createdAt: '2026-04-30',
          createdBy: 'Admin',
          params: [{ id: 10, name: 'param', type: 'String', value: 'x' }],
          preuutStepIds: [1],
          sequenceIds: [2],
          postuutStepIds: [3],
        },
      ],
    });

    await expect(service.findAll()).resolves.toEqual([
      {
        id: 1,
        name: 'Produit 1',
        description: 'Desc 1',
        createdAt: '2026-04-30',
        createdBy: 'Admin',
        params: [{ id: 10, name: 'param', type: 'String', value: 'x' }],
        preuutStepIds: ['1'],
        sequenceIds: ['2'],
        postuutStepIds: ['3'],
      },
    ]);
  });

  it('findOne devrait lever une erreur si le produit est introuvable', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await expect(service.findOne(999)).rejects.toThrow(
      'Produit 999 non trouve',
    );
  });

  it('create devrait enregistrer le produit et historiser avec le bon acteur', async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValue(client);
    mockHistoryService.create.mockResolvedValue({});

    mockPool.query
      .mockResolvedValueOnce({
        rows: [{ column_name: 'created_by', data_type: 'character varying' }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'Produit 1',
            description: 'Desc 1',
            createdAt: '2026-04-30',
            createdBy: 'Alice',
            params: [],
            preuutStepIds: [],
            sequenceIds: [],
            postuutStepIds: [],
          },
        ],
      });

    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const result = await service.create(
      {
        name: 'Produit 1',
        description: 'Desc 1',
        params: [],
        preuutStepIds: [],
        sequenceIds: [],
        postuutStepIds: [],
      },
      'Alice',
      'Alice',
    );

    expect(result.id).toBe(1);
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(mockHistoryService.create).toHaveBeenCalledWith({
      user_name: 'Alice',
      action: 'Creation',
      entity: 'Produit',
      entity_id: 1,
      details: 'Creation du produit: Produit 1',
    });
  });

  it('create devrait refuser les references invalides au lieu de les ignorer', async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValue(client);
    mockPool.query.mockResolvedValueOnce({
      rows: [{ column_name: 'created_by', data_type: 'character varying' }],
    });
    client.query.mockResolvedValueOnce({});

    await expect(
      service.create({
        name: 'Produit',
        description: '',
        params: [],
        preuutStepIds: ['step-x'],
        sequenceIds: [],
        postuutStepIds: [],
      }),
    ).rejects.toThrow(
      'preuutStepIds[0] doit contenir un identifiant numerique valide',
    );

    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('remove devrait supprimer et historiser le produit', async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValue(client);
    mockHistoryService.create.mockResolvedValue({});

    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Produit 1', description: 'Desc' }],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({});

    await expect(service.remove(1, 'Admin', 'Admin')).resolves.toEqual({
      message: 'Produit supprime',
    });
    expect(mockHistoryService.create).toHaveBeenCalledWith({
      user_name: 'Admin',
      action: 'Suppression',
      entity: 'Produit',
      entity_id: 1,
      details: 'Suppression du produit: Produit 1',
    });
  });

  it('update devrait historiser le parametre modifie avec ancienne et nouvelle valeur', async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValue(client);
    mockHistoryService.create.mockResolvedValue({});

    mockPool.query
      .mockResolvedValueOnce({
        rows: [{ column_name: 'created_by', data_type: 'character varying' }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'L003295671NCPAD',
            description: 'Produit industriel',
            createdAt: '2026-04-30',
            createdBy: 'Admin',
            params: [
              {
                id: 11,
                name: 'tension',
                type: 'Float',
                value: '13.0',
              },
            ],
            preuutStepIds: [],
            sequenceIds: [],
            postuutStepIds: [],
          },
        ],
      });

    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'L003295671NCPAD',
            description: 'Produit industriel',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'L003295671NCPAD',
            description: 'Produit industriel',
            createdAt: '2026-04-30',
            createdBy: 'Admin',
            params: [
              {
                id: 10,
                name: 'tension',
                type: 'Float',
                value: '12.5',
              },
            ],
            preuutStepIds: [],
            sequenceIds: [],
            postuutStepIds: [],
          },
        ],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    await service.update(
      1,
      {
        params: [
          {
            id: '10',
            name: 'tension',
            type: 'Float',
            value: '13.0',
          },
        ],
      },
      'Admin',
      'Admin',
    );

    expect(mockHistoryService.create).toHaveBeenCalledWith({
      user_name: 'Admin',
      action: 'Modification',
      entity: 'Produit',
      entity_id: 1,
      details:
        "Modification du parametre 'tension' de '12.5' a '13.0' sur produit L003295671NCPAD",
    });
  });
});
