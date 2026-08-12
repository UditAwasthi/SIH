import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | undefined;

  private getClient(): Redis | undefined {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return undefined;
    }

    if (!this.client) {
      this.client = new Redis(redisUrl, {
        connectTimeout: 5_000,
        enableOfflineQueue: false,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
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

  async onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }
}
