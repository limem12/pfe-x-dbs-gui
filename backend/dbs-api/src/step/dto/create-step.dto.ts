import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateStepDto {
  @ApiProperty({ example: 'Init Systeme' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @IsOptional()
  depends_on?: number;

  @ApiProperty({ required: false, example: 'Admin' })
  @IsString()
  @IsOptional()
  auditUser?: string;
}
