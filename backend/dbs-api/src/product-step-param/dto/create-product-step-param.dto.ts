import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateProductStepParamDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  product_id: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  step_param_id: number;

  @ApiProperty({ example: '42' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  value: string;
}
