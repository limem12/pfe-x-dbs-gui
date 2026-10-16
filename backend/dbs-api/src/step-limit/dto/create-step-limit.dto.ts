import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateStepLimitDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  step_id: number;

  @ApiProperty({ example: 'Voltage max' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  limit_name: string;

  @ApiProperty({ enum: ['PASS_FAIL', 'NUMERIC', 'STRING', 'BOOLEAN'] })
  @IsString()
  @IsIn(['PASS_FAIL', 'NUMERIC', 'STRING', 'BOOLEAN'])
  limit_type: 'PASS_FAIL' | 'NUMERIC' | 'STRING' | 'BOOLEAN';

  @ApiProperty({ enum: ['EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE', 'RANGE'] })
  @IsString()
  @IsIn(['EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE', 'RANGE'])
  comparison_type: 'EQ' | 'NEQ' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'RANGE';

  @ApiProperty({ example: '5', required: false })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  limit_value?: string;

  @ApiProperty({ example: '3.3', required: false })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  limit_min?: string;

  @ApiProperty({ example: '5', required: false })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  limit_max?: string;

  @ApiProperty({ example: 'V', required: false })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  unit?: string;
}
