import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { canManageUsers, type AuthenticatedRequest } from '../auth/permissions';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.interface';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private assertCanManageUsers(req: AuthenticatedRequest) {
    if (!canManageUsers(req.user)) {
      throw new ForbiddenException(
        'Droits insuffisants pour gerer les utilisateurs',
      );
    }
  }

  private getAuthenticatedUsername(req: AuthenticatedRequest): string {
    if (!req.user?.username) {
      throw new UnauthorizedException('Authentification requise');
    }

    return req.user.username;
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest): Promise<User[]> {
    this.assertCanManageUsers(req);
    return this.usersService.findAll();
  }

  @Get(':username')
  findOne(
    @Param('username') username: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<User> {
    this.assertCanManageUsers(req);
    return this.usersService.findOne(username);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Changer le mot de passe de l'utilisateur connecte",
  })
  @ApiResponse({
    status: 200,
    description: 'Mot de passe modifie avec succes',
  })
  @ApiResponse({
    status: 401,
    description: 'Mot de passe actuel incorrect',
  })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    const username = this.getAuthenticatedUsername(req);

    return this.usersService.changePassword(
      username,
      dto.currentPassword,
      dto.newPassword,
      username,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateUserDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<User> {
    this.assertCanManageUsers(req);
    return this.usersService.create(dto, req.user?.username);
  }

  @Put(':username')
  update(
    @Param('username') username: string,
    @Body() dto: UpdateUserDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<User> {
    this.assertCanManageUsers(req);
    return this.usersService.update(username, dto, req.user?.username);
  }

  @Post('reset-password/:username')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Reinitialiser le mot de passe d'un utilisateur",
  })
  @ApiResponse({
    status: 200,
    description: 'Mot de passe reinitialise',
  })
  @ApiResponse({
    status: 403,
    description: 'Droits insuffisants',
  })
  @ApiResponse({
    status: 404,
    description: 'Utilisateur non trouve',
  })
  async resetPassword(
    @Param('username') username: string,
    @Body() dto: ResetPasswordDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    this.assertCanManageUsers(req);
    const adminUsername = this.getAuthenticatedUsername(req);

    if (adminUsername.toLowerCase() === username.toLowerCase()) {
      throw new ForbiddenException(
        'Un administrateur ne peut pas reinitialiser son propre mot de passe depuis cette action',
      );
    }

    return this.usersService.resetPassword(
      username,
      dto.newPassword,
      adminUsername,
    );
  }

  @Delete(':username')
  remove(
    @Param('username') username: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertCanManageUsers(req);
    return this.usersService.remove(username, req.user?.username);
  }
}
