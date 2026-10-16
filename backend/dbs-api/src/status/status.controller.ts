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
import { CreateStatusDto } from './dto/create-status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { StatusService } from './status.service';

@ApiTags('status')
@Controller('status')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class StatusController {
  constructor(private readonly service: StatusService) {}

  private parseId(value: string): number {
    const id = parseInt(value, 10);

    if (Number.isNaN(id)) {
      throw new BadRequestException("L'ID doit etre un nombre");
    }

    return id;
  }

  @Get()
  @ApiOperation({ summary: 'Recuperer tous les status' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Recuperer un status par ID' })
  @ApiParam({ name: 'id', example: '1' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(this.parseId(id));
  }

  @Post()
  @ApiOperation({ summary: 'Creer un status' })
  @ApiBody({ type: CreateStatusDto })
  create(@Body() dto: CreateStatusDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un status' })
  @ApiParam({ name: 'id', example: '1' })
  @ApiBody({ type: UpdateStatusDto })
  update(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.service.update(this.parseId(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un status' })
  @ApiParam({ name: 'id', example: '1' })
  remove(@Param('id') id: string) {
    return this.service.remove(this.parseId(id));
  }
}
