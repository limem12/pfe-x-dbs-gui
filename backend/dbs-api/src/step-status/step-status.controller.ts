import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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
import { CreateStepStatusDto } from './dto/create-step-status.dto';
import { UpdateStepStatusDto } from './dto/update-step-status.dto';
import { StepStatusService } from './step-status.service';

@ApiTags('step-status')
@Controller('step-status')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class StepStatusController {
  constructor(private readonly service: StepStatusService) {}

  private parseId(value: string): number {
    const id = parseInt(value, 10);

    if (Number.isNaN(id)) {
      throw new BadRequestException("L'ID doit etre un nombre");
    }

    return id;
  }

  @Get()
  @ApiOperation({ summary: 'Recuperer tous les step status' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':status_id')
  @ApiOperation({ summary: 'Recuperer un step status par ID' })
  @ApiParam({ name: 'status_id', example: '1' })
  findOne(@Param('status_id') statusId: string) {
    return this.service.findOne(this.parseId(statusId));
  }

  @Post()
  @ApiOperation({ summary: 'Creer un step status' })
  @ApiBody({ type: CreateStepStatusDto })
  create(@Body() dto: CreateStepStatusDto) {
    return this.service.create(dto);
  }

  @Put(':status_id')
  @ApiOperation({ summary: 'Modifier un step status' })
  @ApiParam({ name: 'status_id', example: '1' })
  @ApiBody({ type: UpdateStepStatusDto })
  update(
    @Param('status_id') statusId: string,
    @Body() dto: UpdateStepStatusDto,
  ) {
    return this.service.update(this.parseId(statusId), dto);
  }

  @Delete(':status_id')
  @ApiOperation({ summary: 'Supprimer un step status' })
  @ApiParam({ name: 'status_id', example: '1' })
  remove(@Param('status_id') statusId: string) {
    return this.service.remove(this.parseId(statusId));
  }
}
