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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import {
  canAccessSequences,
  canManageSequences,
  type AuthenticatedRequest,
} from '../auth/permissions';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import type { Sequence } from './sequence.interface';
import { SequencesService } from './sequences.service';

@ApiTags('sequences')
@Controller('sequences')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class SequencesController {
  constructor(private readonly sequencesService: SequencesService) {}

  private assertCanAccessSequences(req: AuthenticatedRequest) {
    if (!canAccessSequences(req.user)) {
      throw new ForbiddenException(
        'Droits insuffisants pour consulter les sequences',
      );
    }
  }

  private assertCanManageSequences(req: AuthenticatedRequest) {
    if (!canManageSequences(req.user)) {
      throw new ForbiddenException(
        'Droits insuffisants pour gerer les sequences',
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Recuperer toutes les sequences' })
  @ApiResponse({ status: 200, description: 'Liste des sequences retournee' })
  @ApiResponse({ status: 403, description: 'Droits insuffisants' })
  findAll(@Req() req: AuthenticatedRequest): Promise<Sequence[]> {
    this.assertCanAccessSequences(req);
    return this.sequencesService.findAll();
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Sequence> {
    this.assertCanAccessSequences(req);

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException("L'ID doit etre un nombre");
    }

    return this.sequencesService.findOne(numericId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateSequenceDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Sequence> {
    this.assertCanManageSequences(req);
    return this.sequencesService.create(
      dto,
      req.user?.username,
      req.user?.username,
    );
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateSequenceDto>,
    @Req() req: AuthenticatedRequest,
  ): Promise<Sequence> {
    this.assertCanManageSequences(req);

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException("L'ID doit etre un nombre");
    }

    return this.sequencesService.update(
      numericId,
      dto,
      req.user?.username,
      req.user?.username,
    );
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    this.assertCanManageSequences(req);

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException("L'ID doit etre un nombre");
    }

    return this.sequencesService.remove(
      numericId,
      req.user?.username,
      req.user?.username,
    );
  }
}
