import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SchemesService } from "./schemes.service";

@ApiTags("schemes")
@Controller("schemes")
export class SchemesController {
  constructor(private readonly schemes: SchemesService) {}

  @Get()
  list(@Query() query: { q?: string; category?: string }) {
    return this.schemes.list(query);
  }

  @Get(":id")
  one(@Param("id") id: string) {
    return this.schemes.one(id);
  }
}
