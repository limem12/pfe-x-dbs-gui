import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStepLimitDto {
  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  step_id?: number;

  @ApiProperty({ required: false })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  limit_name?: string;

  @ApiProperty({
    required: false,
    enum: ['PASS_FAIL', 'NUMERIC', 'STRING', 'BOOLEAN'],
  })
  @IsString()
  @IsIn(['PASS_FAIL', 'NUMERIC', 'STRING', 'BOOLEAN'])
  @IsOptional()
  limit_type?: 'PASS_FAIL' | 'NUMERIC' | 'STRING' | 'BOOLEAN';

  @ApiProperty({
    required: false,
    enum: ['EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE', 'RANGE'],
  })
  @IsString()
  @IsIn(['EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE', 'RANGE'])
  @IsOptional()
  comparison_type?: 'EQ' | 'NEQ' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'RANGE';

  @ApiProperty({ required: false, nullable: true })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  limit_value?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  limit_min?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  limit_max?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  unit?: string | null;
}
