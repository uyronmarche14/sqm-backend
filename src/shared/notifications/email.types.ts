export type EmailEventKey =
  | 'auth.registration.notification'
  | 'auth.password.changed'
  | 'auth.password.reset.requested'
  | 'auth.account.verification';

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailMessage {
  eventKey: EmailEventKey;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  html: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface EmailSendResult {
  delivered: boolean;
  transport: string;
  referenceId?: string;
  skipped?: boolean;
}

export interface EmailTransport {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}
