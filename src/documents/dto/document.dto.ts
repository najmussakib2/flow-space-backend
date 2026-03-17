/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty() @IsString() projectId: string;
  @ApiProperty() @IsOptional() @IsString() title?: string;
}

export class UpdateDocumentDto {
  @ApiProperty() @IsOptional() @IsString() title?: string;
  @ApiProperty() @IsOptional() content?: any;
  @ApiProperty() @IsOptional() @IsBoolean() isPublic?: boolean;
}