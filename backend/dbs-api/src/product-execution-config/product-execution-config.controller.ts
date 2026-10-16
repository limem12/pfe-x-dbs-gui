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
import { CreateProductExecutionConfigDto } from './dto/create-product-execution-config.dto';
import { UpdateProductExecutionConfigDto } from './dto/update-product-execution-config.dto';
import { ProductExecutionConfigService } from './product-execution-config.service';

@ApiTags('product-execution-config')
@Controller('product-execution-config')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProductExecutionConfigController {
  constructor(private readonly service: ProductExecutionConfigService) {}

  private parseId(value: string): number {
    const id = parseInt(value, 10);
    if (Number.isNaN(id)) {
      throw new BadRequestException("L'ID doit etre un nombre");
    }
    return id;
  }

  @Get()
  @ApiOperation({ summary: "Recuperer les configurations d'execution" })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: "Recuperer une configuration d'execution par ID" })
  @ApiParam({ name: 'id', example: '1' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(this.parseId(id));
  }

  @Post()
  @ApiOperation({ summary: "Creer une configuration d'execution" })
  @ApiBody({ type: CreateProductExecutionConfigDto })
  create(@Body() dto: CreateProductExecutionConfigDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: "Modifier une configuration d'execution" })
  @ApiParam({ name: 'id', example: '1' })
  @ApiBody({ type: UpdateProductExecutionConfigDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductExecutionConfigDto,
  ) {
    return this.service.update(this.parseId(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: "Supprimer une configuration d'execution" })
  @ApiParam({ name: 'id', example: '1' })
  remove(@Param('id') id: string) {
    return this.service.remove(this.parseId(id));
  }
}
