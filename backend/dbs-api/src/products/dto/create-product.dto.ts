import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProductParamDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  value?: string;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom du produit est requis' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProductParamDto)
  params?: ProductParamDto[];

  @IsArray()
  @IsOptional()
  preuutStepIds?: string[];

  @IsArray()
  @IsOptional()
  sequenceIds?: string[];

  @IsArray()
  @IsOptional()
  postuutStepIds?: string[];
}
