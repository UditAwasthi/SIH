import {
    Injectable,
    Logger,
    ServiceUnavailableException,
} from "@nestjs/common";
import {ConfigService} from "@nestjs/config";
import {Resend} from "resend";

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

        const {data, error} = await this.resend.emails.send(
            options.html
                ? {...base, html: options.html, text: options.text}
                : {...base, text: options.text as string},
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


    async sendSubscriptionEmail(to: string) {
        return this.send({
            to,
            subject: "You're subscribed to PGRKAM job alerts",
            html: `
      <div style="font-family: 'Courier New', monospace; line-height: 1.6; color: #ffffff; background-color: #000000; padding: 32px 24px;">
        <div style="max-width: 480px; margin: 0 auto;">
          <p style="font-size: 12px; letter-spacing: 2px; color: #D71921; text-transform: uppercase; margin-bottom: 8px;">
            ● PGRKAM
          </p>
          <h1 style="font-size: 22px; font-weight: 600; margin-bottom: 16px; letter-spacing: 0.5px; color: #ffffff;">
            You're on the list
          </h1>
          <p style="color: #e0e0e0;">Hi,</p>
          <p style="color: #e0e0e0;">
            Thanks for subscribing to PGRKAM job alerts. We'll email you when new Punjab job
            listings, training camps, and career fairs are posted — not as a daily dump.
          </p>
          <p style="margin-top: 16px; color: #e0e0e0;">
            In the meantime, you can browse live listings and ask the career assistant anytime.
          </p>
          <div style="margin-top: 24px; border-top: 1px solid #2a2a2a; padding-top: 16px;">
            <p style="color: #999999; font-size: 13px; letter-spacing: 0.5px;">— The PGRKAM AI team</p>
          </div>
        </div>
      </div>
    `,
            text:
                "Hi,\n\nThanks for subscribing to PGRKAM job alerts. We'll email you when new Punjab job listings, training camps, and career fairs are posted.\n\n— The PGRKAM AI team",
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