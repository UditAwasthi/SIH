import { Body, Controller, Get, Headers, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@prisma/client";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";

type ProfileBody = {
  education?: Prisma.InputJsonValue;
  skills?: string[];
  experienceYears?: number;
  location?: string;
  preferredSectors?: string[];
  salaryMin?: number;
  salaryMax?: number;
};

@ApiTags("profile")
@ApiBearerAuth()
@Controller("profile")
export class ProfileController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async get(@Headers("authorization") authorization?: string) {
    const user = await this.auth.userFromHeader(authorization);
    return this.prisma.profile.findUnique({ where: { userId: user.id } });
  }

  @Put()
  async put(@Headers("authorization") authorization: string | undefined, @Body() body: ProfileBody) {
    const user = await this.auth.userFromHeader(authorization);
    const data = {
      education: body.education,
      skills: body.skills ?? [],
      experienceYears: body.experienceYears,
      location: body.location,
      preferredSectors: body.preferredSectors ?? [],
      salaryMin: body.salaryMin,
      salaryMax: body.salaryMax,
    };
    return this.prisma.profile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    });
  }
}
