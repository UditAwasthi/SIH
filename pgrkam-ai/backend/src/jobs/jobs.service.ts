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
  "in",
  "on",
  "at",
  "to",
  "of",
  "and",
  "or",
  "find",
  "show",
  "get",
  "please",
  "want",
  "looking",
  "search",
  "with",
  "from",
  "jobs",
  "job",
  "vacancy",
  "vacancies",
  "opening",
  "openings",
  "naukri",
  "fresher",
  "freshers",
  "active",
  "relevant",
  "available",
  "punjab",
  "chandigarh",
  "ludhiana",
  "amritsar",
  "jalandhar",
  "mohali",
  "patiala",
  "bathinda",
  "government",
  "govt",
  "private",
]);

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  private meaningfulTerms(input?: string | string[]): string[] {
    const raw = Array.isArray(input) ? input.join(" ") : (input ?? "");
    return raw
      .toLowerCase()
      .split(/[^a-z0-9.+#]+/i)
      .map((term) => term.trim())
      .filter((term) => term.length > 1 && !STOPWORDS.has(term));
  }

  private normalizeSector(sector?: string) {
    if (!sector) return undefined;
    if (/^(software|it|tech)$/i.test(sector)) return "IT";
    if (/govt|government/i.test(sector)) return "Government";
    return sector;
  }

  list(filters: {
    q?: string;
    location?: string;
    sector?: string;
    qualification?: string;
    skills?: string[];
    keywords?: string[];
    /** When true (chat), relax AND filters so structured entities don't over-constrain. */
    relax?: boolean;
  }) {
    const sector = this.normalizeSector(filters.sector);
    const qualification = filters.qualification?.replace(/\.\s+/g, ".").trim();

    const structured: Prisma.JobWhereInput = { isActive: true };
    if (filters.location) {
      structured.location = { contains: filters.location, mode: "insensitive" };
    }
    if (sector) {
      structured.sector = { contains: sector, mode: "insensitive" };
    }
    if (qualification) {
      structured.qualification = { contains: qualification, mode: "insensitive" };
    }

    const uniqueTerms = [
      ...new Set([
        ...this.meaningfulTerms(filters.q),
        ...this.meaningfulTerms(filters.keywords),
        ...this.meaningfulTerms(filters.skills),
      ]),
    ].slice(0, 6);

    const where: Prisma.JobWhereInput = { ...structured };
    if (uniqueTerms.length) {
      where.AND = [
        {
          OR: uniqueTerms.flatMap((term) => [
            { title: { contains: term, mode: "insensitive" as const } },
            { employer: { contains: term, mode: "insensitive" as const } },
            { qualification: { contains: term, mode: "insensitive" as const } },
          ]),
        },
      ];
    }

    return this.prisma.job
      .findMany({ where, orderBy: { crawledAt: "desc" }, take: 50 })
      .then(async (jobs) => {
        if (jobs.length || !filters.relax) return jobs;

        // 1) structured filters only (drop free-text terms)
        const structuredOnly = await this.prisma.job.findMany({
          where: structured,
          orderBy: { crawledAt: "desc" },
          take: 50,
        });
        if (structuredOnly.length) return structuredOnly;

        // 2) location + sector only
        if (filters.location || sector) {
          const soft = await this.prisma.job.findMany({
            where: {
              isActive: true,
              ...(filters.location
                ? { location: { contains: filters.location, mode: "insensitive" } }
                : {}),
              ...(sector ? { sector: { contains: sector, mode: "insensitive" } } : {}),
            },
            orderBy: { crawledAt: "desc" },
            take: 50,
          });
          if (soft.length) return soft;
        }

        // 3) location only
        if (filters.location) {
          const byLocation = await this.prisma.job.findMany({
            where: {
              isActive: true,
              location: { contains: filters.location, mode: "insensitive" },
            },
            orderBy: { crawledAt: "desc" },
            take: 50,
          });
          if (byLocation.length) return byLocation;
        }

        // 4) anything active (demo-safe fallback)
        return this.prisma.job.findMany({
          where: { isActive: true },
          orderBy: { crawledAt: "desc" },
          take: 20,
        });
      });
  }

  async one(id: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Job not found");
    return job;
  }
}
