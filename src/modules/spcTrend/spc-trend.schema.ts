import { z } from 'zod';

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

const optionalString = () => z.preprocess(emptyStringToUndefined, z.string().optional());
const requiredString = (label: string) =>
  z.preprocess(trimString, z.string().min(1, `${label} is required`));

const AttachmentInputSchema = z.object({
  attachmentId: optionalString(),
  fileName: optionalString(),
  fileExtension: optionalString(),
  fileUrl: optionalString(),
  action: optionalString(),
});

const ApprovalEntrySchema = z.object({
  userId: optionalString(),
  name: optionalString(),
  remarks: optionalString(),
  date: optionalString(),
  status: optionalString(),
});

export const SpcTrendRecordInputSchema = z.object({
  id: optionalString(),
  controlNo: optionalString(),
  status: optionalString(),
  uploadDate: optionalString(),
  mainDetails: z.object({
    siteId: requiredString('Mfg Site'),
    siteCode: optionalString(),
    supplierId: requiredString('Supplier'),
    supplierInchargeId: optionalString(),
    supplierInchargeName: optionalString(),
    partId: requiredString('Part'),
    partCode: optionalString(),
    partName: optionalString(),
    remarks: optionalString(),
  }),
  attachment: AttachmentInputSchema.nullable().optional(),
  approval: z.object({
    issuer: ApprovalEntrySchema.default({}),
    checker: ApprovalEntrySchema.default({}),
    approver: ApprovalEntrySchema.default({}),
  }),
});

export const SpcTrendIdParamSchema = z.object({
  params: z.object({
    id: requiredString('SPC Trend ID'),
  }),
});

export const SpcTrendAttachmentParamSchema = z.object({
  params: z.object({
    attachmentId: requiredString('Attachment ID'),
  }),
});

export const SpcTrendActionSchema = z.object({
  params: z.object({
    id: requiredString('SPC Trend ID'),
  }),
  body: z.object({
    remarks: optionalString(),
  }).optional().default({}),
});

export const SpcTrendListQuerySchema = z.object({
  query: z.object({
    status: optionalString(),
    scope: optionalString(),
    keyword: optionalString(),
    siteId: optionalString(),
    supplierId: optionalString(),
    partId: optionalString(),
    dateFrom: optionalString(),
    dateTo: optionalString(),
    surface: optionalString(),
  }),
});

export type SpcTrendRecordInput = z.infer<typeof SpcTrendRecordInputSchema>;
export type SpcTrendListQuery = z.infer<typeof SpcTrendListQuerySchema>['query'];
