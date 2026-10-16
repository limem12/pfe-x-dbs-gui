import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedRequest } from '../../auth/permissions';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    changePassword: jest.fn(),
    resetPassword: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const adminRequest: AuthenticatedRequest = {
    user: {
      username: 'Admin',
      role: 'Admin',
      rights: ['Gerer Users'],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('devrait etre defini', () => {
    expect(controller).toBeDefined();
  });

  it('findAll devrait etre reserve aux utilisateurs autorises', async () => {
    const result = [{ id: 1, username: 'Admin' }];
    mockUsersService.findAll.mockResolvedValue(result);

    await expect(controller.findAll(adminRequest)).resolves.toBe(result);
    expect(mockUsersService.findAll).toHaveBeenCalled();
  });

  it('findOne devrait parser un identifiant numerique', async () => {
    const result = { id: 1, username: 'Admin' };
    mockUsersService.findOne.mockResolvedValue(result);

    await expect(controller.findOne('1', adminRequest)).resolves.toBe(result);
    expect(mockUsersService.findOne).toHaveBeenCalledWith('1');
  });

  it('changePassword devrait transmettre le contexte utilisateur', async () => {
    const dto = {
      currentPassword: '123456',
      newPassword: 'newPassword456',
    };
    const result = { message: 'Mot de passe modifie avec succes' };
    mockUsersService.changePassword.mockResolvedValue(result);

    await expect(controller.changePassword(dto, adminRequest)).resolves.toBe(
      result,
    );
    expect(mockUsersService.changePassword).toHaveBeenCalledWith(
      'Admin',
      '123456',
      'newPassword456',
      'Admin',
    );
  });

  it('create devrait transmettre le create dto et l acteur', async () => {
    const dto = {
      username: 'NewUser',
      password: 'pass123',
      role: 'Utilisateur',
    };
    const result = { id: 2, ...dto };
    mockUsersService.create.mockResolvedValue(result);

    await expect(controller.create(dto, adminRequest)).resolves.toBe(result);
    expect(mockUsersService.create).toHaveBeenCalledWith(dto, 'Admin');
  });

  it('resetPassword devrait transmettre username et acteur', async () => {
    const result = { message: 'Mot de passe reinitialise avec succes' };
    mockUsersService.resetPassword.mockResolvedValue(result);

    await expect(
      controller.resetPassword(
        'rabie',
        { newPassword: 'newPassword456' },
        adminRequest,
      ),
    ).resolves.toBe(result);
    expect(mockUsersService.resetPassword).toHaveBeenCalledWith(
      'rabie',
      'newPassword456',
      'Admin',
    );
  });

  it('update devrait parser l identifiant et transmettre le contexte', async () => {
    const result = { id: 1, username: 'UpdatedUser' };
    mockUsersService.update.mockResolvedValue(result);

    await expect(
      controller.update('1', { username: 'UpdatedUser' }, adminRequest),
    ).resolves.toBe(result);
    expect(mockUsersService.update).toHaveBeenCalledWith(
      '1',
      { username: 'UpdatedUser' },
      'Admin',
    );
  });

  it('remove devrait parser l identifiant et transmettre le contexte', async () => {
    const result = { message: 'Utilisateur supprime' };
    mockUsersService.remove.mockResolvedValue(result);

    await expect(controller.remove('1', adminRequest)).resolves.toBe(result);
    expect(mockUsersService.remove).toHaveBeenCalledWith('1', 'Admin');
  });
});
