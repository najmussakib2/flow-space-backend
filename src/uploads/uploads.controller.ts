/* eslint-disable prettier/prettier */
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { GetUploadUrlDto } from './dto/uploads.dto';

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('presigned-url')
  getPresignedUrl(@Body() dto: GetUploadUrlDto) {
    return this.uploadsService.getPresignedUrl(dto.filename, dto.mimeType, dto.taskId);
  }
}