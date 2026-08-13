import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface RecommendationWhy {
  matchedSkills: string[];
  educationMatch: boolean;
  locationMatch: boolean;
  sectorMatch: boolean;
}

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async forUser(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) return [];

    const jobs = await this.prisma.job.findMany({ where: { isActive: true }, take: 80 });
    const educationText = JSON.stringify(profile.education ?? "").toLowerCase();

    return jobs
      .map((job) => {
        const matchedSkills = job.requiredSkills.filter((skill) =>
          profile.skills.some((mine) => mine.toLowerCase() === skill.toLowerCase()),
        );
        const skillScore =
          job.requiredSkills.length === 0 ? 0.5 : matchedSkills.length / job.requiredSkills.length;
        const educationMatch = Boolean(
          job.qualification && educationText.includes(job.qualification.toLowerCase().slice(0, 12)),
        );
        const locationMatch = Boolean(
          profile.location && job.location.toLowerCase().includes(profile.location.toLowerCase()),
        );
        const sectorMatch = profile.preferredSectors.some(
          (sector) => sector.toLowerCase() === job.sector.toLowerCase(),
        );

        const score = Math.round(
          100 *
            (skillScore * 0.5 +
              (educationMatch ? 0.2 : 0) +
              (locationMatch ? 0.15 : 0) +
              (sectorMatch ? 0.15 : 0)),
        );

        const why: RecommendationWhy = {
          matchedSkills,
          educationMatch,
          locationMatch,
          sectorMatch,
        };

        return { job, score, why };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }
}
