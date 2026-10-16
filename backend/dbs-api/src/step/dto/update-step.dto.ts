import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStepDto {
  @ApiProperty({ required: false })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, example: 1, nullable: true })
  @IsInt()
  @IsOptional()
  depends_on?: number | null;

  @ApiProperty({ required: false, example: 'Admin' })
  @IsString()
  @IsOptional()
  auditUser?: string;
}
