import { getEmailConfig, type EmailConfig } from './email.config.js';
import type { EmailMessage, EmailSendResult, EmailTransport } from './email.types.js';
import { ConsoleEmailTransport } from './transports/console-email.transport.js';
import { FileEmailTransport } from './transports/file-email.transport.js';
import { SmtpEmailTransport } from './transports/smtp-email.transport.js';

function createTransport(config: EmailConfig): EmailTransport {
  if (config.transport === 'console') {
    return new ConsoleEmailTransport();
  }

  if (config.transport === 'smtp') {
    return new SmtpEmailTransport(config);
  }

  return new FileEmailTransport(config.outputDir);
}

export class EmailService {
  private readonly activeTransport: EmailTransport;

  constructor(
    private readonly config: EmailConfig = getEmailConfig(),
    transport?: EmailTransport,
  ) {
    this.activeTransport = transport ?? createTransport(this.config);

    console.log(
      '[email] configuration loaded',
      JSON.stringify({
        enabled: this.config.enabled,
        transport: this.config.transport,
        fromEmail: this.config.fromEmail,
        fromName: this.config.fromName,
        localUrl: this.config.localUrl,
        internetUrl: this.config.internetUrl,
        outputDir: this.config.transport === 'file' ? this.config.outputDir : null,
        smtpHost: this.config.transport === 'smtp' ? this.config.smtpHost : null,
        smtpPort: this.config.transport === 'smtp' ? this.config.smtpPort : null,
      }),
    );
  }

  async send(message: Omit<EmailMessage, 'from'> & { from?: EmailMessage['from'] }): Promise<EmailSendResult> {
    if (!this.config.enabled) {
      console.log(
        '[email] send skipped',
        JSON.stringify({
          eventKey: message.eventKey,
          transport: 'disabled',
          recipient: message.to[0]?.email ?? null,
          subject: message.subject,
        }),
      );

      return {
        delivered: false,
        skipped: true,
        transport: 'disabled',
      };
    }

    if (!message.to.length) {
      console.log(
        '[email] send skipped',
        JSON.stringify({
          eventKey: message.eventKey,
          transport: this.activeTransport.name,
          recipient: null,
          subject: message.subject,
          reason: 'no_recipients',
        }),
      );

      return {
        delivered: false,
        skipped: true,
        transport: this.activeTransport.name,
      };
    }

    const payload = {
      ...message,
      from: message.from || {
        email: this.config.fromEmail,
        name: this.config.fromName,
      },
    };

    try {
      const result = await this.activeTransport.send(payload);

      console.log(
        '[email] send processed',
        JSON.stringify({
          eventKey: message.eventKey,
          transport: result.transport,
          recipient: message.to[0]?.email ?? null,
          subject: message.subject,
          delivered: result.delivered,
          skipped: result.skipped ?? false,
          referenceId: result.referenceId ?? null,
        }),
      );

      return result;
    } catch (error) {
      console.error(
        '[email] send failed',
        JSON.stringify({
          eventKey: message.eventKey,
          transport: this.activeTransport.name,
          recipient: message.to[0]?.email ?? null,
          subject: message.subject,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      throw error;
    }
  }
}

export const emailService = new EmailService();
