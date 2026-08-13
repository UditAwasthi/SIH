import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { KnowledgeService } from "./knowledge.service";
@Module({ imports: [AiModule], providers: [KnowledgeService], exports: [KnowledgeService] }) export class KnowledgeModule {}
