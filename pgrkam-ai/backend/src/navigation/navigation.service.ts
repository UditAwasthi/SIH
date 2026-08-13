import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
@Injectable() export class NavigationService { constructor(private readonly prisma: PrismaService) {} forIntent(intent: string) { return this.prisma.navigationMap.findUnique({ where: { intent } }); } }
