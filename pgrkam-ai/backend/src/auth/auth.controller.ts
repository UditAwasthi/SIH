import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterDto } from "./dto/auth.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("guest")
  @ApiOperation({ summary: "Create a temporary guest session" })
  guest() {
    return this.auth.guest();
  }

  @Post("register")
  @ApiOperation({ summary: "Create an account with email and password" })
  register(@Body() body: RegisterDto) {
    
    return this.auth.register(body);

  }

  @Post("login")
  @ApiOperation({ summary: "Sign in with email and password" })
  login(@Body() body: LoginDto) {
    return this.auth.login(body);
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Return the current user session" })
  me(@Headers("authorization") authorization?: string) {
    return this.auth.me(authorization);
  }
}