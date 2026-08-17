import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

export type SendMailOptions = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | undefined;
  private readonly defaultFrom: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>("RESEND_API_KEY")?.trim();
    this.defaultFrom =
      this.config.get<string>("RESEND_FROM_EMAIL")?.trim() ||
      "PGRKAM AI <onboarding@resend.dev>";

    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn(
        "RESEND_API_KEY is not set; outbound email is disabled.",
      );
    }
  }

  isConfigured(): boolean {
    return Boolean(this.resend);
  }

  async send(options: SendMailOptions) {
    if (!this.resend) {
      throw new ServiceUnavailableException(
        "Email service is not configured. Set RESEND_API_KEY.",
      );
    }

    if (!options.html && !options.text) {
      throw new Error("Either html or text content is required.");
    }

    const base = {
      from: options.from ?? this.defaultFrom,
      to: options.to,
      subject: options.subject,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
    };

    const { data, error } = await this.resend.emails.send(
      options.html
        ? { ...base, html: options.html, text: options.text }
        : { ...base, text: options.text as string },
    );

    if (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw new ServiceUnavailableException(
        `Failed to send email: ${error.message}`,
      );
    }

    this.logger.debug(`Email sent: ${data?.id ?? "unknown-id"}`);
    return data;
  }

  async sendWelcomeEmail(to: string, name?: string | null) {
    const displayName = name?.trim() || "there";
    return this.send({
      to,
      subject: "Welcome to PGRKAM AI",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #1a1a1a;">
          <h1 style="font-size: 20px; margin-bottom: 12px;">Welcome to PGRKAM AI</h1>
          <p>Hi ${escapeHtml(displayName)},</p>
          <p>
            Your account is ready. You can now chat for career guidance, browse Punjab
            job listings, and get personalized recommendations.
          </p>
          <p style="margin-top: 24px; color: #555;">— The PGRKAM AI team</p>
        </div>
      `,
      text: `Hi ${displayName},\n\nWelcome to PGRKAM AI. Your account is ready.\n\n— The PGRKAM AI team`,
    });
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
