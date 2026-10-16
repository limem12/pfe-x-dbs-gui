import { Test, TestingModule } from '@nestjs/testing';
import { PG_POOL } from '../../database/database.module';
import { HistoryService } from '../../history/history.service';
import { SequencesService } from '../sequences.service';

const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
};

const mockHistoryService = {
  create: jest.fn(),
};

describe('SequencesService', () => {
  let service: SequencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SequencesService,
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

    service = module.get<SequencesService>(SequencesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('devrait etre defini', () => {
    expect(service).toBeDefined();
  });

  it('findAll devrait retourner les sequences mappees', async () => {
    mockPool.query.mockResolvedValue({
      rows: [
        {
          id: 1,
          name: 'Sequence 1',
          description: 'Desc 1',
          stepIds: [1, 2],
          createdAt: '2026-04-30',
          createdBy: 'Admin',
        },
      ],
    });

    await expect(service.findAll()).resolves.toEqual([
      {
        id: 1,
        name: 'Sequence 1',
        description: 'Desc 1',
        stepIds: ['1', '2'],
        createdAt: '2026-04-30',
        createdBy: 'Admin',
      },
    ]);
  });

  it('findOne devrait lever une erreur si la sequence est introuvable', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    await expect(service.findOne(999)).rejects.toThrow(
      'Sequence 999 non trouvee',
    );
  });

  it('create devrait creer la sequence et historiser', async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValue(client);
    mockHistoryService.create.mockResolvedValue({});

    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ step_id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 1,
          name: 'Sequence 1',
          description: 'Desc',
          stepIds: [1],
          createdAt: '2026-04-30',
          createdBy: 'Admin',
        },
      ],
    });

    const result = await service.create(
      {
        name: 'Sequence 1',
        description: 'Desc',
        stepIds: ['1'],
      },
      'Admin',
      'Admin',
    );

    expect(result.id).toBe(1);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining(
        'INSERT INTO sequence_step (sequence_id, step_id, order_index, created_at)',
      ),
      [1, 1, 1],
    );
    expect(mockHistoryService.create).toHaveBeenCalledWith({
      user_name: 'Admin',
      action: 'Creation',
      entity: 'Sequence',
      entity_id: 1,
      details: 'Creation de la sequence: Sequence 1',
    });
  });

  it('update devrait valider les steps avant reecriture', async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValue(client);

    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ sequence_id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ step_id: 1 }] })
      .mockResolvedValueOnce({});

    await expect(service.update(1, { stepIds: ['1', '999'] })).rejects.toThrow(
      "Impossible d'utiliser des steps inexistants: 999",
    );
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('remove devrait supprimer et historiser la sequence', async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockPool.connect.mockResolvedValue(client);
    mockHistoryService.create.mockResolvedValue({});

    client.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ name: 'Sequence 1' }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({});

    await expect(service.remove(1, 'Admin', 'Admin')).resolves.toEqual({
      message: 'Sequence supprimee',
    });
    expect(mockHistoryService.create).toHaveBeenCalledWith({
      user_name: 'Admin',
      action: 'Suppression',
      entity: 'Sequence',
      entity_id: 1,
      details: 'Suppression de la sequence: Sequence 1',
    });
  });
});
