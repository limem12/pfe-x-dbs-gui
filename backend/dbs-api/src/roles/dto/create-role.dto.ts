import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'SUPERVISOR' })
  @IsString()
  @IsNotEmpty()
  id_role: string;

  @ApiProperty({ example: 'Superviseur de ligne' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: ['VIEW_DATA', 'EDIT_SEQUENCE'] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  rights: string[];
}
