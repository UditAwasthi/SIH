import { Injectable, Logger } from "@nestjs/common";
import { AiService } from "../ai/ai.service";
import { PrismaService } from "../prisma/prisma.service";

export interface KnowledgeChunk {
  content: string;
  sourceUrl: string;
  category: string;
  language: string;
  lastCrawledAt: Date;
  score?: number;
}

const RETRIEVAL_SCORE_THRESHOLD = 0.35;

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  async retrieve(question: string, limit = 5): Promise<KnowledgeChunk[]> {
    try {
      const embedding = await this.ai.embed(question);
      const vector = `[${embedding.join(",")}]`;
      const rows = await this.prisma.$queryRawUnsafe<KnowledgeChunk[]>(
        `SELECT content, "sourceUrl", category, language, "lastCrawledAt",
                1 - (embedding <=> $1::vector) AS score
         FROM "Document"
         WHERE embedding IS NOT NULL
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        vector,
        limit,
      );
      const strong = rows.filter((row) => (row.score ?? 0) >= RETRIEVAL_SCORE_THRESHOLD);
      if (strong.length) return strong;
    } catch (error) {
      this.logger.warn(`Vector retrieval unavailable, falling back to text search: ${String(error)}`);
    }

    return this.textSearch(question, limit);
  }

  private async textSearch(question: string, limit: number): Promise<KnowledgeChunk[]> {
    const terms = question
      .toLowerCase()
      .split(/[^a-z0-9\u0900-\u097F\u0A00-\u0A7F]+/i)
      .filter((term) => term.length > 2)
      .slice(0, 6);

    if (!terms.length) {
      return this.prisma.document.findMany({
        take: limit,
        orderBy: { lastCrawledAt: "desc" },
        select: {
          content: true,
          sourceUrl: true,
          category: true,
          language: true,
          lastCrawledAt: true,
        },
      });
    }

    const documents = await this.prisma.document.findMany({
      where: {
        OR: terms.map((term) => ({
          content: { contains: term, mode: "insensitive" as const },
        })),
      },
      take: limit * 3,
      orderBy: { lastCrawledAt: "desc" },
      select: {
        content: true,
        sourceUrl: true,
        category: true,
        language: true,
        lastCrawledAt: true,
      },
    });

    return documents
      .map((doc) => {
        const haystack = doc.content.toLowerCase();
        const hits = terms.filter((term) => haystack.includes(term)).length;
        return { ...doc, score: hits / terms.length };
      })
      .filter((doc) => (doc.score ?? 0) > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, limit);
  }

  async upsertDocument(input: Omit<KnowledgeChunk, "lastCrawledAt" | "score"> & { id?: string }) {
    const id = input.id ?? crypto.randomUUID();
    let vector: string | null = null;
    try {
      const embedding = await this.ai.embed(input.content);
      vector = `[${embedding.join(",")}]`;
    } catch (error) {
      this.logger.warn(`Document stored without embedding: ${String(error)}`);
    }

    if (vector) {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "Document" (id, content, "sourceUrl", category, language, embedding, "lastCrawledAt")
         VALUES ($1, $2, $3, $4, $5, $6::vector, NOW())
         ON CONFLICT (id) DO UPDATE SET
           content = EXCLUDED.content,
           "sourceUrl" = EXCLUDED."sourceUrl",
           category = EXCLUDED.category,
           language = EXCLUDED.language,
           embedding = EXCLUDED.embedding,
           "lastCrawledAt" = NOW()`,
        id,
        input.content,
        input.sourceUrl,
        input.category,
        input.language,
        vector,
      );
      return;
    }

    await this.prisma.document.upsert({
      where: { id },
      create: {
        id,
        content: input.content,
        sourceUrl: input.sourceUrl,
        category: input.category,
        language: input.language,
      },
      update: {
        content: input.content,
        sourceUrl: input.sourceUrl,
        category: input.category,
        language: input.language,
        lastCrawledAt: new Date(),
      },
    });
  }
}
