import { z } from 'zod';
import { WorkflowStatusEnum } from '../../../shared/types/workflow.js';

// Helper: Auto-parse JSON string arrays from FormData
const JsonParsedArray = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return []; }
    }
    return val;
  }, z.array(schema).optional());

/**
 * Common SQMP Attachment Shape
 */
export const SqmpAttachmentSchema = z.object({
  sqmp_attachment_id: z.string().uuid().optional(),
  file_name: z.string(),
  file_extension: z.string().optional(),
  remarks: z.string().optional(),
});

/**
 * Common SQMP CC User Shape
 */
export const SqmpCcUserSchema = z.object({
  sqmp_cc_id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  user_name: z.string().optional(),
  user_email: z.string().optional(),
});

/**
 * Create SQMP Request Schema
 */
export const SqmpCreateSchema = z.object({
  body: z.object({
    registration_date: z.string().or(z.date()).nullable().optional(),
    site_id: z.string().uuid('Valid Site ID is required'),
    supplier_id: z.string().uuid().or(z.string().length(0)).nullable().optional(), 
    attention_id: z.string().uuid().or(z.string().length(0)).nullable().optional(),
    fiscal_year: z.coerce.number().int().min(2000).max(2100).optional(),
    semester: z.string().regex(/^(1ST|2ND|1st|2nd)$/).or(z.coerce.number().int()).optional(), 
    control_series: z.coerce.number().int().min(0).optional(),
    issued_date: z.string().or(z.date()).nullable().optional(),
    due_date: z.string().or(z.date()).nullable().optional(),
    model_id: z.string().uuid().or(z.string().length(0)).optional(),
    revision: z.coerce.number().int().min(0).optional(),
    remarks: z.string().optional(),
    main_document_remarks: z.string().optional(),
    appendix_sheet_remarks: z.string().optional(),
    request_status: z.string().optional(),
    
    checker_id: z.string().uuid().or(z.string().length(0)).nullable().optional(),
    approver_id: z.string().uuid().or(z.string().length(0)).nullable().optional(),
    
    // Arrays for nested data (auto-parse JSON strings from FormData)
    main_documents: JsonParsedArray(SqmpAttachmentSchema),
    appendix_documents: JsonParsedArray(SqmpAttachmentSchema),
    cc_list: JsonParsedArray(SqmpCcUserSchema)
  })
});

/**
 * Update SQMP Request Schema (Primary Record Only)
 */
export const SqmpUpdateSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Invalid SQMP ID format')
  }),
  body: z.object({
    registration_date: z.string().or(z.date()).nullable().optional(),
    site_id: z.string().uuid().optional(),
    fiscal_year: z.coerce.number().int().optional(),
    semester: z.string().regex(/^(1ST|2ND|1st|2nd)$/).or(z.coerce.number().int()).optional(), 
    control_series: z.coerce.number().int().min(0).optional(),
    issued_date: z.string().or(z.date()).nullable().optional(),
    due_date: z.string().or(z.date()).nullable().optional(),
    supplier_id: z.string().uuid().or(z.string().length(0)).nullable().optional(),
    attention_id: z.string().uuid().or(z.string().length(0)).nullable().optional(),
    model_id: z.string().uuid().or(z.string().length(0)).nullable().optional(),
    revision: z.coerce.number().int().min(0).optional(),
    
    remarks: z.string().optional(),
    main_document_remarks: z.string().optional(),
    appendix_sheet_remarks: z.string().optional(),
    
    status: z.nativeEnum(WorkflowStatusEnum).optional(),
    request_status: z.string().optional(), // Legacy compat
    
    issuer_id: z.string().uuid().or(z.string().length(0)).nullable().optional(),
    issuer_remarks: z.string().optional(),
    issuer_date: z.string().or(z.date()).nullable().optional(),
    
    checker_id: z.string().uuid().or(z.string().length(0)).nullable().optional(),
    checker_remarks: z.string().optional(),
    checker_date: z.string().or(z.date()).nullable().optional(),
    
    approver_id: z.string().uuid().or(z.string().length(0)).nullable().optional(),
    approver_remarks: z.string().optional(),
    approver_date: z.string().or(z.date()).nullable().optional(),

    // Arrays for nested data (auto-parse JSON strings from FormData)
    main_documents: JsonParsedArray(SqmpAttachmentSchema),
    appendix_documents: JsonParsedArray(SqmpAttachmentSchema),
    cc_list: JsonParsedArray(SqmpCcUserSchema)
  })
});

/**
 * IDs Schema
 */
export const SqmpIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Invalid SQMP ID format'),
    attachmentId: z.string().min(1, 'Invalid Attachment ID format').optional()
  })
});

export const SqmpActionSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Invalid SQMP ID format')
  }),
  body: z.object({
    remarks: z.string().optional()
  }).optional()
});

export const SqmpControlNoPreviewSchema = z.object({
  query: z.object({
    fiscalYear: z.coerce.number().int().min(2000).max(2100),
    siteId: z.string().uuid().optional(),
    siteCode: z.string().optional(),
    semester: z.string().regex(/^(1ST|2ND|1st|2nd)$/).or(z.coerce.number().int()),
    series: z.coerce.number().int().min(0).optional(),
    revision: z.coerce.number().int().min(0).optional(),
  }),
});

export type SQMPCreationInput = z.infer<typeof SqmpCreateSchema>['body'];
export type SQMPUpdateInput = z.infer<typeof SqmpUpdateSchema>['body'];
export type SQMPActionInput = z.infer<typeof SqmpActionSchema>['body'];
