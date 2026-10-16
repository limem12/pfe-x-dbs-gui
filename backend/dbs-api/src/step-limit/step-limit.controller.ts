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
import { CreateStepLimitDto } from './dto/create-step-limit.dto';
import { UpdateStepLimitDto } from './dto/update-step-limit.dto';
import { StepLimitService } from './step-limit.service';

@ApiTags('step-limit')
@Controller('step-limit')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class StepLimitController {
  constructor(private readonly service: StepLimitService) {}

  private parseId(value: string): number {
    const id = parseInt(value, 10);
    if (Number.isNaN(id)) {
      throw new BadRequestException("L'ID doit etre un nombre");
    }
    return id;
  }

  @Get()
  @ApiOperation({ summary: 'Recuperer toutes les limites de step' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Recuperer une limite de step par ID' })
  @ApiParam({ name: 'id', example: '1' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(this.parseId(id));
  }

  @Post()
  @ApiOperation({ summary: 'Creer une limite de step' })
  @ApiBody({ type: CreateStepLimitDto })
  create(@Body() dto: CreateStepLimitDto, @Req() req: AuthenticatedRequest) {
    return this.service.create(dto, req.user?.username);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier une limite de step' })
  @ApiParam({ name: 'id', example: '1' })
  @ApiBody({ type: UpdateStepLimitDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStepLimitDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.update(this.parseId(id), dto, req.user?.username);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une limite de step' })
  @ApiParam({ name: 'id', example: '1' })
  remove(@Param('id') id: string) {
    return this.service.remove(this.parseId(id));
  }
}
