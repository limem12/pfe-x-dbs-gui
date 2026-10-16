import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ParamDto {
  @ApiProperty({ required: false, example: 'p1' })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ example: 'tension_min' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom du paramètre est requis' })
  name: string;

  @ApiProperty({
    enum: ['', 'String', 'Integer', 'Float', 'Boolean', 'Array'],
    example: 'Float',
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ example: '11.5' })
  @IsString()
  @IsOptional()
  value?: string;
}

export class CreateStepDto {
  @ApiProperty({ example: 'Vérification Tension' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom du step est requis' })
  name: string;

  @ApiProperty({ required: false, example: "Vérifie la tension d'entrée" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, example: 1, nullable: true })
  @IsInt()
  @IsOptional()
  dependsOn?: number | null;

  @ApiProperty({ type: [ParamDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ParamDto)
  params?: ParamDto[];

  @ApiProperty({ required: false, example: 'Admin' })
  @IsString()
  @IsOptional()
  auditUser?: string;
}
