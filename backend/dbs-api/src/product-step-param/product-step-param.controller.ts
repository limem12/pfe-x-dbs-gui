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
import { CreateProductStepParamDto } from './dto/create-product-step-param.dto';
import { UpdateProductStepParamDto } from './dto/update-product-step-param.dto';
import { ProductStepParamService } from './product-step-param.service';

@ApiTags('product-step-param')
@Controller('product-step-param')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProductStepParamController {
  constructor(private readonly service: ProductStepParamService) {}

  private parseId(value: string): number {
    const id = parseInt(value, 10);
    if (Number.isNaN(id)) {
      throw new BadRequestException("L'ID doit etre un nombre");
    }
    return id;
  }

  @Get()
  @ApiOperation({ summary: 'Recuperer les parametres produit-step' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Recuperer un parametre produit-step par ID' })
  @ApiParam({ name: 'id', example: '1' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(this.parseId(id));
  }

  @Post()
  @ApiOperation({ summary: 'Creer un parametre produit-step' })
  @ApiBody({ type: CreateProductStepParamDto })
  create(@Body() dto: CreateProductStepParamDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un parametre produit-step' })
  @ApiParam({ name: 'id', example: '1' })
  @ApiBody({ type: UpdateProductStepParamDto })
  update(@Param('id') id: string, @Body() dto: UpdateProductStepParamDto) {
    return this.service.update(this.parseId(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un parametre produit-step' })
  @ApiParam({ name: 'id', example: '1' })
  remove(@Param('id') id: string) {
    return this.service.remove(this.parseId(id));
  }
}
