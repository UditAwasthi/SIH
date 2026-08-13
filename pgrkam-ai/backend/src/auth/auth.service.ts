import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async guest() {
    const user = await this.prisma.user.create({ data: {} });
    return { accessToken: await this.jwt.signAsync({ sub: user.id, guest: true }), user };
  }

  async userFromHeader(header?: string) {
    if (!header?.startsWith("Bearer ")) throw new UnauthorizedException("A guest session is required.");
    const payload = await this.jwt.verifyAsync<{ sub: string }>(header.slice(7));
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException("Session no longer exists.");
    return user;
  }
}
