import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { AuthModule } from "../auth/auth.module";
import { JobsModule } from "../jobs/jobs.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { NavigationModule } from "../navigation/navigation.module";
import { RecommendationsModule } from "../recommendations/recommendations.module";
import { SchemesModule } from "../schemes/schemes.module";
import { ChatController } from "./chat.controller";

@Module({
  imports: [
    AuthModule,
    AiModule,
    KnowledgeModule,
    NavigationModule,
    JobsModule,
    SchemesModule,
    RecommendationsModule,
  ],
  controllers: [ChatController],
})
export class ChatModule {}
