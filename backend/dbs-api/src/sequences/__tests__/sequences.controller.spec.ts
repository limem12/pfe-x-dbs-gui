import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedRequest } from '../../auth/permissions';
import { SequencesController } from '../sequences.controller';
import { SequencesService } from '../sequences.service';

describe('SequencesController', () => {
  let controller: SequencesController;

  const mockSequencesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const adminRequest: AuthenticatedRequest = {
    user: {
      username: 'Admin',
      role: 'Admin',
      rights: [
        'Voir Data',
        'Editer Produit',
        'Editer Step',
        'Editer Sequence',
        'Gerer Users',
      ],
    },
  };

  const editorRequest: AuthenticatedRequest = {
    user: {
      username: 'HOSS',
      role: 'Utilisateur',
      rights: ['Voir Data', 'Editer Sequence'],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SequencesController],
      providers: [
        {
          provide: SequencesService,
          useValue: mockSequencesService,
        },
      ],
    }).compile();

    controller = module.get<SequencesController>(SequencesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('devrait etre defini', () => {
    expect(controller).toBeDefined();
  });

  it('findAll devrait verifier les droits et retourner les sequences', async () => {
    const result = [{ id: 1, name: 'Sequence 1' }];
    mockSequencesService.findAll.mockResolvedValue(result);

    await expect(controller.findAll(adminRequest)).resolves.toBe(result);
    expect(mockSequencesService.findAll).toHaveBeenCalled();
  });

  it('findOne devrait refuser un identifiant invalide', async () => {
    await expect(controller.findOne('abc', adminRequest)).rejects.toThrow(
      "L'ID doit etre un nombre",
    );
  });

  it('create devrait transmettre le contexte utilisateur', async () => {
    const dto = { name: 'New Sequence', description: 'Test', stepIds: [] };
    const result = {
      id: 1,
      ...dto,
      createdAt: '2026-04-30',
      createdBy: 'HOSS',
    };
    mockSequencesService.create.mockResolvedValue(result);

    await expect(controller.create(dto, editorRequest)).resolves.toBe(result);
    expect(mockSequencesService.create).toHaveBeenCalledWith(
      dto,
      'HOSS',
      'HOSS',
    );
  });

  it('update devrait transmettre le contexte utilisateur', async () => {
    const dto = { name: 'Updated Sequence' };
    const result = {
      id: 1,
      name: 'Updated Sequence',
      description: '',
      stepIds: [],
      createdAt: '2026-04-30',
      createdBy: 'Admin',
    };
    mockSequencesService.update.mockResolvedValue(result);

    await expect(controller.update('1', dto, adminRequest)).resolves.toBe(
      result,
    );
    expect(mockSequencesService.update).toHaveBeenCalledWith(
      1,
      dto,
      'Admin',
      'Admin',
    );
  });

  it('remove devrait transmettre id et username', async () => {
    const result = { message: 'Sequence supprimee' };
    mockSequencesService.remove.mockResolvedValue(result);

    await expect(controller.remove('1', adminRequest)).resolves.toBe(result);
    expect(mockSequencesService.remove).toHaveBeenCalledWith(
      1,
      'Admin',
      'Admin',
    );
  });
});
