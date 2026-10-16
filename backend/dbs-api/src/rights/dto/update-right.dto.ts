import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateRightDto {
  @ApiProperty({
    example: 'Peut exporter les donnees',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'X-DBS-GUI',
    required: false,
  })
  @IsString()
  @IsOptional()
  module?: string | null;
}
