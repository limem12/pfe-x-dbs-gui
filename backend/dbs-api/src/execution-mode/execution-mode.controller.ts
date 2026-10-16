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
import { CreateExecutionModeDto } from './dto/create-execution-mode.dto';
import { UpdateExecutionModeDto } from './dto/update-execution-mode.dto';
import { ExecutionModeService } from './execution-mode.service';

@ApiTags('execution-mode')
@Controller('execution-mode')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class ExecutionModeController {
  constructor(private readonly service: ExecutionModeService) {}

  private parseId(value: string): number {
    const id = parseInt(value, 10);
    if (Number.isNaN(id)) {
      throw new BadRequestException("L'ID doit etre un nombre");
    }
    return id;
  }

  @Get()
  @ApiOperation({ summary: "Recuperer tous les modes d'execution" })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: "Recuperer un mode d'execution par ID" })
  @ApiParam({ name: 'id', example: '1' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(this.parseId(id));
  }

  @Post()
  @ApiOperation({ summary: "Creer un mode d'execution" })
  @ApiBody({ type: CreateExecutionModeDto })
  create(@Body() dto: CreateExecutionModeDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: "Modifier un mode d'execution" })
  @ApiParam({ name: 'id', example: '1' })
  @ApiBody({ type: UpdateExecutionModeDto })
  update(@Param('id') id: string, @Body() dto: UpdateExecutionModeDto) {
    return this.service.update(this.parseId(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Supprimer un mode d'execution" })
  @ApiParam({ name: 'id', example: '1' })
  remove(@Param('id') id: string) {
    return this.service.remove(this.parseId(id));
  }
}
