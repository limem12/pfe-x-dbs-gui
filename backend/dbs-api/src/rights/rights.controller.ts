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
import {
  canManageUsers,
  type AuthenticatedRequestUser,
} from '../auth/permissions';
import { CreateRightDto, UpdateRightDto } from './dto';
import { Right } from './right.interface';
import { RightsService } from './rights.service';

type RightsRequest = {
  user?: AuthenticatedRequestUser;
};

@ApiTags('rights')
@Controller('rights')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class RightsController {
  constructor(private readonly rightsService: RightsService) {}

  private assertCanManageUsers(req: RightsRequest) {
    if (!canManageUsers(req.user)) {
      throw new ForbiddenException('Droits insuffisants pour gerer les droits');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Recuperer le catalogue des droits' })
  @ApiResponse({ status: 200, description: 'Liste des droits retournee' })
  findAll(@Req() req: RightsRequest): Promise<Right[]> {
    this.assertCanManageUsers(req);
    return this.rightsService.findAll();
  }

  @Get(':id_right')
  @ApiOperation({ summary: 'Recuperer un droit' })
  findOne(
    @Param('id_right') idRight: string,
    @Req() req: RightsRequest,
  ): Promise<Right> {
    this.assertCanManageUsers(req);
    return this.rightsService.findOne(idRight);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Creer un droit' })
  create(
    @Body() dto: CreateRightDto,
    @Req() req: RightsRequest,
  ): Promise<Right> {
    this.assertCanManageUsers(req);
    return this.rightsService.create(dto);
  }

  @Put(':id_right')
  @ApiOperation({ summary: 'Modifier un droit' })
  update(
    @Param('id_right') idRight: string,
    @Body() dto: UpdateRightDto,
    @Req() req: RightsRequest,
  ): Promise<Right> {
    this.assertCanManageUsers(req);
    return this.rightsService.update(idRight, dto);
  }

  @Delete(':id_right')
  @ApiOperation({ summary: 'Supprimer un droit' })
  remove(
    @Param('id_right') idRight: string,
    @Req() req: RightsRequest,
  ): Promise<{ message: string }> {
    this.assertCanManageUsers(req);
    return this.rightsService.remove(idRight);
  }
}
