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
import { CreateSequenceStepDto } from './dto/create-sequence-step.dto';
import { UpdateSequenceStepDto } from './dto/update-sequence-step.dto';
import { SequenceStepService } from './sequence-step.service';

@ApiTags('sequence-step')
@Controller('sequence-step')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class SequenceStepController {
  constructor(private readonly service: SequenceStepService) {}

  private parseId(value: string): number {
    const id = parseInt(value, 10);
    if (Number.isNaN(id)) {
      throw new BadRequestException("L'ID doit etre un nombre");
    }
    return id;
  }

  @Get()
  @ApiOperation({ summary: 'Recuperer les associations sequence-step' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Recuperer une association sequence-step par ID' })
  @ApiParam({ name: 'id', example: '1' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(this.parseId(id));
  }

  @Post()
  @ApiOperation({ summary: 'Creer une association sequence-step' })
  @ApiBody({ type: CreateSequenceStepDto })
  create(@Body() dto: CreateSequenceStepDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier une association sequence-step' })
  @ApiParam({ name: 'id', example: '1' })
  @ApiBody({ type: UpdateSequenceStepDto })
  update(@Param('id') id: string, @Body() dto: UpdateSequenceStepDto) {
    return this.service.update(this.parseId(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une association sequence-step' })
  @ApiParam({ name: 'id', example: '1' })
  remove(@Param('id') id: string) {
    return this.service.remove(this.parseId(id));
  }
}
