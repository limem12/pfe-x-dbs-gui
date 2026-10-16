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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { ComponentInstanceService } from './component-instance.service';
import { CreateComponentInstanceDto } from './dto/create-component-instance.dto';
import { UpdateComponentInstanceDto } from './dto/update-component-instance.dto';

@ApiTags('component-instance')
@Controller('component-instance')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class ComponentInstanceController {
  constructor(private readonly service: ComponentInstanceService) {}

  private parseId(value: string): number {
    const id = parseInt(value, 10);
    if (Number.isNaN(id)) throw new BadRequestException("L'ID doit etre un nombre");
    return id;
  }

  @Get()
  @ApiOperation({ summary: 'Recuperer les instances de composants' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Recuperer une instance de composant' })
  @ApiParam({ name: 'id', example: '1' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(this.parseId(id));
  }

  @Post()
  @ApiOperation({ summary: 'Creer une instance de composant' })
  @ApiBody({ type: CreateComponentInstanceDto })
  create(@Body() dto: CreateComponentInstanceDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier une instance de composant' })
  @ApiParam({ name: 'id', example: '1' })
  @ApiBody({ type: UpdateComponentInstanceDto })
  update(@Param('id') id: string, @Body() dto: UpdateComponentInstanceDto) {
    return this.service.update(this.parseId(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une instance de composant' })
  @ApiParam({ name: 'id', example: '1' })
  remove(@Param('id') id: string) {
    return this.service.remove(this.parseId(id));
  }
}
