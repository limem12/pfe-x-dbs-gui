import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRightDto {
  @ApiProperty({ example: 'EXPORT_DATA' })
  @IsString()
  @IsNotEmpty()
  id_right: string;

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
