/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GetUploadUrlDto {
  @ApiProperty() @IsString() filename: string;
  @ApiProperty() @IsString() mimeType: string;
  @ApiProperty() @IsString() taskId: string;
}