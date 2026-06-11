import { z } from 'zod';
import { SSI_STATUSES, SSI_WORKFLOW_ACTIONS } from './types/ssi.types.js';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH_PATTERN = /^\d{4}-\d{2}$/;

function trimString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

function emptyStringToUndefined(value: unknown) {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseBooleanFlag(value: unknown) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  return undefined;
}

function isValidIsoDate(value: string) {
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidIsoMonth(value: string) {
  const [yearText, monthText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  return Number.isInteger(year) && Number.isInteger(month) && month >= 1 && month <= 12;
}

const optionalString = () =>
  z.preprocess(emptyStringToUndefined, z.string().optional());

const requiredString = (label: string) =>
  z.preprocess(trimString, z.string().min(1, `${label} is required`));

const optionalDateString = () =>
  z.preprocess(
    emptyStringToUndefined,
    z.string().regex(ISO_DATE_PATTERN, 'Expected YYYY-MM-DD date format').refine(isValidIsoDate, 'Invalid calendar date').optional(),
  );

const optionalMonthString = () =>
  z.preprocess(
    emptyStringToUndefined,
    z.string().regex(ISO_MONTH_PATTERN, 'Expected YYYY-MM month format').refine(isValidIsoMonth, 'Invalid month value').optional(),
  );

const ssiStatusSchema = z.enum(SSI_STATUSES);
const ssiWorkflowActionSchema = z.enum(SSI_WORKFLOW_ACTIONS);
const ssiCategorySchema = z.enum([
  'QUALIFICATION',
  'REQUALIFICATION',
  'CERTIFICATION',
  'RECERTIFICATION',
  'AUDIT',
]);

const attachmentSchema = z.object({
  id: optionalString(),
  fileName: optionalString(),
  fileUrl: optionalString(),
  fileExtension: optionalString(),
  uploadedAt: optionalString(),
  uploadedBy: optionalString(),
});

const inspectorRegistrationSchema = z.object({
  id: optionalString(),
  inspectorId: optionalString(),
  name: optionalString(),
  firstName: optionalString(),
  middleName: optionalString(),
  lastName: optionalString(),
  category: optionalString(),
  company: optionalString(),
  role: optionalString(),
  scheduledDate: optionalDateString(),
  remarks: optionalString(),
});

const writtenExamSchema = z.object({
  overviewAttachments: z.array(attachmentSchema).default([]),
  writtenExamAttachments: z.array(attachmentSchema).default([]),
  answerSheetAttachments: z.array(attachmentSchema).default([]),
  remarks: optionalString(),
});

const repeatabilityTrialSchema = z.object({
  id: optionalString(),
  label: optionalString(),
  score: z.number().nullable().optional(),
  result: z.enum(['PASSED', 'FAILED', 'PENDING']).nullable().optional(),
  remarks: optionalString(),
  attachments: z.array(attachmentSchema).default([]),
});

const repeatabilityStudySchema = z.object({
  id: optionalString(),
  title: optionalString(),
  summaryRemarks: optionalString(),
  trials: z.array(repeatabilityTrialSchema).default([]),
});

const artifactSchema = z.object({
  id: optionalString(),
  subtype: optionalString(),
  label: optionalString(),
  owner: z.enum(['ISSUER', 'SUPPLIER']).optional(),
  score: z.number().nullable().optional(),
  result: z.enum(['PASSED', 'FAILED', 'PENDING']).nullable().optional(),
  remarks: optionalString(),
  allowedFileTypes: z.array(z.string()).default([]),
  attachments: z.array(attachmentSchema).default([]),
});

const certificateSchema = z.object({
  inspectorCertificateGenerated: z.boolean().optional(),
  companyCertificateGenerated: z.boolean().optional(),
  inspectorTemplateName: optionalString(),
  companyTemplateName: optionalString(),
  issueDate: optionalDateString(),
  signatoryId: optionalString(),
  signatoryName: optionalString(),
  signatoryTitle: optionalString(),
  remarks: optionalString(),
  attachments: z.array(attachmentSchema).default([]),
});

const ccSchema = z.object({
  id: optionalString(),
  userId: optionalString(),
  name: optionalString(),
  email: optionalString(),
});

const approverSchema = z.object({
  id: optionalString(),
  role: z.enum(['ISSUER', 'CHECKER', 'APPROVER']),
  userId: optionalString(),
  userName: optionalString(),
  remarks: optionalString(),
  approvedAt: optionalString(),
});

const notificationSchema = z.object({
  id: optionalString(),
  event: optionalString(),
  audience: z.enum(['ISSUER', 'SUPPLIER', 'CHECKER', 'APPROVER', 'CC']).optional(),
  triggerAction: optionalString(),
  deepLinkTarget: optionalString(),
});

export const SsiIdParamSchema = z.object({
  params: z.object({
    id: requiredString('SSI ID'),
  }),
});

export const SsiArtifactIdParamSchema = z.object({
  params: z.object({
    id: requiredString('SSI record ID'),
  }),
});

export const SsiPlanInputSchema = z.object({
  id: optionalString(),
  controlNo: optionalString(),
  mfgSiteId: requiredString('Site'),
  mfgSiteName: optionalString(),
  supplierId: requiredString('Supplier'),
  supplierName: optionalString(),
  categoryFamily: ssiCategorySchema,
  auditType: optionalString(),
  scheduledDate: z.preprocess(
    trimString,
    z.string().regex(ISO_DATE_PATTERN, 'Expected YYYY-MM-DD date format').refine(isValidIsoDate, 'Invalid calendar date'),
  ),
  sqePicId: optionalString(),
  sqePicName: optionalString(),
  remarks: optionalString(),
  status: z.enum(['PLANNED', 'CANCELLED']).optional(),
}).superRefine((record, ctx) => {
  if (record.status === 'CANCELLED' && !record.remarks) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Cancellation remarks should be provided when cancelling a plan',
      path: ['remarks'],
    });
  }
});

