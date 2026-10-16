import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class CreateSequenceStepDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  sequence_id: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  step_id: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  order_index: number;
}
