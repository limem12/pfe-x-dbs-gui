import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: 'john_doe', required: false })
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: "Le nom d'utilisateur ne peut pas etre vide" })
  username?: string;

  @ApiProperty({ example: 'newPassword123', required: false })
  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Le mot de passe ne peut pas etre vide' })
  @MinLength(6, {
    message: 'Le mot de passe doit contenir au moins 6 caracteres',
  })
  password?: string;

  @ApiProperty({ example: 'USER', required: false })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiProperty({ example: 'user@example.com', required: false })
  @IsEmail({}, { message: "L'email est invalide" })
  @IsOptional()
  email?: string | null;

  @ApiProperty({ example: '0612345678', required: false })
  @IsString()
  @IsOptional()
  phone?: string | null;

  @ApiProperty({
    example: '12 Rue de Paris, 75000 Paris',
    required: false,
  })
  @IsString()
  @IsOptional()
  address?: string | null;

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  avatar?: string | null;

  @ApiProperty({
    example: 'ENABLED',
    required: false,
    enum: ['ENABLED', 'DISABLED'],
  })
  @IsString()
  @IsOptional()
  @IsIn(['ENABLED', 'DISABLED'])
  status?: 'ENABLED' | 'DISABLED';
}

