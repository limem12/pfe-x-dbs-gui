import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

export class UpdateSequenceStepDto {
  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @IsOptional()
  sequence_id?: number;

  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @IsOptional()
  step_id?: number;

  @ApiProperty({ required: false, example: 1 })
  @IsInt()
  @IsOptional()
  order_index?: number;
}
