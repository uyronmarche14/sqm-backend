import { z } from 'zod';
import { WorkflowStatusEnum } from '../../shared/types/workflow.js';

/**
 * Common SQMP Attachment Shape
 */
const SqmpAttachmentSchema = z.object({
  sqmp_attachment_id: z.string().uuid().optional(),
  file_name: z.string(),
  file_extension: z.string().optional(),
  remarks: z.string().optional(),
});

/**
 * Common SQMP CC User Shape
 */
const SqmpCcUserSchema = z.object({
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
    registration_date: z.string().datetime().or(z.date()).optional(),
    site_id: z.string().uuid('Valid Site ID is required'),
    supplier_id: z.string().uuid().or(z.string().length(0)).optional(), 
    attention_id: z.string().uuid().or(z.string().length(0)).optional(),
    fiscal_year: z.coerce.number().int().min(2000).max(2100).optional(),
    semester: z.string().regex(/^(1ST|2ND|1st|2nd)$/).or(z.coerce.number().int()).optional(), 
    issued_date: z.string().datetime().or(z.date()).optional(),
    due_date: z.string().datetime().or(z.date()).optional(),
    model_id: z.string().uuid().or(z.string().length(0)).optional(),
    revision: z.coerce.number().int().min(0).optional(),
    remarks: z.string().optional(),
    main_document_remarks: z.string().optional(),
    appendix_sheet_remarks: z.string().optional(),
    
    // Arrays for nested data
    main_documents: z.array(SqmpAttachmentSchema).optional(),
    appendix_documents: z.array(SqmpAttachmentSchema).optional(),
    cc_list: z.array(SqmpCcUserSchema).optional()
  })
});

/**
 * Update SQMP Request Schema
 */
export const SqmpUpdateSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Invalid SQMP ID format')
  }),
  body: z.object({
    registration_date: z.string().datetime().or(z.date()).optional(),
    site_id: z.string().uuid().optional(),
    fiscal_year: z.coerce.number().int().optional(),
    semester: z.string().regex(/^(1ST|2ND|1st|2nd)$/).or(z.coerce.number().int()).optional(), 
    issued_date: z.string().datetime().or(z.date()).optional(),
    due_date: z.string().datetime().or(z.date()).optional(),
    supplier_id: z.string().uuid().or(z.string().length(0)).optional(),
    attention_id: z.string().uuid().or(z.string().length(0)).optional(),
    model_id: z.string().uuid().or(z.string().length(0)).optional(),
    revision: z.coerce.number().int().min(0).optional(),
    
    remarks: z.string().optional(),
    main_document_remarks: z.string().optional(),
    appendix_sheet_remarks: z.string().optional(),
    
    status: z.nativeEnum(WorkflowStatusEnum).optional(),
    request_status: z.string().optional(), // Legacy compat
    
    issuer_id: z.string().uuid().optional(),
    issuer_remarks: z.string().optional(),
    issuer_date: z.string().datetime().or(z.date()).optional(),
    
    checker_id: z.string().uuid().optional(),
    checker_remarks: z.string().optional(),
    checker_date: z.string().datetime().or(z.date()).optional(),
    
    approver_id: z.string().uuid().optional(),
    approver_remarks: z.string().optional(),
    approver_date: z.string().datetime().or(z.date()).optional(),

    main_documents: z.array(SqmpAttachmentSchema).optional(),
    appendix_documents: z.array(SqmpAttachmentSchema).optional(),
    cc_list: z.array(SqmpCcUserSchema).optional()
  })
});

/**
 * Workflow Action Output Options
 */
export const SqmpActionSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Invalid SQMP ID format')
  }),
  body: z.object({
    remarks: z.string().optional()
  }).optional()
});

/**
 * ID Param Schema
 */
export const SqmpIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Invalid SQMP ID format'),
    attachmentId: z.string().min(1, 'Invalid Attachment ID format').optional()
  })
});

// TypeScript inference types
export type SQMPCreationInput = z.infer<typeof SqmpCreateSchema>['body'];
export type SQMPUpdateInput = z.infer<typeof SqmpUpdateSchema>['body'];
export type SQMPActionInput = z.infer<typeof SqmpActionSchema>['body'];
