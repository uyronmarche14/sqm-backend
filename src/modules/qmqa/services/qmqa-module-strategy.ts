import { getSubFormFormCodes } from '@sqm/permissions-contract';
import { getQmqaCompatibilityStatus } from '../workflow/qmqa-workflow.utils.js';

export type QmqaModuleVariant = 'QMQA' | 'QMQA_MEDIA';

export const sanitizeUUID = (value: string | null | undefined): string | null => {
  return value && value.trim() !== '' ? value : null;
};

const QMQA_QUEUE_STATUS_FORM_FALLBACKS: Record<QmqaModuleVariant, Record<string, string[]>> = {
  QMQA: {
    WITH_INITIAL_REPORT: ['QMQA-05-05'],
    RESPONSE_AWAITING_CHECKED: ['QMQA-05-09'],
    RESPONSE_AWAITING_APPROVAL: ['QMQA-05-09'],
    RESPONSE_AWAIT_APPROVAL: ['QMQA-05-09'],
    CLOSED: ['QMQA-05-01'],
  },
  QMQA_MEDIA: {
    WITH_INITIAL_REPORT: ['QMQA-MEDIA-05'],
    RESPONSE_AWAITING_CHECKED: ['QMQA-MEDIA-09'],
    RESPONSE_AWAITING_APPROVAL: ['QMQA-MEDIA-09'],
    RESPONSE_AWAIT_APPROVAL: ['QMQA-MEDIA-09'],
    CLOSED: ['QMQA-MEDIA-11'],
  },
};

const QMQA_QUEUE_STAGES = [
  'NEW',
  'DRAFT',
  'AWAITING_CHECKED',
  'AWAITING_APPROVAL',
  'REJECTED',
  'ISSUED',
  'APPROVED',
  'CANCELLED',
  'WITH_INITIAL_REPORT',
  'WITH_FINAL_REPORT',
  'RESPONSE_AWAITING_CHECKED',
  'RESPONSE_AWAITING_APPROVAL',
  'RESPONSE_AWAIT_APPROVAL',
  'RESPONSE_REJECTED',
  'CLOSED',
  'ACHIEVEMENT',
  'SEARCH',
] as const;

function uniqueFormCodes(formIds: string[]) {
  return Array.from(new Set(formIds.filter(Boolean)));
}

function resolveQmqaQueueFormUniverse(variant: QmqaModuleVariant) {
  const contractCodes = QMQA_QUEUE_STAGES.flatMap((stage) => getSubFormFormCodes(variant, stage));
  const fallbackCodes = Object.values(QMQA_QUEUE_STATUS_FORM_FALLBACKS[variant]).flat();
  return uniqueFormCodes([...contractCodes, ...fallbackCodes]);
}

const QMQA_QUEUE_FORM_CODES: Record<QmqaModuleVariant, string[]> = {
  QMQA: resolveQmqaQueueFormUniverse('QMQA'),
  QMQA_MEDIA: resolveQmqaQueueFormUniverse('QMQA_MEDIA'),
};

export class QmqaModuleStrategy {
  resolveQueueFormCodes(
    variant: QmqaModuleVariant,
    stageOrStatus: string | null | undefined,
  ) {
    const normalized = String(stageOrStatus || '').trim().toUpperCase();
    return uniqueFormCodes([
      ...getSubFormFormCodes(variant, normalized),
      ...(QMQA_QUEUE_STATUS_FORM_FALLBACKS[variant][normalized] || []),
    ]);
  }

  resolveRecordFormCodes(
    record: Record<string, any>,
    latestResponse: Record<string, any> | null | undefined,
    variant: QmqaModuleVariant,
  ) {
    const compatibilityStatus = getQmqaCompatibilityStatus(
      record?.request_status,
      latestResponse || null,
      record,
    );
    const resolved = this.resolveQueueFormCodes(variant, compatibilityStatus);
    return resolved.length > 0 ? resolved : QMQA_QUEUE_FORM_CODES[variant];
  }

  getQueueFormCodes(variant: QmqaModuleVariant) {
    return QMQA_QUEUE_FORM_CODES[variant];
  }
}

export const qmqaModuleStrategy = new QmqaModuleStrategy();
