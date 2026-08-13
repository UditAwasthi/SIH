import { Controller, Get, Headers } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthService } from "../auth/auth.service";
import { RecommendationsService } from "./recommendations.service";

@ApiTags("recommendations")
@ApiBearerAuth()
@Controller("recommendations")
export class RecommendationsController {
  constructor(
    private readonly auth: AuthService,
    private readonly recommendations: RecommendationsService,
  ) {}

  @Get("jobs")
  async jobs(@Headers("authorization") authorization?: string) {
    const user = await this.auth.userFromHeader(authorization);
    return this.recommendations.forUser(user.id);
  }
}
