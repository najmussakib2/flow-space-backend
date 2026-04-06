/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import config from 'config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client: Redis;

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        const redisUrl = this.configService.get<string>('redis.url') ?? config.redisUrl ?? 'redis://redis:6379';

        this.client = new Redis(redisUrl, {
            retryStrategy: (times) => Math.min(times * 50, 2000),
        });
        this.client.on('connect', () => this.logger.log('Redis connected'));
        this.client.on('error', (err) => this.logger.error('Redis error', err));
    }

    async onModuleDestroy() {
        await this.client.quit();
    }

    async get(key: string) { return this.client.get(key); }
    async set(key: string, value: string, ttl?: number) {
        ttl ? await this.client.setex(key, ttl, value) : await this.client.set(key, value);
    }
    async del(key: string) { await this.client.del(key); }
    async sadd(key: string, ...members: string[]) { await this.client.sadd(key, ...members); }
    async srem(key: string, ...members: string[]) { await this.client.srem(key, ...members); }
    async smembers(key: string) { return this.client.smembers(key); }
    async keys(pattern: string) { return this.client.keys(pattern); }

    async getJson<T>(key: string): Promise<T | null> {
        const val = await this.get(key);
        return val ? JSON.parse(val) : null;
    }
    async setJson<T>(key: string, value: T, ttl?: number) {
        await this.set(key, JSON.stringify(value), ttl);
    }

    // Presence helpers
    async setUserOnline(userId: string, socketId: string) {
        await this.set(`socket:${socketId}`, userId, 86400);
        await this.sadd(`user:${userId}:sockets`, socketId);
        await this.set(`user:${userId}:online`, '1', 3600);
    }

    async setUserOffline(socketId: string): Promise<string | null> {
        const userId = await this.get(`socket:${socketId}`);
        if (userId) {
            await this.del(`socket:${socketId}`);
            await this.srem(`user:${userId}:sockets`, socketId);
            const remaining = await this.smembers(`user:${userId}:sockets`);
            if (remaining.length === 0) await this.del(`user:${userId}:online`);
        }
        return userId;
    }

    async getUserSockets(userId: string) { return this.smembers(`user:${userId}:sockets`); }
    async isUserOnline(userId: string) {
        return (await this.get(`user:${userId}:online`)) === '1';
    }
}