import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}
  list(filters: { q?: string; location?: string; sector?: string; qualification?: string }) {
    const where: Prisma.JobWhereInput = { isActive: true };
    if (filters.location) where.location = { contains: filters.location, mode: "insensitive" };
    if (filters.sector) where.sector = { contains: filters.sector, mode: "insensitive" };
    if (filters.qualification) where.qualification = { contains: filters.qualification, mode: "insensitive" };
    if (filters.q) where.OR = [{ title: { contains: filters.q, mode: "insensitive" } }, { employer: { contains: filters.q, mode: "insensitive" } }];
    return this.prisma.job.findMany({ where, orderBy: { crawledAt: "desc" }, take: 50 });
  }
  async one(id: string) { const job = await this.prisma.job.findUnique({ where: { id } }); if (!job) throw new NotFoundException("Job not found"); return job; }
}
