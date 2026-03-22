import { getEmailConfig } from './email.config.js';
import { emailService, type EmailService } from './email.service.js';
import type { EmailAddress, EmailEventKey } from './email.types.js';
import { buildNpiNotificationTemplate } from './templates/npi-notification.template.js';

type NpiEmailEventKey = Extract<
  EmailEventKey,
  'npi.submitted' | 'npi.checked' | 'npi.approved' | 'npi.rejected'
>;

export interface NpiNotificationSendResult {
  delivered: boolean;
  transport: string;
  referenceId?: string;
  skipped?: boolean;
  subject: string;
  recipients: string[];
  localUrl: string;
  internetUrl: string;
}

export interface NpiWorkflowNotificationInput {
  eventKey: NpiEmailEventKey;
  recordId: string;
  controlNo: string;
  supplierName: string;
  message: string;
  subject: string;
  to: EmailAddress[];
  cc?: EmailAddress[];
}

export interface NpiNotificationSender {
  sendWorkflowNotification(input: NpiWorkflowNotificationInput): Promise<NpiNotificationSendResult>;
}

function buildModuleUrl(baseUrl: string, recordId: string): string {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(`dashboard/new-parts/view/${recordId}`, normalizedBaseUrl).toString();
}

function normalizeRecipients(recipients: EmailAddress[] | undefined): EmailAddress[] {
  if (!recipients?.length) return [];

  const seen = new Set<string>();
  const normalized: EmailAddress[] = [];

  for (const recipient of recipients) {
    const email = String(recipient.email || '').trim();
    if (!email) continue;

    const key = email.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    normalized.push({
      email,
      name: recipient.name?.trim() || undefined,
    });
  }

  return normalized;
}

export class NpiNotificationService implements NpiNotificationSender {
  constructor(private readonly mailer: EmailService = emailService) {}

  async sendWorkflowNotification(input: NpiWorkflowNotificationInput): Promise<NpiNotificationSendResult> {
    const config = getEmailConfig();
    const localUrl = buildModuleUrl(config.localBaseUrl, input.recordId);
    const internetUrl = buildModuleUrl(config.internetBaseUrl, input.recordId);
    const to = normalizeRecipients(input.to);
    const toEmails = new Set(to.map((recipient) => recipient.email.toLowerCase()));
    const cc = normalizeRecipients(input.cc).filter(
      (recipient) => !toEmails.has(recipient.email.toLowerCase()),
    );
    const rendered = buildNpiNotificationTemplate({
      subject: input.subject,
      message: input.message,
      controlNo: input.controlNo,
      supplierName: input.supplierName,
      localUrl,
      internetUrl,
    });

    const result = await this.mailer.send({
      eventKey: input.eventKey,
      to,
      cc,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      metadata: {
        module: 'NPI',
        action: input.eventKey,
        recordId: input.recordId,
      },
    });

    return {
      ...result,
      subject: rendered.subject,
      recipients: to.map((recipient) => recipient.email),
      localUrl,
      internetUrl,
    };
  }
}

export const npiNotificationService = new NpiNotificationService();
