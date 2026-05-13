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
  id: optionalString(),
  fileName: optionalString(),
  fileExtension: optionalString(),
  attachmentType: optionalString(),
  remarks: optionalString(),
  action: optionalString(),
});

const CcInputSchema = z.object({
  id: optionalString(),
  userId: requiredString('CC user'),
  fullName: optionalString(),
  email: optionalString(),
});

const DetailRowInputSchema = z.object({
  id: optionalString(),
  detailType: z.coerce.number().int().optional(),
  supplierId: requiredString('Supplier'),
  value: z.coerce.number().min(0),
  remarks: optionalString(),
});

const ApprovalEntrySchema = z.object({
  userId: optionalString(),
  name: optionalString(),
  remarks: optionalString(),
  date: optionalString(),
  status: optionalString(),
});

export const SupplierQualityRecordInputSchema = z.object({
  id: optionalString(),
  branch: optionalString(),
  controlNo: optionalString(),
  status: optionalString(),
  issuedDate: optionalString(),
  mainDetails: z.object({
    siteId: requiredString('Mfg Site'),
    fiscalYear: z.coerce.number().int().min(2000),
    frequency: z.coerce.number().int().min(1),
    periodLabel: optionalString(),
    remarks: optionalString(),
  }),
  coverPageAttachments: z.array(AttachmentInputSchema).default([]),
  appendixAttachments: z.array(AttachmentInputSchema).default([]),
  ccList: z.array(CcInputSchema).default([]),
  approval: z.object({
    issuer: ApprovalEntrySchema.default({}),
    checker: ApprovalEntrySchema.default({}),
    approver: ApprovalEntrySchema.default({}),
  }),
  larSummaryRemarks: optionalString(),
  larDppmSummaryRemarks: optionalString(),
  larWorstRows: z.array(DetailRowInputSchema).default([]),
  larWorstKeyPartsRows: z.array(DetailRowInputSchema).default([]),
  larWorstMechanicalRows: z.array(DetailRowInputSchema).default([]),
  larWorstOtherRows: z.array(DetailRowInputSchema).default([]),
});

export const SupplierQualityIdParamSchema = z.object({
  params: z.object({
    id: requiredString('Supplier Quality ID'),
  }),
});

export const SupplierQualityAttachmentParamSchema = z.object({
  params: z.object({
    attachmentId: requiredString('Attachment ID'),
  }),
});

export const SupplierQualityActionSchema = z.object({
  params: z.object({
    id: requiredString('Supplier Quality ID'),
  }),
  body: z.object({
    remarks: optionalString(),
    status: optionalString(),
  }).optional().default({}),
});

export const SupplierQualityListQuerySchema = z.object({
  query: z.object({
    status: optionalString(),
    scope: optionalString(),
    keyword: optionalString(),
    siteId: optionalString(),
    fiscalYear: optionalString(),
    frequency: optionalString(),
  }),
});

export type SupplierQualityRecordInput = z.infer<typeof SupplierQualityRecordInputSchema>;
export type SupplierQualityListQuery = z.infer<typeof SupplierQualityListQuerySchema>['query'];
