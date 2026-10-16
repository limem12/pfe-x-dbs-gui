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
import { CreateProductStepLimitDto } from './dto/create-product-step-limit.dto';
import { UpdateProductStepLimitDto } from './dto/update-product-step-limit.dto';
import { ProductStepLimitService } from './product-step-limit.service';

@ApiTags('product-step-limit')
@Controller('product-step-limit')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProductStepLimitController {
  constructor(private readonly service: ProductStepLimitService) {}

  private parseId(value: string): number {
    const id = parseInt(value, 10);
    if (Number.isNaN(id)) throw new BadRequestException("L'ID doit etre un nombre");
    return id;
  }

  @Get()
  @ApiOperation({ summary: 'Recuperer les limites produit-step' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Recuperer une limite produit-step' })
  @ApiParam({ name: 'id', example: '1' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(this.parseId(id));
  }

  @Post()
  @ApiOperation({ summary: 'Creer une limite produit-step' })
  @ApiBody({ type: CreateProductStepLimitDto })
  create(@Body() dto: CreateProductStepLimitDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier une limite produit-step' })
  @ApiParam({ name: 'id', example: '1' })
  @ApiBody({ type: UpdateProductStepLimitDto })
  update(@Param('id') id: string, @Body() dto: UpdateProductStepLimitDto) {
    return this.service.update(this.parseId(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une limite produit-step' })
  @ApiParam({ name: 'id', example: '1' })
  remove(@Param('id') id: string) {
    return this.service.remove(this.parseId(id));
  }
}
