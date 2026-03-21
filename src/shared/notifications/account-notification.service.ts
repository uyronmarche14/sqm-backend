import { emailService, EmailService } from './email.service.js';
import { getEmailConfig } from './email.config.js';
import { buildAccountCreatedTemplate } from './templates/account-created.template.js';

export interface UserCreatedNotificationInput {
  fullName: string;
  email: string;
  temporaryPassword: string;
  roleName?: string | null;
  siteId?: string | null;
}

export interface UserCreatedNotificationResult {
  delivered: boolean;
  transport: string;
  referenceId?: string;
  skipped?: boolean;
  subject: string;
  recipient: string;
  localUrl: string;
  internetUrl: string;
}

export interface UserNotificationSender {
  sendUserCreated(input: UserCreatedNotificationInput): Promise<UserCreatedNotificationResult>;
}

export class AccountNotificationService implements UserNotificationSender {
  constructor(private readonly mailer: EmailService = emailService) {}

  async sendUserCreated(input: UserCreatedNotificationInput): Promise<UserCreatedNotificationResult> {
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
}

export const accountNotificationService = new AccountNotificationService();
