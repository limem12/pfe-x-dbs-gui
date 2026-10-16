import {
  BadRequestException,
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
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import {
  canAccessSteps,
  canManageSteps,
  type AuthenticatedRequest,
} from '../auth/permissions';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { Step } from './step.interface';
import { StepsService } from './steps.service';

@ApiTags('steps')
@Controller('steps')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class StepsController {
  constructor(private readonly stepsService: StepsService) {}

  private getActorUsername(
    req: AuthenticatedRequest,
    dto?: { auditUser?: string },
  ): string | undefined {
    return req.user?.username?.trim() || dto?.auditUser?.trim() || undefined;
  }

  private assertCanAccessSteps(req: AuthenticatedRequest) {
    if (!canAccessSteps(req.user)) {
      throw new ForbiddenException(
        'Droits insuffisants pour consulter les steps',
      );
    }
  }

  private assertCanManageSteps(req: AuthenticatedRequest) {
    if (!canManageSteps(req.user)) {
      throw new ForbiddenException('Droits insuffisants pour gerer les steps');
    }
  }

  @Get()
  @ApiOperation({ summary: 'Recuperer tous les steps' })
  @ApiResponse({ status: 200, description: 'Liste des steps retournee' })
  findAll(@Req() req: AuthenticatedRequest): Promise<Step[]> {
    this.assertCanAccessSteps(req);
    return this.stepsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Recuperer un step par son ID' })
  @ApiParam({ name: 'id', description: 'ID du step', example: '1' })
  @ApiResponse({ status: 200, description: 'Step trouve' })
  @ApiResponse({ status: 404, description: 'Step non trouve' })
  async findOne(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Step> {
    this.assertCanAccessSteps(req);

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException("L'ID doit etre un nombre");
    }

    return this.stepsService.findOne(numericId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Creer un nouveau step' })
  @ApiResponse({ status: 201, description: 'Step cree avec succes' })
  @ApiResponse({ status: 400, description: 'Donnees invalides' })
  create(
    @Body() dto: CreateStepDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Step> {
    this.assertCanManageSteps(req);
    const actor = this.getActorUsername(req, dto);

    return this.stepsService.create(
      dto,
      actor,
      actor,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un step existant' })
  @ApiParam({ name: 'id', description: 'ID du step', example: '1' })
  @ApiResponse({ status: 200, description: 'Step modifie avec succes' })
  @ApiResponse({ status: 404, description: 'Step non trouve' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStepDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Step> {
    this.assertCanManageSteps(req);
    const actor = this.getActorUsername(req, dto);

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException("L'ID doit etre un nombre");
    }

    return this.stepsService.update(
      numericId,
      dto,
      actor,
      actor,
    );
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    this.assertCanManageSteps(req);
    const actor = this.getActorUsername(req);

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException("L'ID doit etre un nombre");
    }

    return this.stepsService.remove(
      numericId,
      actor,
      actor,
    );
  }
}
