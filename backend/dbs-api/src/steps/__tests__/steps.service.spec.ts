import { Test, TestingModule } from '@nestjs/testing';
import { PG_POOL } from '../../database/database.module';
import { HistoryService } from '../../history/history.service';
import { StepsService } from '../steps.service';

const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
};

const mockHistoryService = {
  create: jest.fn(),
};

describe('StepsService', () => {
  let service: StepsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StepsService,
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

    service = module.get<StepsService>(StepsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('devrait etre defini', () => {
    expect(service).toBeDefined();
  });

  it('findAll devrait retourner les steps', async () => {
    const rows = [{ id: 1, name: 'Step 1', params: [] }];
    mockPool.query.mockResolvedValue({ rows });

    await expect(service.findAll()).resolves.toEqual(rows);
  });

  it('findOne devrait lever une erreur si le step est introuvable', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await expect(service.findOne(999)).rejects.toThrow('Step 999 non trouve');
  });

  it('create devrait creer le step et historiser', async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValue(client);
    mockHistoryService.create.mockResolvedValue({});

    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'Nouveau Step',
          description: 'Description',
          params: [],
          createdAt: '2026-04-30',
          createdBy: 'Admin',
        },
      ],
    });

    const result = await service.create(
      {
        name: 'Nouveau Step',
        description: 'Description',
        params: [{ name: 'param1', type: 'String', value: 'value1' }],
      },
      'Admin',
      'Admin',
    );

    expect(result.id).toBe(1);
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(mockHistoryService.create).toHaveBeenCalledWith({
      user_name: 'Admin',
      action: 'Creation',
      entity: 'Step',
      entity_id: 1,
      details: 'Creation du step: Nouveau Step',
    });
  });

  it("create devrait rollback si l'insertion echoue", async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValue(client);

    client.query
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Erreur SQL'))
      .mockResolvedValueOnce({});

    await expect(
      service.create({ name: 'Fail', description: '', params: [] }),
    ).rejects.toThrow('Erreur SQL');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('remove devrait supprimer et historiser le step', async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValue(client);
    mockHistoryService.create.mockResolvedValue({});

    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ name: 'Step to delete' }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({});

    await expect(service.remove(1, 'Admin', 'Admin')).resolves.toEqual({
      message: 'Step supprime',
    });
    expect(mockHistoryService.create).toHaveBeenCalledWith({
      user_name: 'Admin',
      action: 'Suppression',
      entity: 'Step',
      entity_id: 1,
      details: 'Suppression du step: Step to delete',
    });
  });

  it('update devrait historiser le parametre modifie avec ancienne et nouvelle valeur', async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValue(client);
    mockHistoryService.create.mockResolvedValue({});

    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ step_id: 1 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: '10.00',
            description: 'Controle tension',
            params: [
              {
                id: 10,
                name: 'tension_min',
                type: 'Integer',
                value: '20',
              },
            ],
            createdAt: '2026-04-30',
            createdBy: 'Admin',
          },
        ],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: '10.00',
          description: 'Controle tension',
          params: [
            {
              id: 11,
              name: 'tension_min',
              type: 'Integer',
              value: '25',
            },
          ],
          createdAt: '2026-04-30',
          createdBy: 'Admin',
        },
      ],
    });

    await service.update(
      1,
      {
        params: [
          {
            id: '10',
            name: 'tension_min',
            type: 'Integer',
            value: '25',
          },
        ],
      },
      'Admin',
      'Admin',
    );

    expect(mockHistoryService.create).toHaveBeenCalledWith({
      user_name: 'Admin',
      action: 'Modification',
      entity: 'Step',
      entity_id: 1,
      details:
        "Modification du parametre 'tension_min' de '20' a '25' sur step 10.00",
    });
  });
});
