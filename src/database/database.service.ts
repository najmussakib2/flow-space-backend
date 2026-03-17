/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import config from 'config';

@Injectable()
export class DatabaseService extends PrismaClient {
constructor() {
    // Parse connection string (dotenv already loaded)
    const connectionString = config.database_url;

    if (!connectionString) {
      throw new Error('DATABASE_URL not set!');
    }

    // Explicit Pool with higher timeouts for Neon cold starts
    const pool = new Pool({
      connectionString,
      max: 15,                       // adjust: Neon free tier limit ~20–30; don't exceed
      min: 0,                        // allow scaling down
      idleTimeoutMillis: 30000,      // close idle after 30s
      connectionTimeoutMillis: 30000, // 30s for initial connect (key for cold start)
      // Optional: statement_timeout: 30000, // per-query timeout if needed
    });

    const adapter = new PrismaPg(pool);

    super({ adapter });
  }
}
