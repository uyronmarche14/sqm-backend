import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { EmailConfig } from '../email.config.js';
import type { EmailMessage, EmailSendResult, EmailTransport } from '../email.types.js';

export class SmtpEmailTransport implements EmailTransport {
  readonly name = 'smtp';
  private readonly transporter: Transporter;

  constructor(config: EmailConfig) {
    if (!config.smtpHost || !config.smtpPort || !config.smtpUser || !config.smtpPass) {
      throw new Error('SMTP transport is missing required SMTP configuration.');
    }

    this.transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure ?? false,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const info = await this.transporter.sendMail({
      from: message.from.name
        ? `"${message.from.name}" <${message.from.email}>`
        : message.from.email,
      to: message.to.map((recipient) =>
        recipient.name ? `"${recipient.name}" <${recipient.email}>` : recipient.email,
      ),
      cc: message.cc?.map((recipient) =>
        recipient.name ? `"${recipient.name}" <${recipient.email}>` : recipient.email,
      ),
      bcc: message.bcc?.map((recipient) =>
        recipient.name ? `"${recipient.name}" <${recipient.email}>` : recipient.email,
      ),
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    return {
      delivered: true,
      transport: this.name,
      referenceId: info.messageId,
    };
  }
}
