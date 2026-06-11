import { fiveM1ERepository, type FiveM1ERepository } from '../../modules/fiveM1E/fiveM1E.repository.js';
import {
  getFiveM1EWorkflowStageFormIds,
  normalizeFiveM1EWorkflowStage,
  resolveFiveM1EWorkflowStageOwner,
} from '../../modules/fiveM1E/workflow/fiveM1E-workflow.utils.js';
import { permissionService, type PermissionEligibleUser, type PermissionService } from '../services/permission.service.js';
import { getEmailConfig } from './email.config.js';
import { emailService, type EmailService } from './email.service.js';
import type { EmailAddress, EmailEventKey } from './email.types.js';
import { buildFiveM1ENotificationTemplate } from './templates/fivem1e-notification.template.js';

type FiveM1EEmailEventKey = Extract<
  EmailEventKey,
  | 'fivem1e.submitted'
  | 'fivem1e.updated'
  | 'fivem1e.assigned'
  | 'fivem1e.checked'
  | 'fivem1e.approved'
  | 'fivem1e.approved_with_condition'
  | 'fivem1e.rejected'
  | 'fivem1e.released'
>;

type FiveM1ERecordLike = Record<string, unknown>;

export interface FiveM1ENotificationSendResult {
  delivered: boolean;
  transport: string;
  referenceId?: string;
  skipped?: boolean;
  subject: string;
  recipients: string[];
  ccRecipients: string[];
  localUrl: string;
  internetUrl: string;
  recipientSource: 'explicit-owner' | 'legacy-rule' | 'queue-fallback' | 'none';
}

export interface FiveM1EWorkflowNotificationInput {
  eventKey: FiveM1EEmailEventKey;
  recordId: string;
  controlNo: string;
  pic: string;
  action: string;
  actorName: string;
  message: string;
  title?: string | null;
  record: FiveM1ERecordLike;
  fallbackFormIds?: string[];
}

function buildModuleUrl(baseUrl: string, recordId: string): string {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(`dashboard/5m1e/view/${recordId}`, normalizedBaseUrl).toString();
}

function getString(record: FiveM1ERecordLike, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
  }

  return undefined;
}

