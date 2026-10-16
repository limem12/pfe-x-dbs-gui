import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class CreateProductSequenceDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  product_id: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  sequence_id: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  order_index: number;
}
