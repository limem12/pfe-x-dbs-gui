import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateProductExecutionConfigDto {
  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @IsOptional()
  product_id?: number;

  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @IsOptional()
  execution_mode_id?: number;

  @ApiProperty({ required: false, example: 1, nullable: true })
  @IsInt()
  @IsOptional()
  sequence_id?: number | null;

  @ApiProperty({ required: false, example: 1, nullable: true })
  @IsInt()
  @IsOptional()
  step_id?: number | null;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  ignore_fail?: boolean;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  retry_on_fail?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  repeat_count?: number;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  retry_delay_ms?: number;
}
