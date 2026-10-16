import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateExecutionModeDto {
  @ApiProperty({ example: 'PROD', description: 'Nom du mode' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Mode production standard', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
