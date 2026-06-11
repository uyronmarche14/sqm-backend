import type { EmailMessage, EmailSendResult, EmailTransport } from '../email.types.js';

export class ConsoleEmailTransport implements EmailTransport {
  readonly name = 'console';

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const payload = {
      eventKey: message.eventKey,
      subject: message.subject,
      from: message.from,
      to: message.to,
      cc: message.cc || [],
      bcc: message.bcc || [],
      text: message.text,
      metadata: message.metadata || {},
    };

    console.log('[email:console]', JSON.stringify(payload, null, 2));

    return {
      delivered: true,
      transport: this.name,
      referenceId: `console-${Date.now()}`,
    };
  }
}

