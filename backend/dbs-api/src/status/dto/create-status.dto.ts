import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsInt, IsOptional } from 'class-validator';

export class CreateStatusDto {
  @ApiProperty({ example: 1, required: false })
  @IsInt()
  @IsOptional()
  item_id?: number;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  terminated?: boolean;

  @ApiProperty({ example: '2026-06-03T10:00:00.000Z', required: false })
  @IsDateString()
  @IsOptional()
  started_at?: string;

  @ApiProperty({ example: '2026-06-03T10:15:00.000Z', required: false })
  @IsDateString()
  @IsOptional()
  ended_at?: string;
}
