import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedRequest } from '../../auth/permissions';
import { ProductsController } from '../products.controller';
import { ProductsService } from '../products.service';

describe('ProductsController', () => {
  let controller: ProductsController;

  const mockProductsService = {
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
      username: 'Wissem',
      role: 'Utilisateur',
      rights: ['Voir Data', 'Editer Produit'],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('devrait etre defini', () => {
    expect(controller).toBeDefined();
  });

  it('findAll devrait verifier les droits et retourner les produits', async () => {
    const result = [{ id: 1, name: 'Produit 1' }];
    mockProductsService.findAll.mockResolvedValue(result);

    await expect(controller.findAll(adminRequest)).resolves.toBe(result);
    expect(mockProductsService.findAll).toHaveBeenCalled();
  });

  it('findOne devrait refuser un identifiant invalide', async () => {
    await expect(controller.findOne('abc', adminRequest)).rejects.toThrow(
      "L'ID doit etre un nombre",
    );
  });

  it('create devrait transmettre le contexte utilisateur', async () => {
    const dto = { name: 'New Product', description: 'Test', params: [] };
    const result = {
      id: 1,
      ...dto,
      preuutStepIds: [],
      sequenceIds: [],
      postuutStepIds: [],
      createdAt: '2026-04-30',
      createdBy: 'Admin',
    };
    mockProductsService.create.mockResolvedValue(result);

    await expect(controller.create(dto, editorRequest)).resolves.toBe(result);
    expect(mockProductsService.create).toHaveBeenCalledWith(
      dto,
      'Wissem',
      'Wissem',
    );
  });

  it('update devrait transmettre le contexte utilisateur', async () => {
    const updateDto = { name: 'Updated Product' };
    const result = {
      id: 1,
      name: 'Updated Product',
      description: '',
      params: [],
      preuutStepIds: [],
      sequenceIds: [],
      postuutStepIds: [],
      createdAt: '2026-04-30',
      createdBy: 'Admin',
    };
    mockProductsService.update.mockResolvedValue(result);

    await expect(controller.update('1', updateDto, adminRequest)).resolves.toBe(
      result,
    );
    expect(mockProductsService.update).toHaveBeenCalledWith(
      1,
      updateDto,
      'Admin',
      'Admin',
    );
  });

  it('remove devrait transmettre id et username', async () => {
    const result = { message: 'Produit supprime' };
    mockProductsService.remove.mockResolvedValue(result);

    await expect(controller.remove('1', adminRequest)).resolves.toBe(result);
    expect(mockProductsService.remove).toHaveBeenCalledWith(
      1,
      'Admin',
      'Admin',
    );
  });
});
