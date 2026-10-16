import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateStepStatusDto {
  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @IsOptional()
  product_id?: number;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @IsOptional()
  test_id?: number;

  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @IsOptional()
  parameter_id?: number;

  @ApiProperty({ example: 3, required: false })
  @IsInt()
  @IsOptional()
  vtype?: number;

  @ApiProperty({ example: 12.5, required: false })
  @IsNumber()
  @IsOptional()
  dvalue?: number;

  @ApiProperty({ example: 42, required: false })
  @IsInt()
  @IsOptional()
  ivalue?: number;

  @ApiProperty({ example: 'OK', required: false })
  @IsString()
  @MaxLength(45)
  @IsOptional()
  svalue?: string;
}
