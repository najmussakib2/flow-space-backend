/* eslint-disable prettier/prettier */
import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class SummarizeDto { 
    @ApiProperty() @IsString() content: string; 
}
export class GenerateSubtasksDto { 
    @ApiProperty() @IsString() taskTitle: string; 
    @ApiProperty() @IsOptional() @IsString() taskDescription?: string; 
}
export class ChatDto { 
    @ApiProperty() @IsString() message: string; 
    @ApiProperty() @IsOptional() @IsString() context?: string; 
}