import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { resolve } from "node:path";

import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { JobsModule } from "./jobs/jobs.module";
import { SchemesModule } from "./schemes/schemes.module";
import { ProfileModule } from "./profile/profile.module";
import { RecommendationsModule } from "./recommendations/recommendations.module";
import { ChatModule } from "./chat/chat.module";
import { AiModule } from "./ai/ai.module";
import { KnowledgeModule } from "./knowledge/knowledge.module";
import { NavigationModule } from "./navigation/navigation.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { MailModule } from "./services/mail.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(process.cwd(), ".env"), resolve(process.cwd(), "..", ".env")],
    }),
    PrismaModule,
    RedisModule,
    MailModule,
    HealthModule,
    AuthModule,
    JobsModule,
    SchemesModule,
    ProfileModule,
    RecommendationsModule,
    ChatModule,
    AiModule,
    KnowledgeModule,
    NavigationModule,
  ],
})
export class AppModule {}
