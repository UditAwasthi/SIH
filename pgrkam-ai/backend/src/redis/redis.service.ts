import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | undefined;

  private getClient(): Redis | undefined {
    let redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return undefined;
    }

    // Upstash requires TLS; accept redis:// in .env and upgrade automatically.
    if (redisUrl.includes("upstash.io") && redisUrl.startsWith("redis://")) {
      redisUrl = redisUrl.replace(/^redis:\/\//, "rediss://");
    }

    if (!this.client) {
      this.client = new Redis(redisUrl, {
        connectTimeout: 5_000,
        enableOfflineQueue: false,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        tls: redisUrl.startsWith("rediss://") ? {} : undefined,
      });
      this.client.on("error", (error: Error) => {
        this.logger.debug(`Redis connection unavailable: ${error.message}`);
      });
    }

    return this.client;
  }

  async isReachable(): Promise<boolean> {
    const client = this.getClient();
    if (!client) {
      return false;
    }

    try {
      if (client.status === "wait") {
        await client.connect();
      }
      return (await client.ping()) === "PONG";
    } catch {
      return false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const client = this.getClient();
    if (!client) return null;
    try { const value = await client.get(key); return value ? (JSON.parse(value) as T) : null; } catch { return null; }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const client = this.getClient();
    if (!client) return;
    try { await client.set(key, JSON.stringify(value), "EX", ttlSeconds); } catch { /* cache is optional */ }
  }

  async consume(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const client = this.getClient();
    if (!client) return true;
    try { const count = await client.incr(key); if (count === 1) await client.expire(key, windowSeconds); return count <= limit; } catch { return true; }
  }

  async onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }
}
