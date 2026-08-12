import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async check() {
    const [databaseReachable, redisReachable] = await Promise.all([
      this.prisma.isReachable(),
      this.redis.isReachable(),
    ]);

    return {
      status: "ok",
      dependencies: {
        database: process.env.DATABASE_URL ? (databaseReachable ? "reachable" : "unreachable") : "unconfigured",
        redis: process.env.REDIS_URL ? (redisReachable ? "reachable" : "unreachable") : "unconfigured",
      },
    };
  }
}
