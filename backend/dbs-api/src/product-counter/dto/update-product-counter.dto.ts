import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';

export class UpdateProductCounterDto {
  @ApiProperty({ example: 10, required: false })
  @IsInt()
  @IsOptional()
  count?: number;
}
