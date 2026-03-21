import { emailService, type EmailService } from './email.service.js';
import { getEmailConfig } from './email.config.js';
import { buildAccountCreatedTemplate } from './templates/account-created.template.js';
import { buildPasswordChangedTemplate } from './templates/password-changed.template.js';
import { buildPasswordResetRequestTemplate } from './templates/password-reset-request.template.js';
import { buildAccountVerificationTemplate } from './templates/account-verification.template.js';

export interface NotificationSendResult {
  delivered: boolean;
  transport: string;
  referenceId?: string;
  skipped?: boolean;
  subject: string;
  recipient: string;
}

export interface AuthNotificationServiceContract {
  sendAccountCreated(input: {
    fullName: string;
    email: string;
    temporaryPassword: string;
    roleName?: string | null;
    siteId?: string | null;
  }): Promise<NotificationSendResult & { localUrl: string; internetUrl: string }>;
  sendPasswordChanged(input: {
    fullName: string;
    email: string;
  }): Promise<NotificationSendResult & { localUrl: string; internetUrl: string }>;
  sendPasswordResetRequested(input: {
    fullName: string;
    email: string;
    resetUrl: string;
    expiresInMinutes?: number;
  }): Promise<NotificationSendResult & { resetUrl: string }>;
  sendAccountVerification(input: {
    fullName: string;
    email: string;
    verificationUrl: string;
  }): Promise<NotificationSendResult & { verificationUrl: string }>;
}

export class AuthNotificationService implements AuthNotificationServiceContract {
  constructor(private readonly mailer: EmailService = emailService) {}

  async sendAccountCreated(input: {
    fullName: string;
    email: string;
    temporaryPassword: string;
    roleName?: string | null;
    siteId?: string | null;
  }) {
    const config = getEmailConfig();
    const rendered = buildAccountCreatedTemplate({
      ...input,
      localUrl: config.localUrl,
      internetUrl: config.internetUrl,
    });

    const result = await this.mailer.send({
      eventKey: 'auth.registration.notification',
      to: [{ email: input.email, name: input.fullName }],
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      metadata: {
        module: 'USERS',
        action: 'create',
      },
    });

    return {
      ...result,
      subject: rendered.subject,
      recipient: input.email,
      localUrl: config.localUrl,
      internetUrl: config.internetUrl,
    };
  }

  async sendPasswordChanged(input: { fullName: string; email: string }) {
    const config = getEmailConfig();
    const rendered = buildPasswordChangedTemplate({
      ...input,
      localUrl: config.localUrl,
      internetUrl: config.internetUrl,
    });

    const result = await this.mailer.send({
      eventKey: 'auth.password.changed',
      to: [{ email: input.email, name: input.fullName }],
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      metadata: {
        module: 'AUTH',
        action: 'change_password',
      },
    });

    return {
      ...result,
      subject: rendered.subject,
      recipient: input.email,
      localUrl: config.localUrl,
      internetUrl: config.internetUrl,
    };
  }

  async sendPasswordResetRequested(input: {
    fullName: string;
    email: string;
    resetUrl: string;
    expiresInMinutes?: number;
  }) {
    const rendered = buildPasswordResetRequestTemplate(input);
    const result = await this.mailer.send({
      eventKey: 'auth.password.reset.requested',
      to: [{ email: input.email, name: input.fullName }],
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      metadata: {
        module: 'AUTH',
        action: 'forgot_password',
      },
    });

    return {
      ...result,
      subject: rendered.subject,
      recipient: input.email,
      resetUrl: input.resetUrl,
    };
  }

  async sendAccountVerification(input: {
    fullName: string;
    email: string;
    verificationUrl: string;
  }) {
    const rendered = buildAccountVerificationTemplate(input);
    const result = await this.mailer.send({
      eventKey: 'auth.account.verification',
      to: [{ email: input.email, name: input.fullName }],
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      metadata: {
        module: 'AUTH',
        action: 'verify_account',
      },
    });

    return {
      ...result,
      subject: rendered.subject,
      recipient: input.email,
      verificationUrl: input.verificationUrl,
    };
  }
}

export const authNotificationService = new AuthNotificationService();
