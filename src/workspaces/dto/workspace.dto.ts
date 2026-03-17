/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsEnum, MinLength, MaxLength, Matches } from 'class-validator';
import { WorkspaceRole } from 'generated/prisma/enums';

export class CreateWorkspaceDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(50) name: string;
  
   @ApiProperty() @IsString() @Matches(/^[a-z0-9-]+$/) @MinLength(2) @MaxLength(50) slug: string;
}

export class UpdateWorkspaceDto {
  @ApiProperty() @IsOptional() @IsString() @MinLength(2) @MaxLength(50) name?: string;
  @ApiProperty() @IsOptional() @IsString() logoUrl?: string;
}

export class InviteMemberDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsEnum(WorkspaceRole) role: WorkspaceRole;
}