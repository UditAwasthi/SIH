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
        const siteUrl =
            this.config.get<string>("FRONTEND_URL")?.trim() ||
            "http://localhost:3000";

        return this.send({
            to,
            subject: "You're subscribed to PGRKAM job alerts",
            html: nothingOsEmail({
                eyebrow: "Signal / mail",
                title: "You're on the list",
                bodyHtml: `
          <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#a8a8a8;">Hi,</p>
          <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#a8a8a8;">
            Thanks for subscribing to <span style="color:#f5f5f5;">PGRKAM job alerts</span>.
            We'll email you when new Punjab job listings, training camps, and career fairs
            go up — not as a daily dump.
          </p>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#a8a8a8;">
            In the meantime, browse live listings or ask the career assistant.
          </p>
        `,
                ctaLabel: "See jobs",
                ctaUrl: `${siteUrl.replace(/\/$/, "")}/jobs`,
            }),
            text:
                "Hi,\n\nThanks for subscribing to PGRKAM job alerts. We'll email you when new Punjab job listings, training camps, and career fairs are posted.\n\nSee jobs: " +
                `${siteUrl.replace(/\/$/, "")}/jobs` +
                "\n\n— The PGRKAM AI team",
        });
    }
}

const VOID = "#0b0b0b";
const RAISED = "#151515";
const LINE = "#2e2e2e";
const STRUCT = "#242424";
const MUTE = "#a8a8a8";
const GLYPH = "#f5f5f5";
const LED = "#ff0000";
const DOT_OFF = "#2a2a2a";

function ledDot(on: boolean) {
    const fill = on ? LED : DOT_OFF;
    return `<span style="display:inline-block;width:6px;height:6px;background:${fill};border-radius:999px;vertical-align:middle;line-height:6px;">&nbsp;</span>`;
}

function glyphRow() {
    const cells = [true, false, false, true, false, true]
        .map(
            (on) =>
                `<td width="8" height="8" style="width:8px;height:8px;background:${on ? LED : DOT_OFF};font-size:0;line-height:0;">&nbsp;</td>`,
        )
        .join('<td width="4" style="width:4px;font-size:0;">&nbsp;</td>');
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>`;
}

function nothingOsEmail(input: {
    eyebrow: string;
    title: string;
    bodyHtml: string;
    ctaLabel: string;
    ctaUrl: string;
}) {
    const font =
        "Manrope, IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, Arial, Helvetica, sans-serif";
    const mono =
        "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>PGRKAM</title>
</head>
<body style="margin:0;padding:0;background:${VOID};color:${GLYPH};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${VOID};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:520px;background:${VOID};border:1px solid ${LINE};">
          <tr>
            <td style="padding:18px 22px;border-bottom:1px solid ${LINE};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:${mono};font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE};">
                    ${ledDot(true)}&nbsp;&nbsp;PGRKAM
                  </td>
                  <td align="right" style="font-family:${mono};font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:${MUTE};">
                    ${escapeHtml(input.eyebrow)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 22px 12px 22px;">
              ${glyphRow()}
              <h1 style="margin:18px 0 0 0;font-family:${font};font-size:28px;line-height:1.05;letter-spacing:-0.04em;font-weight:500;color:${GLYPH};">
                ${escapeHtml(input.title)}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 22px 24px 22px;font-family:${font};">
              ${input.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 22px 28px 22px;">
              <a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;background:${LED};color:${GLYPH};text-decoration:none;font-family:${font};font-size:13px;font-weight:600;padding:12px 18px;border:1px solid ${LED};border-radius:2px;">
                ${ledDot(true)}&nbsp;&nbsp;${escapeHtml(input.ctaLabel)}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 22px;border-top:1px solid ${LINE};background:${RAISED};">
              <p style="margin:0;font-family:${mono};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${MUTE};">
                Punjab Ghar Ghar Rozgar and Karobar Mission
              </p>
              <p style="margin:8px 0 0 0;font-family:${mono};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${STRUCT};">
                — The PGRKAM AI team
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}