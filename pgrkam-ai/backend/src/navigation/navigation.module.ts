import { Module } from "@nestjs/common";
import { NavigationService } from "./navigation.service";
@Module({ providers: [NavigationService], exports: [NavigationService] }) export class NavigationModule {}
