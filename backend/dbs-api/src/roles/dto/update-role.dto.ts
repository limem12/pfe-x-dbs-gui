import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateRoleDto {
  @ApiProperty({ example: 'Superviseur de ligne', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: ['VIEW_DATA', 'EDIT_SEQUENCE'], required: false })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsOptional()
  rights?: string[];
}
