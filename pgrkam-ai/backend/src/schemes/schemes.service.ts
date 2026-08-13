import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "for",
  "me",
  "my",
  "am",
  "i",
  "in",
  "on",
  "at",
  "to",
  "of",
  "and",
  "or",
  "is",
  "are",
  "eligible",
  "about",
  "what",
  "how",
  "can",
  "do",
  "does",
]);

@Injectable()
export class SchemesService {
  constructor(private readonly prisma: PrismaService) {}

  list(filters: { q?: string; category?: string; keywords?: string[] }) {
    const where: Prisma.SchemeWhereInput = {};
    if (filters.category) {
      where.category = { contains: filters.category, mode: "insensitive" };
    }

    const terms = [
      ...new Set(
        [...(filters.keywords ?? []), ...(filters.q ? filters.q.split(/\s+/) : [])]
          .map((term) => term.trim().toLowerCase())
          .filter((term) => term.length > 2 && !STOPWORDS.has(term)),
      ),
    ].slice(0, 6);

    if (terms.length) {
      where.OR = terms.flatMap((term) => [
        { name: { contains: term, mode: "insensitive" as const } },
        { eligibilityText: { contains: term, mode: "insensitive" as const } },
        { category: { contains: term, mode: "insensitive" as const } },
      ]);
    }

    return this.prisma.scheme.findMany({ where, orderBy: { updatedAt: "desc" }, take: 50 });
  }

  async one(id: string) {
    const scheme = await this.prisma.scheme.findUnique({ where: { id } });
    if (!scheme) throw new NotFoundException("Scheme not found");
    return scheme;
  }
}
