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
import { CreateProductSequenceDto } from './dto/create-product-sequence.dto';
import { UpdateProductSequenceDto } from './dto/update-product-sequence.dto';
import { ProductSequenceService } from './product-sequence.service';

@ApiTags('product-sequence')
@Controller('product-sequence')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProductSequenceController {
  constructor(private readonly service: ProductSequenceService) {}

  private parseId(value: string): number {
    const id = parseInt(value, 10);
    if (Number.isNaN(id)) {
      throw new BadRequestException("L'ID doit etre un nombre");
    }
    return id;
  }

  @Get()
  @ApiOperation({ summary: 'Recuperer les associations produit-sequence' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Recuperer une association produit-sequence par ID',
  })
  @ApiParam({ name: 'id', example: '1' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(this.parseId(id));
  }

  @Post()
  @ApiOperation({ summary: 'Creer une association produit-sequence' })
  @ApiBody({ type: CreateProductSequenceDto })
  create(@Body() dto: CreateProductSequenceDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier une association produit-sequence' })
  @ApiParam({ name: 'id', example: '1' })
  @ApiBody({ type: UpdateProductSequenceDto })
  update(@Param('id') id: string, @Body() dto: UpdateProductSequenceDto) {
    return this.service.update(this.parseId(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une association produit-sequence' })
  @ApiParam({ name: 'id', example: '1' })
  remove(@Param('id') id: string) {
    return this.service.remove(this.parseId(id));
  }
}
