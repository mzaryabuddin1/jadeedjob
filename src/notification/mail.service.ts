import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Thin SMTP wrapper (works with Gmail, SendGrid, SES, Mailgun... SMTP).
 *
 * Env: SMTP_HOST, SMTP_PORT (587), SMTP_SECURE (true for 465),
 *      SMTP_USER, SMTP_PASS, MAIL_FROM ("JobsLoot <no-reply@yourdomain.com>")
 *
 * When SMTP_HOST is not set, emails are NOT sent — they are only logged,
 * so local development never needs real credentials.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  get isConfigured(): boolean {
    return !!process.env.SMTP_HOST;
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      });
    }
    return this.transporter;
  }

  /** @returns true if handed to SMTP, false if skipped (not configured) */
  async send(opts: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(
        `SMTP not configured — email NOT sent (to=${opts.to}, subject="${opts.subject}")`,
      );
      return false;
    }

    await this.getTransporter().sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      ...opts,
    });
    return true;
  }
}
