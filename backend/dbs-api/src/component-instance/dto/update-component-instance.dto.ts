import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateComponentInstanceDto {
  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @IsOptional()
  product_id?: number;

  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @IsOptional()
  step_id?: number;

  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @IsOptional()
  instance_index?: number;

  @ApiProperty({ required: false, example: 'R1' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  instance_name?: string;

  @ApiProperty({ required: false, example: 'Resistance pull-up' })
  @IsString()
  @IsOptional()
  description?: string | null;

  @ApiProperty({ required: false, example: 'U1.R1' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  physical_ref?: string | null;

  @ApiProperty({ required: false, example: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
