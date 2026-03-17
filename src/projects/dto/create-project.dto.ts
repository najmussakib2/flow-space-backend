/* eslint-disable prettier/prettier */
import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class CreateProjectDto {
  @ApiProperty() @IsString() workspaceId: string;
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsOptional() @IsString() description?: string;
  @ApiProperty() @IsOptional() @IsString() icon?: string;
  @ApiProperty() @IsOptional() @IsString() color?: string;
}