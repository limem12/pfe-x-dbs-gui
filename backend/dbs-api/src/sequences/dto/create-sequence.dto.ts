import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateSequenceDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom de la séquence est requis' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  stepIds?: string[];
}