function isActive(activeFlag: boolean | number | null | undefined) {
  return activeFlag === true || activeFlag === 1 || activeFlag == null;
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

function splitRecipientTokens(value: string | undefined) {
  return String(value || '')
    .split(/[;,|\n\r]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function replaceTemplateTokens(template: string | undefined, values: Record<string, string>) {
  let output = String(template || '');

  for (const [key, rawValue] of Object.entries(values)) {
    const value = rawValue ?? '';
    const patterns = [
      new RegExp(`\\{${key}\\}`, 'gi'),
      new RegExp(`\\{\\{${key}\\}\\}`, 'gi'),
      new RegExp(`\\[${key}\\]`, 'gi'),
      new RegExp(`%${key}%`, 'gi'),
    ];

    for (const pattern of patterns) {
      output = output.replace(pattern, value);
    }
  }

  return output;
}

function looksLikeEmail(value: string) {
  return value.includes('@');
}

function getRecipientAliasIds(token: string, record: FiveM1ERecordLike): string[] {
  const normalized = token.trim().toUpperCase();
  const aliases: Record<string, string[]> = {
    MPDPIC: ['mpd_pic', 'MPDPIC'],
    MPDCHECKER: ['mpd_checker', 'MPDChecker'],
    MPDAPPROVER: ['mpd_approver', 'MPDApprover'],
    REVIEWER: ['reviewer', 'Reviewer'],
    CHECKER: ['checker', 'Checker'],
    APPROVER: ['approver', 'Approver'],
    EIC: ['evaluation_ic', 'EvaluationIC'],
    EVALUATIONIC: ['evaluation_ic', 'EvaluationIC'],
    SQECHECKER: ['checker', 'Checker'],
    SQEAPPROVER: ['approver', 'Approver'],
    FINALAPPROVER: ['final_approver', 'FinalApprover'],
    DESIGNAPPROVER: ['design_approver_id', 'DesignApproverID'],
    ENVIAPPROVER: ['envi_approver_id', 'EnviApproverID'],
    QACHECKER: ['qa_checker_id', 'QACheckerID'],
    CREATOR: ['created_by', 'CreatedBy'],
  };

  const keys = aliases[normalized];
  if (!keys) {
    return [];
  }

  const ids = keys
    .map((key) => getString(record, key))
    .filter(Boolean) as string[];

  return Array.from(new Set(ids));
}

export class FiveM1ENotificationService {
  constructor(
    private readonly mailer: EmailService = emailService,
    private readonly repository: FiveM1ERepository = fiveM1ERepository,
    private readonly permissions: PermissionService = permissionService,
  ) {}

  private async getLegacyElementMap(pic: string, action: string) {
    const rows = await this.repository.findEmailElements(pic, action);
    const entries = rows.map((row: any) => [
      String(row.element_name || '').toUpperCase(),
      String(row.element_value || ''),
    ]);
    return Object.fromEntries(entries) as Record<string, string>;
  }

  private async hydrateUserRecipients(userIds: string[]) {
    if (!userIds.length) {
      return [];
    }

    const contacts = (await this.repository.findUserContactsByIds(userIds)) || [];
    return normalizeRecipients(
      contacts
        .filter((contact: any) => isActive(contact.activeFlag) && contact.email)
        .map((contact: any) => ({
          email: String(contact.email),
          name: contact.fullName ? String(contact.fullName) : undefined,
        })),
    );
  }

  private async resolveQueueRecipients(formIds: string[]) {
    const eligible = new Map<string, PermissionEligibleUser>();
    for (const formId of formIds) {
      const users = (await this.permissions.findUsersWithRolePermission(formId, 'viewlist')) || [];
      for (const user of users) {
        eligible.set(user.userId, user);
      }
    }

    return this.hydrateUserRecipients(Array.from(eligible.keys()));
  }

  private async resolveLegacyRecipients(
    rawValue: string | undefined,
    record: FiveM1ERecordLike,
    replacements: Record<string, string>,
  ) {
    const resolved = replaceTemplateTokens(rawValue, replacements);
    const tokens = splitRecipientTokens(resolved);
    const directEmails: EmailAddress[] = [];
    const userIds = new Set<string>();

    for (const token of tokens) {
      if (looksLikeEmail(token)) {
        directEmails.push({ email: token });
        continue;
      }

      const aliasIds = getRecipientAliasIds(token, record);
      if (aliasIds.length > 0) {
        aliasIds.forEach((id) => userIds.add(id));
        continue;
      }

      userIds.add(token);
    }

    const hydrated = await this.hydrateUserRecipients(Array.from(userIds));
    return normalizeRecipients([...directEmails, ...hydrated]);
  }

  async sendWorkflowNotification(
    input: FiveM1EWorkflowNotificationInput,
  ): Promise<FiveM1ENotificationSendResult> {
    const config = getEmailConfig();
    const localUrl = buildModuleUrl(config.localBaseUrl, input.recordId);
    const internetUrl = buildModuleUrl(config.internetBaseUrl, input.recordId);
    const replacements = {
      CONTROLNO: input.controlNo,
      CONTROL_NO: input.controlNo,
      TITLE: input.title || getString(input.record, 'Title', 'title') || '-',
      REQUEST_TITLE: input.title || getString(input.record, 'Title', 'title') || '-',
      SUPPLIER: getString(input.record, 'supplier_name', 'supplierName') || '-',
      SUPPLIER_NAME: getString(input.record, 'supplier_name', 'supplierName') || '-',
      SITE: getString(input.record, 'site_name', 'siteName') || '-',
      SITE_NAME: getString(input.record, 'site_name', 'siteName') || '-',
      ACTOR: input.actorName,
      ACTOR_NAME: input.actorName,
      LOCAL_URL: localUrl,
      INTERNET_URL: internetUrl,
      WEB_URL: internetUrl,
      PIC: input.pic,
      ACTION: input.action,
      RECORD_ID: input.recordId,
    };
    const legacyElements = await this.getLegacyElementMap(input.pic, input.action);
    const stage = normalizeFiveM1EWorkflowStage(input.record);
    const explicitOwner = resolveFiveM1EWorkflowStageOwner(input.record, stage);

    const explicitOwnerRecipients = explicitOwner.id
      ? await this.hydrateUserRecipients([explicitOwner.id])
      : [];
    const legacyTo = await this.resolveLegacyRecipients(legacyElements.EMAIL_TO, input.record, replacements);
    const legacyCc = await this.resolveLegacyRecipients(legacyElements.EMAIL_CC, input.record, replacements);
    const fallbackFormIds = input.fallbackFormIds && input.fallbackFormIds.length > 0
      ? input.fallbackFormIds
      : getFiveM1EWorkflowStageFormIds(stage);
    const ccUsers = normalizeRecipients(
      (await this.repository.findCCUsers(input.controlNo))
        .filter((row: any) => row.email)
        .map((row: any) => ({
          email: String(row.email),
          name: row.full_name ? String(row.full_name) : undefined,
        })),
    );

    let to = explicitOwnerRecipients;
    let recipientSource: FiveM1ENotificationSendResult['recipientSource'] = 'explicit-owner';

    if (to.length === 0) {
      to = legacyTo;
      recipientSource = to.length > 0 ? 'legacy-rule' : 'none';
    }

    if (to.length === 0) {
      const queueRecipients = await this.resolveQueueRecipients(fallbackFormIds);
      to = queueRecipients;
      recipientSource = to.length > 0 ? 'queue-fallback' : 'none';
    }

    if (to.length === 0) {
      return {
        delivered: false,
        skipped: true,
        transport: config.transport,
        subject: replaceTemplateTokens(legacyElements.EMAIL_SUBJECT, replacements) || input.title || '5M1E Workflow Notification',
        recipients: [],
        ccRecipients: [],
        localUrl,
        internetUrl,
        recipientSource,
      };
    }

    const toEmails = new Set(to.map((recipient) => recipient.email.toLowerCase()));
    const cc = normalizeRecipients([...legacyCc, ...ccUsers]).filter(
      (recipient) => !toEmails.has(recipient.email.toLowerCase()),
    );
    const subject =
      replaceTemplateTokens(legacyElements.EMAIL_SUBJECT, replacements) ||
      input.title ||
      '5M1E Workflow Notification';
    const message =
      replaceTemplateTokens(legacyElements.EMAIL_BODY, replacements) ||
      input.message;
    const rendered = buildFiveM1ENotificationTemplate({
      subject,
      title: subject,
      message,
      controlNo: input.controlNo,
      requestTitle: replacements.TITLE,
      supplierName: replacements.SUPPLIER_NAME,
      siteName: replacements.SITE_NAME,
      actorName: input.actorName,
      pic: input.pic,
      action: input.action,
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
        module: '5M1E',
        action: input.action,
        pic: input.pic,
        recordId: input.recordId,
        controlNo: input.controlNo,
        recipientSource,
      },
    });

    return {
      ...result,
      subject: rendered.subject,
      recipients: to.map((recipient) => recipient.email),
      ccRecipients: cc.map((recipient) => recipient.email),
      localUrl,
      internetUrl,
      recipientSource,
    };
  }
}

export const fiveM1ENotificationService = new FiveM1ENotificationService();
