import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateStepParamDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  step_id: number;

  @ApiProperty({ example: 'timeout_ms' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  param_name: string;

  @ApiProperty({ example: 'int', enum: ['float', 'int', 'string', 'boolean'] })
  @IsString()
  @IsIn(['float', 'int', 'string', 'boolean'])
  param_type: 'float' | 'int' | 'string' | 'boolean';

  @ApiProperty({ example: '1000', required: false })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  default_value?: string;
}
