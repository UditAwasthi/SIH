import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, MaxLength } from "class-validator";

export class SubscribeDto {
  @ApiProperty({ example: "you@example.com" })
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
