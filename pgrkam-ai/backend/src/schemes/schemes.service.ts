import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SchemesService {
  constructor(private readonly prisma: PrismaService) {}

  list(filters: { q?: string; category?: string }) {
    const where: Prisma.SchemeWhereInput = {};
    if (filters.category) {
      where.category = { contains: filters.category, mode: "insensitive" };
    }
    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: "insensitive" } },
        { eligibilityText: { contains: filters.q, mode: "insensitive" } },
        { category: { contains: filters.q, mode: "insensitive" } },
      ];
    }
    return this.prisma.scheme.findMany({ where, orderBy: { updatedAt: "desc" }, take: 50 });
  }

  async one(id: string) {
    const scheme = await this.prisma.scheme.findUnique({ where: { id } });
    if (!scheme) throw new NotFoundException("Scheme not found");
    return scheme;
  }
}
