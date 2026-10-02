/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import config from '../../config';

@Injectable()
export class UploadsService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name:
        this.configService.get<string>('cloudinary.cloudName') ??
        config.cloudinary.cloudName,
      api_key:
        this.configService.get<string>('cloudinary.apiKey') ??
        config.cloudinary.apiKey,
      api_secret:
        this.configService.get<string>('cloudinary.apiSecret') ??
        config.cloudinary.apiSecret,
    });
  }

  async getPresignedUrl(filename: string, mimeType: string, taskId: string) {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = `flowspace/attachments/${taskId}`;

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      this.configService.get<string>('cloudinary.apiSecret') ??
        (config.cloudinary.apiSecret as string),
    );
    const cloudeName =
      (this.configService.get('cloudinary.cloudName') as string) ??
      config.cloudinary.cloudName;
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudeName}/auto/upload`,
      signature,
      timestamp,
      folder,
      apiKey:
        this.configService.get<string>('cloudinary.apiKey') ??
        config.cloudinary.apiKey,
    };
  }

  async deleteFile(publicId: string) {
    return cloudinary.uploader.destroy(publicId);
  }
}
