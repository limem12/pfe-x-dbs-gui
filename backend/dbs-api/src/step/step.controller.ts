import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthenticatedRequest } from '../auth/permissions';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { StepService } from './step.service';

@ApiTags('step')
@Controller('step')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class StepController {
  constructor(private readonly service: StepService) {}

  private getActorUsername(
    req: AuthenticatedRequest,
    dto?: { auditUser?: string },
  ): string | undefined {
    return req.user?.username?.trim() || dto?.auditUser?.trim() || undefined;
  }

  private parseId(value: string): number {
    const id = parseInt(value, 10);
    if (Number.isNaN(id)) {
      throw new BadRequestException("L'ID doit etre un nombre");
    }
    return id;
  }

  @Get()
  @ApiOperation({ summary: 'Recuperer tous les steps normalises' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Recuperer un step normalise par ID' })
  @ApiParam({ name: 'id', example: '1' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(this.parseId(id));
  }

  @Post()
  @ApiOperation({ summary: 'Creer un step normalise' })
  @ApiBody({ type: CreateStepDto })
  create(@Body() dto: CreateStepDto, @Req() req: AuthenticatedRequest) {
    return this.service.create(dto, this.getActorUsername(req, dto));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un step normalise' })
  @ApiParam({ name: 'id', example: '1' })
  @ApiBody({ type: UpdateStepDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStepDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.update(
      this.parseId(id),
      dto,
      this.getActorUsername(req, dto),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un step normalise' })
  @ApiParam({ name: 'id', example: '1' })
  remove(@Param('id') id: string) {
    return this.service.remove(this.parseId(id));
  }
}
