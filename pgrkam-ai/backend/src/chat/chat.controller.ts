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

    let conversation = body.conversationId
      ? await this.prisma.conversation.findFirst({
          where: { id: body.conversationId, userId: user.id },
        })
      : null;
    if (!conversation) {
      conversation = await this.prisma.conversation.create({ data: { userId: user.id } });
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

    const prior = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 9,
    });
    const history = [...prior]
      .reverse()
      .slice(0, -1)
      .map((item) => ({ role: item.role, content: item.content }));

    let content: string;
    let jobs: unknown[] = [];
    let recommendations: unknown[] = [];
    let sources: Array<{ sourceUrl: string; lastCrawledAt?: Date | string }> = [];

    if (intent.intent === "GREETING" || intent.intent === "HELP" || this.ai.isProductQuestion(body.content)) {
      content = await this.ai.converse({
        question: body.content,
        language: intent.language,
        history,
      });
    } else if (intent.confidence < 0.55) {
      content = this.ai.needsOfficialFacts(body.content)
        ? this.ai.clarifyingQuestion(intent.language)
        : await this.ai.converse({
            question: body.content,
            language: intent.language,
            history,
          });
    } else if (intent.intent === "JOB_SEARCH" || intent.intent === "JOB_DETAILS") {
      jobs = await this.jobs.list({
        location: intent.entities.location,
        sector: intent.entities.sector,
        qualification: intent.entities.qualification,
        skills: intent.entities.skills,
        keywords: intent.entities.keywords,
        relax: true,
      });
      const fallback = jobs.length
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
      const jobLines = (jobs as Array<Record<string, unknown>>)
        .slice(0, 8)
        .map((job, index) => {
          const skills = Array.isArray(job.requiredSkills)
            ? (job.requiredSkills as string[]).slice(0, 6).join(", ")
            : "";
          return `${index + 1}. ${job.title} @ ${job.employer} | ${job.location} | ${job.sector}${
            job.qualification ? ` | qual: ${job.qualification}` : ""
          }${skills ? ` | skills: ${skills}` : ""}`;
        })
        .join("\n");
      content = await this.ai.compose({
        question: body.content,
        language: intent.language,
        intent: intent.intent,
        fallback,
        toolContext: jobs.length
          ? `Matched filters: ${JSON.stringify(intent.entities)}\nJobs (${jobs.length}):\n${jobLines}`
          : `Matched filters: ${JSON.stringify(intent.entities)}\nJobs: none`,
      });
    } else if (intent.intent === "JOB_RECOMMENDATION") {
      recommendations = await this.recommendations.forUser(user.id);
      jobs = recommendations.map((item) => (item as { job: unknown }).job);
      const fallback = recommendations.length
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
      const profile = await this.prisma.profile.findUnique({ where: { userId: user.id } });
      const recLines = (
        recommendations as Array<{
          score: number;
          why: {
            matchedSkills: string[];
            educationMatch: boolean;
            locationMatch: boolean;
            sectorMatch: boolean;
          };
          job: {
            title: string;
            employer: string;
            location: string;
            sector: string;
          };
        }>
      )
        .slice(0, 6)
        .map(
          (item, index) =>
            `${index + 1}. score=${item.score} ${item.job.title} @ ${item.job.employer} (${item.job.location}, ${item.job.sector}) — matchedSkills=${item.why.matchedSkills.join("/") || "none"}; education=${item.why.educationMatch}; location=${item.why.locationMatch}; sector=${item.why.sectorMatch}`,
        )
        .join("\n");
      content = await this.ai.compose({
        question: body.content,
        language: intent.language,
        intent: intent.intent,
        fallback,
        toolContext: profile
          ? `Profile: skills=${profile.skills.join(", ")}; education=${JSON.stringify(profile.education)}; location=${profile.location}; sectors=${profile.preferredSectors.join(", ")}; exp=${profile.experienceYears ?? 0}y\nRecommendations:\n${recLines || "none"}`
          : "Profile: missing\nRecommendations: none",
      });
    } else if (intent.intent === "SCHEME_SEARCH") {
      let schemes = await this.schemes.list({
        keywords: intent.entities.keywords,
        q: body.content,
      });
      if (!schemes.length) {
        schemes = await this.schemes.list({});
      }
      if (schemes.length) {
        const fallback =
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
        const schemeLines = schemes
          .slice(0, 5)
          .map(
            (scheme, index) =>
              `${index + 1}. ${scheme.name} [${scheme.category}] — ${scheme.eligibilityText.slice(0, 220)} | ${scheme.sourceUrl}`,
          )
          .join("\n");
        content = await this.ai.compose({
          question: body.content,
          language: intent.language,
          intent: intent.intent,
          fallback,
          toolContext: `Schemes:\n${schemeLines}`,
        });
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
          : this.ai.unverified(intent.language);
      }
    } else if (
      intent.intent === "REGISTRATION" ||
      intent.intent === "CAREER_GUIDANCE" ||
      intent.intent === "VOCATIONAL_GUIDANCE" ||
      intent.intent === "FAQ"
    ) {
      const preferredCategory =
        intent.intent === "REGISTRATION"
          ? "registration"
          : intent.intent === "CAREER_GUIDANCE"
            ? "career"
            : intent.intent === "VOCATIONAL_GUIDANCE"
              ? "vocational"
              : undefined;
      let chunks = await this.knowledge.retrieve(body.content);
      if (preferredCategory) {
        const categoryDocs = chunks.filter((chunk) => chunk.category === preferredCategory);
        if (categoryDocs.length) chunks = categoryDocs;
      }
      sources = chunks.map((chunk) => ({
        sourceUrl: chunk.sourceUrl,
        lastCrawledAt: chunk.lastCrawledAt,
      }));
      if (chunks.length) {
        content = await this.ai.answer(
          body.content,
          chunks.map((chunk) => `${chunk.content}\nSource: ${chunk.sourceUrl}`).join("\n\n"),
          intent.language,
        );
      } else if (intent.intent === "REGISTRATION") {
        content = this.ai.unverified(intent.language);
      } else {
        content = await this.ai.openEndedOrUnverified({
          question: body.content,
          language: intent.language,
          history,
        });
      }
    } else {
      const chunks = await this.knowledge.retrieve(body.content);
      sources = chunks.map((chunk) => ({
        sourceUrl: chunk.sourceUrl,
        lastCrawledAt: chunk.lastCrawledAt,
      }));
      if (chunks.length) {
        content = await this.ai.answer(
          body.content,
          chunks.map((chunk) => `${chunk.content}\nSource: ${chunk.sourceUrl}`).join("\n\n"),
          intent.language,
        );
      } else {
        content = await this.ai.openEndedOrUnverified({
          question: body.content,
          language: intent.language,
          history,
        });
      }
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
