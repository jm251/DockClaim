import "server-only";

import nodemailer from "nodemailer";

import { env, featureFlags } from "@/lib/env";

export interface MailProvider {
  isConfigured: boolean;
  sendMail(input: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<{ sent: boolean; messageId?: string; error?: string }>;
}

class SmtpMailProvider implements MailProvider {
  private transporter =
    featureFlags.isMailConfigured && env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS
      ? nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_SECURE,
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
        })
      : null;

  isConfigured = Boolean(this.transporter);

  async sendMail(input: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }) {
    if (!this.transporter || !env.SMTP_FROM_EMAIL) {
      return {
        sent: false,
        error: "SMTP is not configured.",
      };
    }

    const result = await this.transporter.sendMail({
      from: env.SMTP_FROM_EMAIL,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    return {
      sent: true,
      messageId: result.messageId,
    };
  }
}

export const mailProvider = new SmtpMailProvider();
