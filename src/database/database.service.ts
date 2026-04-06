/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import config from 'config';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;

  constructor() {
    const connectionString = config.database_url;

    if (!connectionString) {
      throw new Error('DATABASE_URL not set!');
    }

    const pool = new Pool({
      connectionString,
      max: 15,
      min: 0,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });

    // Save pool reference so we can test it in onModuleInit
    this.pool = pool;
  }

  async onModuleInit() {
    // Eagerly test the connection so we fail loudly if DB is down
    try {
      const client = await this.pool.connect();
      client.release();
      this.logger.log('✅ Database connected');
    } catch (err) {
      this.logger.error('❌ Database connection failed', err);
      process.exit(1); // Crash the app just like Redis does
    }

    await this.$connect();
  }
}
