import { z } from 'zod';
import { WorkflowStatusEnum } from '../../shared/types/workflow.js';
/**
 * Common SQPR Attachment Shape
 */
const SqprAttachmentSchema = z.object({
    sqpr_attachment_id: z.string().uuid().optional(),
    file_name: z.string(),
    file_extension: z.string().optional(),
    attachment_type: z.string().optional(),
    remarks: z.string().optional(),
});
/**
 * Common SQPR CC User Shape
 */
const SqprCcUserSchema = z.object({
    sqpr_cc_id: z.string().uuid().optional(),
    user_id: z.string().uuid(),
    user_name: z.string().optional(),
    user_email: z.string().optional(),
});
/**
 * Create SQPR Request Schema
 */
export const SqprCreateSchema = z.object({
    body: z.object({
        site_id: z.string().uuid('Valid Site ID is required'),
        fiscal_year: z.coerce.number().int().min(2000).max(2100),
        report_type: z.coerce.number().int().min(1).max(2), // 1=Month, 2=Quarter
        month: z.coerce.number().int().min(1).max(12).optional(),
        supplier_id: z.string().uuid().or(z.string().length(0)).optional(),
        supplierId: z.string().uuid().optional(), // Frontend alias
        attention_id: z.string().uuid().or(z.string().length(0)).optional(),
        attentionId: z.string().uuid().optional(), // Frontend alias
        attention: z.string().optional(),
        remarks: z.string().optional(),
        // Workflow fields
        incharge_id: z.string().uuid().optional(),
        incharge_remarks: z.string().optional(),
        checker_id: z.string().uuid().optional(),
        checker_remarks: z.string().optional(),
        approver_id: z.string().uuid().optional(),
        approver_remarks: z.string().optional(),
        attachments: z.array(SqprAttachmentSchema).optional(),
        cc_list: z.array(SqprCcUserSchema).optional()
    })
});
/**
 * Update SQPR Request Schema
 */
export const SqprUpdateSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid SQPR ID format')
    }),
    body: z.object({
        site_id: z.string().uuid().optional(),
        fiscal_year: z.coerce.number().int().optional(),
        report_type: z.coerce.number().int().optional(),
        month: z.coerce.number().int().optional(),
        supplier_id: z.string().uuid().or(z.string().length(0)).optional(),
        attention_id: z.string().uuid().or(z.string().length(0)).optional(),
        attention: z.string().optional(),
        remarks: z.string().optional(),
        status: z.nativeEnum(WorkflowStatusEnum).optional(),
        request_status: z.string().optional(), // Legacy compat
        submit_date: z.string().datetime().or(z.date()).optional(),
        incharge_id: z.string().uuid().optional(),
        incharge_remarks: z.string().optional(),
        checker_id: z.string().uuid().optional(),
        checker_remarks: z.string().optional(),
        checker_date: z.string().datetime().or(z.date()).optional(),
        approver_id: z.string().uuid().optional(),
        approver_remarks: z.string().optional(),
        approver_date: z.string().datetime().or(z.date()).optional(),
        attachments: z.array(SqprAttachmentSchema).optional(),
        cc_list: z.array(SqprCcUserSchema).optional()
    })
});
/**
 * Workflow Action Output Options (Reject)
 */
export const SqprActionSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid SQPR ID format')
    }),
    body: z.object({
        remarks: z.string().optional()
    }).optional()
});
/**
 * ID Param Schema
 */
export const SqprIdParamSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid SQPR ID format')
    })
});
/**
 * Attachment Param Schema
 */
export const SqprAttachmentParamSchema = z.object({
    params: z.object({
        attachmentId: z.string().uuid('Invalid Attachment ID format')
    })
});
