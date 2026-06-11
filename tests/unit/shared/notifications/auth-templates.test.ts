import { describe, expect, it } from 'vitest';
import { buildPasswordChangedTemplate } from '../../../../src/shared/notifications/templates/password-changed.template.js';
import { buildPasswordResetRequestTemplate } from '../../../../src/shared/notifications/templates/password-reset-request.template.js';
import { buildAccountVerificationTemplate } from '../../../../src/shared/notifications/templates/account-verification.template.js';

describe('auth notification templates', () => {
  it('renders the password-changed template with the Toshiba-branded wrapper', () => {
    const rendered = buildPasswordChangedTemplate({
      fullName: 'QA User',
      email: 'qa.user@example.com',
      localUrl: 'http://localhost:5000/auth/login',
      internetUrl: 'https://sqm.example.com/auth/login',
    });

    expect(rendered.subject).toBe('Password Change Confirmation');
    expect(rendered.html).toContain('TOSHIBA');
    expect(rendered.html).toContain('Password Change Confirmation');
    expect(rendered.html).toContain('http://localhost:5000/auth/login');
    expect(rendered.html).toContain('https://sqm.example.com/auth/login');
  });

  it('renders the forgot-password reset email with the supplied reset URL', () => {
    const rendered = buildPasswordResetRequestTemplate({
      fullName: 'QA User',
      email: 'qa.user@example.com',
      resetUrl: 'https://sqm.example.com/auth/reset-password?token=test-token',
      expiresInMinutes: 15,
    });

    expect(rendered.subject).toBe('Reset Your SQM Password');
    expect(rendered.html).toContain('reset-password?token=test-token');
    expect(rendered.text).toContain('Expires In: 15 minutes');
  });

  it('renders the verification email with the supplied verification URL', () => {
    const rendered = buildAccountVerificationTemplate({
      fullName: 'QA User',
      email: 'qa.user@example.com',
      verificationUrl: 'https://sqm.example.com/auth/verification?token=test-token',
    });

    expect(rendered.subject).toBe('SQM Account Verification');
    expect(rendered.html).toContain('verification?token=test-token');
    expect(rendered.html).toContain('Please verify your Toshiba Global SQM account');
  });
});
