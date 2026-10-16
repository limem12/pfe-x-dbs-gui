import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProductStepLimitDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  component_instance_id: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  step_limit_id: number;

  @ApiProperty({ required: false, example: '5' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  limit_value?: string | null;

  @ApiProperty({ required: false, example: '4700' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  limit_min?: string | null;

  @ApiProperty({ required: false, example: '5100' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  limit_max?: string | null;

  @ApiProperty({ required: false, example: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @IsOptional()
  execution_mode_id?: number | null;
}
