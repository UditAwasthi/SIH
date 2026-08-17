import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: "Aman Singh" })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: "aman@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8, example: "securepass" })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiPropertyOptional({ enum: ["en", "hi", "pa"], default: "en" })
  @IsOptional()
  @IsIn(["en", "hi", "pa"])
  preferredLang?: "en" | "hi" | "pa";
}

export class LoginDto {
  @ApiProperty({ example: "aman@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "securepass" })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
