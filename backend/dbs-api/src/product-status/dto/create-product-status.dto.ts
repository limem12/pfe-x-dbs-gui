import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateProductStatusDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  product_id: number;

  @ApiProperty({ example: 'ABC123456', required: false })
  @IsString()
  @MaxLength(45)
  @IsOptional()
  barcode?: string;

  @ApiProperty({ example: 12.5, required: false })
  @IsNumber()
  @IsOptional()
  duration?: number;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  failed?: boolean;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @IsOptional()
  mode_id?: number;
}
