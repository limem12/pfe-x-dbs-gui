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
import { CreateProductStatusDto } from './dto/create-product-status.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { ProductStatusService } from './product-status.service';

@ApiTags('product-status')
@Controller('product-status')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProductStatusController {
  constructor(private readonly service: ProductStatusService) {}

  private parseId(value: string): number {
    const id = parseInt(value, 10);

    if (Number.isNaN(id)) {
      throw new BadRequestException("L'ID doit etre un nombre");
    }

    return id;
  }

  @Get()
  @ApiOperation({ summary: 'Recuperer tous les statuts produits' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':status_id')
  @ApiOperation({ summary: 'Recuperer un statut produit par ID' })
  @ApiParam({ name: 'status_id', example: '1' })
  findOne(@Param('status_id') statusId: string) {
    return this.service.findOne(this.parseId(statusId));
  }

  @Post()
  @ApiOperation({ summary: 'Creer un statut produit' })
  @ApiBody({ type: CreateProductStatusDto })
  create(@Body() dto: CreateProductStatusDto) {
    return this.service.create(dto);
  }

  @Put(':status_id')
  @ApiOperation({ summary: 'Modifier un statut produit' })
  @ApiParam({ name: 'status_id', example: '1' })
  @ApiBody({ type: UpdateProductStatusDto })
  update(
    @Param('status_id') statusId: string,
    @Body() dto: UpdateProductStatusDto,
  ) {
    return this.service.update(this.parseId(statusId), dto);
  }

  @Delete(':status_id')
  @ApiOperation({ summary: 'Supprimer un statut produit' })
  @ApiParam({ name: 'status_id', example: '1' })
  remove(@Param('status_id') statusId: string) {
    return this.service.remove(this.parseId(statusId));
  }
}
