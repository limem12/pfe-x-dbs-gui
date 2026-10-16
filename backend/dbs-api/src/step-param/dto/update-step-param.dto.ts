import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStepParamDto {
  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @IsOptional()
  step_id?: number;

  @ApiProperty({ required: false })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  param_name?: string;

  @ApiProperty({ required: false, enum: ['float', 'int', 'string', 'boolean'] })
  @IsString()
  @IsIn(['float', 'int', 'string', 'boolean'])
  @IsOptional()
  param_type?: 'float' | 'int' | 'string' | 'boolean';

  @ApiProperty({ required: false, nullable: true })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  default_value?: string | null;
}
