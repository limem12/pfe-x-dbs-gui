import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedRequest } from '../../auth/permissions';
import { StepsController } from '../steps.controller';
import { StepsService } from '../steps.service';

describe('StepsController', () => {
  let controller: StepsController;

  const mockStepsService = {
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

  const readOnlyRequest: AuthenticatedRequest = {
    user: {
      username: 'Visitor',
      role: 'Utilisateur',
      rights: ['Voir Data'],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StepsController],
      providers: [
        {
          provide: StepsService,
          useValue: mockStepsService,
        },
      ],
    }).compile();

    controller = module.get<StepsController>(StepsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('devrait etre defini', () => {
    expect(controller).toBeDefined();
  });

  it('findAll devrait verifier les droits et retourner les steps', async () => {
    const result = [{ id: 1, name: 'Step 1' }];
    mockStepsService.findAll.mockResolvedValue(result);

    await expect(controller.findAll(adminRequest)).resolves.toBe(result);
    expect(mockStepsService.findAll).toHaveBeenCalled();
  });

  it('findOne devrait refuser un identifiant invalide', async () => {
    await expect(controller.findOne('abc', adminRequest)).rejects.toThrow(
      "L'ID doit etre un nombre",
    );
  });

  it('create devrait transmettre le contexte utilisateur', async () => {
    const dto = { name: 'New Step', description: 'Test', params: [] };
    const result = { id: 1, ...dto };
    mockStepsService.create.mockResolvedValue(result);

    await expect(controller.create(dto, adminRequest)).resolves.toBe(result);
    expect(mockStepsService.create).toHaveBeenCalledWith(dto, 'Admin', 'Admin');
  });

  it('create devrait utiliser auditUser si le token ne contient pas username', async () => {
    const dto = {
      name: 'New Step',
      description: 'Test',
      params: [],
      auditUser: 'Admin',
    };
    const requestWithoutUsername: AuthenticatedRequest = {
      user: {
        role: 'Admin',
        rights: ['Editer Step'],
      },
    };
    const result = { id: 1, ...dto };
    mockStepsService.create.mockResolvedValue(result);

    await expect(
      controller.create(dto, requestWithoutUsername),
    ).resolves.toBe(result);
    expect(mockStepsService.create).toHaveBeenCalledWith(dto, 'Admin', 'Admin');
  });

  it('update devrait refuser les droits insuffisants', async () => {
    await expect(
      controller.update('1', { name: 'Blocked' }, readOnlyRequest),
    ).rejects.toThrow('Droits insuffisants pour gerer les steps');
  });

  it('remove devrait transmettre id et username', async () => {
    const result = { message: 'Step supprime' };
    mockStepsService.remove.mockResolvedValue(result);

    await expect(controller.remove('1', adminRequest)).resolves.toBe(result);
    expect(mockStepsService.remove).toHaveBeenCalledWith(1, 'Admin', 'Admin');
  });
});
