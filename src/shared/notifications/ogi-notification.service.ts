import { getEmailConfig } from './email.config.js';
import { emailService, type EmailService } from './email.service.js';
import type { EmailAddress, EmailEventKey } from './email.types.js';
import { buildOgiNotificationTemplate } from './templates/ogi-notification.template.js';

type OgiEmailEventKey = Extract<EmailEventKey, 'ogi.submitted'>;

export interface OgiNotificationSendResult {
  delivered: boolean;
  transport: string;
  referenceId?: string;
  skipped?: boolean;
  subject: string;
  recipients: string[];
  localUrl: string;
  internetUrl: string;
}

export interface OgiSubmittedNotificationInput {
  eventKey: OgiEmailEventKey;
  recordId: string;
  controlNo: string;
  supplierName: string;
  siteName?: string | null;
  submittedByName: string;
  submittedDate: string;
  message: string;
  subject: string;
  to: EmailAddress[];
}

export interface OgiNotificationSender {
  sendSubmittedNotification(input: OgiSubmittedNotificationInput): Promise<OgiNotificationSendResult>;
}

function buildModuleUrl(baseUrl: string, recordId: string): string {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(`dashboard/ogi-up/view/${recordId}`, normalizedBaseUrl).toString();
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

export class OgiNotificationService implements OgiNotificationSender {
  constructor(private readonly mailer: EmailService = emailService) {}

  async sendSubmittedNotification(input: OgiSubmittedNotificationInput): Promise<OgiNotificationSendResult> {
    const config = getEmailConfig();
    const localUrl = buildModuleUrl(config.localBaseUrl, input.recordId);
    const internetUrl = buildModuleUrl(config.internetBaseUrl, input.recordId);
    const to = normalizeRecipients(input.to);
    const rendered = buildOgiNotificationTemplate({
      subject: input.subject,
      message: input.message,
      controlNo: input.controlNo,
      supplierName: input.supplierName,
      siteName: input.siteName,
      submittedByName: input.submittedByName,
      submittedDate: input.submittedDate,
      localUrl,
      internetUrl,
    });

    const result = await this.mailer.send({
      eventKey: input.eventKey,
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      metadata: {
        module: 'OGI',
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

export const ogiNotificationService = new OgiNotificationService();
