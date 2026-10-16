import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateComponentInstanceDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  product_id: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  step_id: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  instance_index: number;

  @ApiProperty({ example: 'R1' })
  @IsString()
  @MaxLength(100)
  instance_name: string;

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
