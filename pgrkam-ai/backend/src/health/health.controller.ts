import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { HealthService } from "./health.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: "Check API and configured dependency connectivity" })
  @ApiOkResponse({ description: "The API is running. Dependencies may be unconfigured during local setup." })
  getHealth() {
    return this.healthService.check();
  }
}
