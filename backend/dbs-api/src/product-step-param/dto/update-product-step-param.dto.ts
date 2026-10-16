import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProductStepParamDto {
  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @IsOptional()
  product_id?: number;

  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @IsOptional()
  step_param_id?: number;

  @ApiProperty({ required: false, example: '42' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  value?: string;
}
