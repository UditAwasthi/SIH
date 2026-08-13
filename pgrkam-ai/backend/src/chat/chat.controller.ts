import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { AiService } from "../ai/ai.service";
import { AuthService } from "../auth/auth.service";
import { JobsService } from "../jobs/jobs.service";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { NavigationService } from "../navigation/navigation.service";
import { PrismaService } from "../prisma/prisma.service";
import { RecommendationsService } from "../recommendations/recommendations.service";
import { RedisService } from "../redis/redis.service";
import { SchemesService } from "../schemes/schemes.service";

@ApiTags("chat")
@ApiBearerAuth()
@Controller("chat")
export class ChatController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly knowledge: KnowledgeService,
    private readonly jobs: JobsService,
    private readonly schemes: SchemesService,
    private readonly navigation: NavigationService,
    private readonly recommendations: RecommendationsService,
    private readonly redis: RedisService,
  ) {}

  @Post("message")
  async message(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { conversationId?: string; content: string },
  ) {
    const user = await this.auth.userFromHeader(authorization);
    if (!body.content?.trim()) {
      throw new BadRequestException("Message content is required.");
    }

    if (!(await this.redis.consume(`rate:chat:${user.id}`, 20, 60))) {
      throw new HttpException("Please wait before sending another message.", HttpStatus.TOO_MANY_REQUESTS);
    }

    const conversation = body.conversationId
      ? await this.prisma.conversation.findFirst({
          where: { id: body.conversationId, userId: user.id },
        })
      : await this.prisma.conversation.create({ data: { userId: user.id } });

    if (!conversation) {
      throw new NotFoundException("Conversation not found.");
    }

    const intent = await this.ai.classify(body.content);
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: body.content,
        detectedLanguage: intent.language,
        intent: intent.intent,
        entities: intent.entities as Prisma.InputJsonValue,
      },
    });

    let content: string;
    let jobs: unknown[] = [];
    let recommendations: unknown[] = [];
    let sources: Array<{ sourceUrl: string; lastCrawledAt?: Date | string }> = [];

    if (intent.confidence < 0.55) {
      content = this.ai.clarifyingQuestion(intent.language);
    } else if (intent.intent === "GREETING") {
      content = this.ai.greeting(intent.language);
    } else if (intent.intent === "HELP") {
      content = this.ai.help(intent.language);
    } else if (intent.intent === "JOB_SEARCH" || intent.intent === "JOB_DETAILS") {
      const keyword =
        intent.entities.keywords?.join(" ") ||
        intent.entities.skills?.join(" ") ||
        undefined;
      jobs = await this.jobs.list({
        location: intent.entities.location,
        sector: intent.entities.sector,
        qualification: intent.entities.qualification,
        q: keyword,
      });
      content = jobs.length
        ? intent.language === "hi"
          ? `मुझे ${jobs.length} सक्रिय नौकरियाँ मिलीं।`
          : intent.language === "pa"
            ? `ਮੈਨੂੰ ${jobs.length} ਸਰਗਰਮ ਨੌਕਰੀਆਂ ਮਿਲੀਆਂ।`
            : `I found ${jobs.length} relevant active job listings.`
        : intent.language === "hi"
          ? "अभी कोई मेल खाती सक्रिय नौकरी नहीं मिली। स्थान या क्षेत्र व्यापक करके देखें।"
          : intent.language === "pa"
            ? "ਇਸ ਵੇਲੇ ਕੋਈ ਮੇਲ ਖਾਂਦੀ ਸਰਗਰਮ ਨੌਕਰੀ ਨਹੀਂ ਮਿਲੀ। ਟਿਕਾਣਾ ਜਾਂ ਖੇਤਰ ਵਿਆਪਕ ਕਰਕੇ ਕੋਸ਼ਿਸ਼ ਕਰੋ।"
            : "I couldn't find an active matching job right now. Try broadening the location or sector.";
    } else if (intent.intent === "JOB_RECOMMENDATION") {
      recommendations = await this.recommendations.forUser(user.id);
      jobs = recommendations.map((item) => (item as { job: unknown }).job);
      content = recommendations.length
        ? intent.language === "hi"
          ? "आपकी प्रोफ़ाइल के आधार पर ये नौकरियाँ उपयुक्त लगती हैं।"
          : intent.language === "pa"
            ? "ਤੁਹਾਡੀ ਪ੍ਰੋਫਾਈਲ ਅਧਾਰ 'ਤੇ ਇਹ ਨੌਕਰੀਆਂ ਉਚਿਤ ਲੱਗਦੀਆਂ ਹਨ।"
            : "Based on your profile, here are the strongest job matches with reasons."
        : intent.language === "hi"
          ? "व्यक्तिगत सिफ़ारिशों के लिए पहले अपनी प्रोफ़ाइल भरें।"
          : intent.language === "pa"
            ? "ਨਿੱਜੀ ਸਿਫਾਰਸ਼ਾਂ ਲਈ ਪਹਿਲਾਂ ਆਪਣੀ ਪ੍ਰੋਫਾਈਲ ਭਰੋ।"
            : "Fill in your profile first to get personalized recommendations.";
    } else if (intent.intent === "SCHEME_SEARCH") {
      const schemes = await this.schemes.list({
        q: intent.entities.keywords?.join(" ") || intent.entities.sector,
      });
      if (schemes.length) {
        content =
          intent.language === "hi"
            ? `मुझे ${schemes.length} संबंधित योजनाएँ मिलीं:\n` +
              schemes
                .slice(0, 5)
                .map((scheme) => `• ${scheme.name} — ${scheme.eligibilityText.slice(0, 160)}`)
                .join("\n")
            : intent.language === "pa"
              ? `ਮੈਨੂੰ ${schemes.length} ਸਬੰਧਤ ਸਕੀਮਾਂ ਮਿਲੀਆਂ:\n` +
                schemes
                  .slice(0, 5)
                  .map((scheme) => `• ${scheme.name} — ${scheme.eligibilityText.slice(0, 160)}`)
                  .join("\n")
              : `I found ${schemes.length} related schemes:\n` +
                schemes
                  .slice(0, 5)
                  .map((scheme) => `• ${scheme.name} — ${scheme.eligibilityText.slice(0, 160)}`)
                  .join("\n");
        sources = schemes.slice(0, 5).map((scheme) => ({
          sourceUrl: scheme.sourceUrl,
          lastCrawledAt: scheme.updatedAt,
        }));
      } else {
        const chunks = await this.knowledge.retrieve(body.content);
        sources = chunks.map((chunk) => ({
          sourceUrl: chunk.sourceUrl,
          lastCrawledAt: chunk.lastCrawledAt,
        }));
        content = chunks.length
          ? await this.ai.answer(
              body.content,
              chunks.map((chunk) => `${chunk.content}\nSource: ${chunk.sourceUrl}`).join("\n\n"),
              intent.language,
            )
          : "I couldn't verify this from the PGRKAM knowledge base.";
      }
    } else {
      const chunks = await this.knowledge.retrieve(body.content);
      sources = chunks.map((chunk) => ({
        sourceUrl: chunk.sourceUrl,
        lastCrawledAt: chunk.lastCrawledAt,
      }));
      content = chunks.length
        ? await this.ai.answer(
            body.content,
            chunks.map((chunk) => `${chunk.content}\nSource: ${chunk.sourceUrl}`).join("\n\n"),
            intent.language,
          )
        : "I couldn't verify this from the PGRKAM knowledge base.";
    }

    const navigation = await this.navigation.forIntent(intent.intent);
    const assistant = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content,
        detectedLanguage: intent.language,
        intent: intent.intent,
        sources: sources as Prisma.InputJsonValue,
      },
    });

    return {
      conversationId: conversation.id,
      message: assistant,
      intent,
      jobs,
      recommendations,
      navigation,
      sources,
    };
  }

  @Get("history/:conversationId")
  async history(
    @Headers("authorization") authorization: string | undefined,
    @Param("conversationId") conversationId: string,
  ) {
    const user = await this.auth.userFromHeader(authorization);
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId: user.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!conversation) {
      throw new NotFoundException("Conversation not found.");
    }
    return conversation;
  }
}
