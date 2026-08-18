import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { MailService } from "../services/mail.service";
import { RedisService } from "../redis/redis.service";
import { SubscribeDto } from "./dto/subscribe.dto";

@ApiTags("subscribe")
@Controller("subscribe")
export class SubscribeController {
  constructor(
    private readonly mail: MailService,
    private readonly redis: RedisService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Subscribe an email address to Punjab job alerts" })
  async subscribe(@Body() body: SubscribeDto) {
    const email = body.email.trim().toLowerCase();

    if (!(await this.redis.consume(`rate:subscribe:${email}`, 3, 3600))) {
      throw new HttpException(
        "Too many subscription attempts for this email. Try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    await this.mail.sendSubscriptionEmail(email);

    return {
      ok: true,
      message: "Subscription confirmed. Check your inbox.",
    };
  }
}
