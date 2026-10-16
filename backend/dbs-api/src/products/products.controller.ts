import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import {
  canAccessProducts,
  canManageProducts,
  type AuthenticatedRequest,
} from '../auth/permissions';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './product.interface';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  private assertCanAccessProducts(req: AuthenticatedRequest) {
    if (!canAccessProducts(req.user)) {
      throw new ForbiddenException(
        'Droits insuffisants pour consulter les produits',
      );
    }
  }

  private assertCanManageProducts(req: AuthenticatedRequest) {
    if (!canManageProducts(req.user)) {
      throw new ForbiddenException(
        'Droits insuffisants pour gerer les produits',
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Recuperer tous les produits' })
  @ApiResponse({ status: 200, description: 'Liste des produits retournee' })
  @ApiResponse({ status: 403, description: 'Droits insuffisants' })
  findAll(@Req() req: AuthenticatedRequest): Promise<Product[]> {
    this.assertCanAccessProducts(req);
    return this.productsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Recuperer un produit par son ID' })
  @ApiParam({ name: 'id', description: 'ID du produit', example: '1' })
  @ApiResponse({ status: 200, description: 'Produit trouve' })
  @ApiResponse({ status: 404, description: 'Produit non trouve' })
  async findOne(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Product> {
    this.assertCanAccessProducts(req);

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException("L'ID doit etre un nombre");
    }

    return this.productsService.findOne(numericId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Creer un nouveau produit' })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201, description: 'Produit cree avec succes' })
  @ApiResponse({ status: 400, description: 'Donnees invalides' })
  @ApiResponse({ status: 403, description: 'Droits insuffisants' })
  create(
    @Body() dto: CreateProductDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Product> {
    this.assertCanManageProducts(req);
    return this.productsService.create(
      dto,
      req.user?.username,
      req.user?.username,
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un produit existant' })
  @ApiParam({ name: 'id', description: 'ID du produit', example: '1' })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({ status: 200, description: 'Produit modifie avec succes' })
  @ApiResponse({ status: 404, description: 'Produit non trouve' })
  @ApiResponse({ status: 403, description: 'Droits insuffisants' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Product> {
    this.assertCanManageProducts(req);

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException("L'ID doit etre un nombre");
    }

    return this.productsService.update(
      numericId,
      dto,
      req.user?.username,
      req.user?.username,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un produit' })
  @ApiParam({ name: 'id', description: 'ID du produit', example: '1' })
  @ApiResponse({ status: 200, description: 'Produit supprime avec succes' })
  @ApiResponse({ status: 404, description: 'Produit non trouve' })
  @ApiResponse({ status: 403, description: 'Droits insuffisants' })
  async remove(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    this.assertCanManageProducts(req);

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new BadRequestException("L'ID doit etre un nombre");
    }

    return this.productsService.remove(
      numericId,
      req.user?.username,
      req.user?.username,
    );
  }
}
