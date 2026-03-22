export type EmailEventKey =
  | 'auth.registration.notification'
  | 'auth.password.changed'
  | 'auth.password.reset.requested'
  | 'auth.account.verification'
  | 'ogi.submitted'
  | 'npi.submitted'
  | 'npi.checked'
  | 'npi.approved'
  | 'npi.rejected'
  | 'sqpr.submitted'
  | 'sqpr.checked'
  | 'sqpr.approved'
  | 'sqpr.rejected'
  | 'sqpr.issued';

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
