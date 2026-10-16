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
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './role.interface';
import { RolesService } from './roles.service';

@ApiTags('roles')
@Controller('roles')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  private assertCanManageUsers(req: AuthenticatedRequest) {
    if (!canManageUsers(req.user)) {
      throw new ForbiddenException('Droits insuffisants pour gerer les roles');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Recuperer tous les roles' })
  @ApiResponse({ status: 200, description: 'Liste des roles retournee' })
  findAll(@Req() req: AuthenticatedRequest): Promise<Role[]> {
    this.assertCanManageUsers(req);
    return this.rolesService.findAll();
  }

  @Get(':id_role')
  @ApiOperation({ summary: 'Recuperer un role' })
  findOne(
    @Param('id_role') idRole: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Role> {
    this.assertCanManageUsers(req);
    return this.rolesService.findOne(idRole);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Creer un role' })
  create(
    @Body() dto: CreateRoleDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Role> {
    this.assertCanManageUsers(req);
    return this.rolesService.create(dto, req.user?.username);
  }

  @Put(':id_role')
  @ApiOperation({ summary: 'Modifier un role' })
  update(
    @Param('id_role') idRole: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Role> {
    this.assertCanManageUsers(req);
    return this.rolesService.update(idRole, dto, req.user?.username);
  }

  @Delete(':id_role')
  @ApiOperation({ summary: 'Supprimer un role' })
  remove(
    @Param('id_role') idRole: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    this.assertCanManageUsers(req);
    return this.rolesService.remove(idRole, req.user?.username);
  }
}
