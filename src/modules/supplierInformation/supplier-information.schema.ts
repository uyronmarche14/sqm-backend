import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);

export const SupplierInformationIdParamSchema = z.object({
  params: z.object({
    id: nonEmptyString,
  }),
});

export const SupplierInformationBySupplierParamSchema = z.object({
  params: z.object({
    supplierId: nonEmptyString,
  }),
});

export const SupplierInformationAttachmentParamSchema = z.object({
  params: z.object({
    attachmentId: nonEmptyString,
  }),
});

export const SupplierInformationSearchQuerySchema = z.object({
  query: z.object({
    keyword: z.string().trim().optional(),
    q: z.string().trim().optional(),
  }),
});

export type SupplierInformationSearchQuery = z.infer<typeof SupplierInformationSearchQuerySchema>['query'];
