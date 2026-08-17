import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto, RegisterDto } from "./dto/auth.dto";

type TokenUser = {
  id: string;
  name: string | null;
  email: string | null;
  preferredLang: string;
  isGuest: boolean;
  hasProfile: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async guest() {
    const user = await this.prisma.user.create({ data: {} });
    return this.tokenResponse(user, true);
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing?.passwordHash) {
      throw new ConflictException("An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user =
      existing && !existing.passwordHash
        ? await this.prisma.user.update({
            where: { id: existing.id },
            data: {
              name: dto.name.trim(),
              email,
              passwordHash,
              preferredLang: dto.preferredLang ?? existing.preferredLang,
            },
          })
        : await this.prisma.user.create({
            data: {
              name: dto.name.trim(),
              email,
              passwordHash,
              preferredLang: dto.preferredLang ?? "en",
            },
          });

    return this.tokenResponse(user, false);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      throw new UnauthorizedException("Invalid email or password.");
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid email or password.");
    return this.tokenResponse(user, false);
  }

  async me(header?: string) {
    const user = await this.userFromHeader(header);
    const profile = await this.prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    return this.publicUser(user, !user.passwordHash, Boolean(profile));
  }

  async userFromHeader(header?: string) {
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Sign in is required.");
    }
    const payload = await this.jwt.verifyAsync<{ sub: string }>(header.slice(7));
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException("Session no longer exists.");
    return user;
  }

  private async tokenResponse(
    user: {
      id: string;
      name: string | null;
      email: string | null;
      preferredLang: string;
      passwordHash: string | null;
    },
    guest: boolean,
  ) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      guest,
    });
    return {
      accessToken,
      user: this.publicUser(user, guest, Boolean(profile)),
    };
  }

  private publicUser(
    user: {
      id: string;
      name: string | null;
      email: string | null;
      preferredLang: string;
    },
    isGuest: boolean,
    hasProfile: boolean,
  ): TokenUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      preferredLang: user.preferredLang,
      isGuest,
      hasProfile,
    };
  }
}
