import { Controller, Get, Res } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { join } from 'path';
import type { Response } from 'express';

@Controller()
export class AppController {
  @Public()
  @Get()
  root(@Res() res: Response) {
    res.sendFile(join(__dirname, '..', 'public', 'index.html'));
  }

  @Public()
  @Get('health')
  health() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
