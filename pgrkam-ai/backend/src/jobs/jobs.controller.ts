import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { JobsService } from "./jobs.service";

@ApiTags("jobs")
@Controller("jobs")
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  list(
    @Query()
    query: {
      q?: string;
      location?: string;
      sector?: string;
      qualification?: string;
    },
  ) {
    return this.jobs.list(query);
  }

  @Get(":id")
  one(@Param("id") id: string) {
    return this.jobs.one(id);
  }
}
