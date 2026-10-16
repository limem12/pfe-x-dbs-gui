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
import { CreateStepParamDto } from './dto/create-step-param.dto';
import { UpdateStepParamDto } from './dto/update-step-param.dto';
import { StepParamService } from './step-param.service';

@ApiTags('step-param')
@Controller('step-param')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class StepParamController {
  constructor(private readonly service: StepParamService) {}

  private parseId(value: string): number {
    const id = parseInt(value, 10);
    if (Number.isNaN(id)) {
      throw new BadRequestException("L'ID doit etre un nombre");
    }
    return id;
  }

  @Get()
  @ApiOperation({ summary: 'Recuperer tous les parametres de step' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Recuperer un parametre de step par ID' })
  @ApiParam({ name: 'id', example: '1' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(this.parseId(id));
  }

  @Post()
  @ApiOperation({ summary: 'Creer un parametre de step' })
  @ApiBody({ type: CreateStepParamDto })
  create(@Body() dto: CreateStepParamDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un parametre de step' })
  @ApiParam({ name: 'id', example: '1' })
  @ApiBody({ type: UpdateStepParamDto })
  update(@Param('id') id: string, @Body() dto: UpdateStepParamDto) {
    return this.service.update(this.parseId(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un parametre de step' })
  @ApiParam({ name: 'id', example: '1' })
  remove(@Param('id') id: string) {
    return this.service.remove(this.parseId(id));
  }
}
