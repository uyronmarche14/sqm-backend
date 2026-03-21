import {
  authNotificationService,
  type AuthNotificationServiceContract,
} from './auth-notification.service.js';

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
  constructor(private readonly notifications: AuthNotificationServiceContract = authNotificationService) {}

  async sendUserCreated(input: UserCreatedNotificationInput): Promise<UserCreatedNotificationResult> {
    return this.notifications.sendAccountCreated(input);
  }
}

export const accountNotificationService = new AccountNotificationService();
