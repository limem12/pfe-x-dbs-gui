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
import { CreateProductCounterDto } from './dto/create-product-counter.dto';
import { UpdateProductCounterDto } from './dto/update-product-counter.dto';
import { ProductCounterService } from './product-counter.service';

@ApiTags('product-counter')
@Controller('product-counter')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProductCounterController {
  constructor(private readonly service: ProductCounterService) {}

  private parseId(value: string): number {
    const id = parseInt(value, 10);

    if (Number.isNaN(id)) {
      throw new BadRequestException("L'ID doit etre un nombre");
    }

    return id;
  }

  @Get()
  @ApiOperation({ summary: 'Recuperer tous les compteurs produits' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':product_id')
  @ApiOperation({ summary: 'Recuperer un compteur produit par ID' })
  @ApiParam({ name: 'product_id', example: '1' })
  findOne(@Param('product_id') productId: string) {
    return this.service.findOne(this.parseId(productId));
  }

  @Post()
  @ApiOperation({ summary: 'Creer un compteur produit' })
  @ApiBody({ type: CreateProductCounterDto })
  create(@Body() dto: CreateProductCounterDto) {
    return this.service.create(dto);
  }

  @Put(':product_id')
  @ApiOperation({ summary: 'Modifier un compteur produit' })
  @ApiParam({ name: 'product_id', example: '1' })
  @ApiBody({ type: UpdateProductCounterDto })
  update(
    @Param('product_id') productId: string,
    @Body() dto: UpdateProductCounterDto,
  ) {
    return this.service.update(this.parseId(productId), dto);
  }

  @Delete(':product_id')
  @ApiOperation({ summary: 'Supprimer un compteur produit' })
  @ApiParam({ name: 'product_id', example: '1' })
  remove(@Param('product_id') productId: string) {
    return this.service.remove(this.parseId(productId));
  }
}