export const SsiPlanCancelInputSchema = z.object({
  remarks: optionalString(),
});

export const SsiRecordInputSchema = z.object({
  id: optionalString(),
  scheduleId: optionalString(),
  controlNo: optionalString(),
  status: ssiStatusSchema.optional(),
  categoryFamily: ssiCategorySchema,
  mfgSiteId: requiredString('Site'),
  mfgSiteName: optionalString(),
  supplierId: requiredString('Supplier'),
  supplierName: optionalString(),
  auditType: optionalString(),
  sqePicId: optionalString(),
  sqePicName: optionalString(),
  scheduledDate: z.preprocess(
    trimString,
    z.string().regex(ISO_DATE_PATTERN, 'Expected YYYY-MM-DD date format').refine(isValidIsoDate, 'Invalid calendar date'),
  ),
  remarks: optionalString(),
  overallJudgment: z.enum(['PASSED', 'FAILED', 'PENDING']).optional(),
  overallJudgmentRemarks: optionalString(),
  inspectorRegistrations: z.array(inspectorRegistrationSchema).default([]),
  writtenExam: writtenExamSchema.default({
    overviewAttachments: [],
    writtenExamAttachments: [],
    answerSheetAttachments: [],
  }),
  repeatabilityStudy: repeatabilityStudySchema.default({
    id: 'repeatability',
    title: 'Repeatability Study',
    trials: [],
  }),
  auditArtifacts: z.array(artifactSchema).default([]),
  certificate: certificateSchema.optional(),
  ccList: z.array(ccSchema).default([]),
  approvers: z.array(approverSchema).default([]),
  notifications: z.array(notificationSchema).default([]),
  availableActions: z.array(ssiWorkflowActionSchema).optional(),
});

export const SsiRecordListQuerySchema = z.object({
  query: z.object({
    status: optionalString(),
    assignedToMe: z.preprocess(parseBooleanFlag, z.boolean().optional()),
    scope: optionalString(),
    surface: optionalString(),
    reportView: z.preprocess(parseBooleanFlag, z.boolean().optional()),
  }),
});

export const SsiSearchQuerySchema = z.object({
  query: z.object({
    keyword: optionalString(),
    category: optionalString(),
    status: optionalString(),
    dateFrom: optionalDateString(),
    dateTo: optionalDateString(),
    month: optionalMonthString(),
  }),
}).superRefine(({ query }, ctx) => {
  if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'dateTo must be on or after dateFrom',
      path: ['query', 'dateTo'],
    });
  }
});

export const SsiWorkflowActionBodySchema = z.object({
  remarks: optionalString(),
});

export const SsiResponseSaveBodySchema = z.object({
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const SsiResponseReviewBodySchema = z.object({
  outcome: z.enum(['approve', 'reject']).optional(),
  remarks: optionalString(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const SsiArtifactPayloadSchema = z.object({
  remarks: optionalString(),
  inspectorTemplateName: optionalString(),
  companyTemplateName: optionalString(),
  signatoryId: optionalString(),
  signatoryName: optionalString(),
  signatoryTitle: optionalString(),
});

export type SsiPlanInput = z.infer<typeof SsiPlanInputSchema>;
export type SsiRecordInput = z.infer<typeof SsiRecordInputSchema>;
export type SsiRecordListQuery = z.infer<typeof SsiRecordListQuerySchema>['query'];
export type SsiSearchQuery = z.infer<typeof SsiSearchQuerySchema>['query'];
