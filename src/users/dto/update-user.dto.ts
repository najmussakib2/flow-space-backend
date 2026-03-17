/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'User name' }) @IsOptional() @IsString() @MinLength(2) name?: string;
  
  @ApiProperty({ example: 'https://example.com/avatar.jpg', description: 'User avatar URL' }) @IsOptional() @IsString() avatarUrl?: string;
}