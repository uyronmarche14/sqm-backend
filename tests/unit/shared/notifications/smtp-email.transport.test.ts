import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmailConfig } from '../../../../src/shared/notifications/email.config.js';

const { sendMailMock, createTransportMock } = vi.hoisted(() => {
  const sendMail = vi.fn();
  const createTransport = vi.fn(() => ({
    sendMail,
  }));

  return {
    sendMailMock: sendMail,
    createTransportMock: createTransport,
  };
});

vi.mock('nodemailer', () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

import { SmtpEmailTransport } from '../../../../src/shared/notifications/transports/smtp-email.transport.js';

describe('SmtpEmailTransport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates email delivery to nodemailer', async () => {
    sendMailMock.mockResolvedValue({ messageId: '<message-id@example.com>' });

    const config: EmailConfig = {
      enabled: true,
      transport: 'smtp',
      fromEmail: 'mailer@example.com',
      fromName: 'SQM Notifications',
      outputDir: '/tmp/emails',
      frontendBaseUrl: 'http://localhost:5173',
      loginPath: '/auth/login',
      localBaseUrl: 'http://localhost:5173',
      internetBaseUrl: 'https://sqm.example.com',
      localUrl: 'http://localhost:5173/auth/login',
      internetUrl: 'https://sqm.example.com/auth/login',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: 'mailer@example.com',
      smtpPass: 'app-password',
    };

    const transport = new SmtpEmailTransport(config);
    const result = await transport.send({
      eventKey: 'auth.registration.notification',
      from: { email: 'mailer@example.com', name: 'SQM Notifications' },
      to: [{ email: 'recipient@example.com', name: 'Recipient' }],
      subject: 'Account Confirmation',
      html: '<p>Hello</p>',
      text: 'Hello',
    });

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.gmail.com',
        port: 587,
      }),
    );
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Account Confirmation',
        text: 'Hello',
      }),
    );
    expect(result.referenceId).toBe('<message-id@example.com>');
    expect(result.transport).toBe('smtp');
  });
});
