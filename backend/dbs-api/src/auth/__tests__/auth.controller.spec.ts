import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    validateUser: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('devrait etre defini', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('devrait appeler validateUser puis login', async () => {
      const loginDto = { username: 'Admin', password: '123456' };
      const user = { id: 1, username: 'Admin', role: 'Admin' };
      const response = { access_token: 'token', user };

      mockAuthService.validateUser.mockResolvedValue(user);
      mockAuthService.login.mockResolvedValue(response);

      await expect(controller.login(loginDto)).resolves.toEqual(response);
      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        'Admin',
        '123456',
      );
      expect(mockAuthService.login).toHaveBeenCalledWith(user);
    });

    it('devrait propager les erreurs de validation', async () => {
      mockAuthService.validateUser.mockRejectedValue(
        new Error('Nom ou mot de passe incorrect'),
      );

      await expect(
        controller.login({ username: 'Admin', password: 'wrong' }),
      ).rejects.toThrow('Nom ou mot de passe incorrect');
    });
  });
});
