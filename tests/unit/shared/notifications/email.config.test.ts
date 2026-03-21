import { afterEach, describe, expect, it } from 'vitest';
import { getEmailConfig } from '../../../../src/shared/notifications/email.config.js';

const originalEnv = { ...process.env };

describe('email.config', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('accepts file transport', () => {
    process.env.EMAIL_TRANSPORT = 'file';

    const config = getEmailConfig();

    expect(config.transport).toBe('file');
  });

  it('accepts console transport', () => {
    process.env.EMAIL_TRANSPORT = 'console';

    const config = getEmailConfig();

    expect(config.transport).toBe('console');
  });

  it('accepts smtp transport and resolves smtp config', () => {
    process.env.EMAIL_TRANSPORT = 'smtp';
    process.env.EMAIL_FROM = 'mailer@example.com';
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'mailer@example.com';
    process.env.SMTP_PASS = 'app-password';

    const config = getEmailConfig();

    expect(config.transport).toBe('smtp');
    expect(config.smtpHost).toBe('smtp.gmail.com');
    expect(config.smtpPort).toBe(587);
    expect(config.smtpUser).toBe('mailer@example.com');
  });

  it('throws for invalid transport values', () => {
    process.env.EMAIL_TRANSPORT = 'ses';

    expect(() => getEmailConfig()).toThrow('Invalid EMAIL_TRANSPORT');
  });

  it('throws when smtp transport is selected without required config', () => {
    process.env.EMAIL_TRANSPORT = 'smtp';
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    expect(() => getEmailConfig()).toThrow('Missing required email configuration');
  });
});
