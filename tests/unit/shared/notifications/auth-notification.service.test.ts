import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthNotificationService } from '../../../../src/shared/notifications/auth-notification.service.js';

const sendMock = vi.fn();

vi.mock('../../../../src/shared/notifications/email.config.js', () => ({
  getEmailConfig: vi.fn(() => ({
    enabled: true,
    transport: 'smtp',
    fromEmail: 'noreply@example.com',
    fromName: 'SQM Notifications',
    outputDir: '/tmp/emails',
    frontendBaseUrl: 'http://localhost:5000',
    loginPath: '/auth/login',
    localBaseUrl: 'http://localhost:5000',
    internetBaseUrl: 'https://sqm.example.com',
    localUrl: 'http://localhost:5000/auth/login',
    internetUrl: 'https://sqm.example.com/auth/login',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: 'mailer@example.com',
    smtpPass: 'secret',
  })),
}));

describe('AuthNotificationService', () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({
      delivered: true,
      transport: 'smtp',
      referenceId: '<message-id@example.com>',
    });
  });

  it('renders and sends password-changed notifications with dual URLs', async () => {
    const service = new AuthNotificationService({
      send: sendMock,
    } as any);

    const result = await service.sendPasswordChanged({
      fullName: 'QA User',
      email: 'qa.user@example.com',
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: 'auth.password.changed',
        to: [{ email: 'qa.user@example.com', name: 'QA User' }],
        subject: 'Password Change Confirmation',
      }),
    );
    expect(result.localUrl).toBe('http://localhost:5000/auth/login');
    expect(result.internetUrl).toBe('https://sqm.example.com/auth/login');
  });

  it('renders password reset request notifications', async () => {
    const service = new AuthNotificationService({
      send: sendMock,
    } as any);

    const result = await service.sendPasswordResetRequested({
      fullName: 'QA User',
      email: 'qa.user@example.com',
      resetUrl: 'https://sqm.example.com/auth/reset-password?token=test-token',
      expiresInMinutes: 15,
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: 'auth.password.reset.requested',
        subject: 'Reset Your SQM Password',
      }),
    );
    expect(result.resetUrl).toContain('reset-password');
  });

  it('renders account verification notifications', async () => {
    const service = new AuthNotificationService({
      send: sendMock,
    } as any);

    const result = await service.sendAccountVerification({
      fullName: 'QA User',
      email: 'qa.user@example.com',
      verificationUrl: 'https://sqm.example.com/auth/verification?token=test-token',
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: 'auth.account.verification',
        subject: 'SQM Account Verification',
      }),
    );
    expect(result.verificationUrl).toContain('verification');
  });
});
