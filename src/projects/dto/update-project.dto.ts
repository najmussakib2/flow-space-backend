/* eslint-disable prettier/prettier */
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { ProjectStatus } from "generated/prisma/enums";

export class UpdateProjectDto {
  @ApiProperty() @IsOptional() @IsString() name?: string;
  @ApiProperty() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsOptional() @IsString() icon?: string;
  @ApiProperty() @IsOptional() @IsString() color?: string;
  @ApiProperty() @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
}