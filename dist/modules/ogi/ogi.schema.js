import { z } from 'zod';
import { WorkflowStatusEnum } from '../../shared/types/workflow.js';
const OgiAttachmentSchema = z.object({
    id: z.string().uuid().optional(),
    ogi_attachment_id: z.string().uuid().optional(),
    fileName: z.string().optional(),
    file_name: z.string().optional(),
    file_extension: z.string().optional(),
    remarks: z.string().optional()
});
const OgiLotSchema = z.object({
    id: z.string().uuid().optional(),
    ogi_lot_id: z.string().uuid().optional(),
    lotNo: z.string(),
    invoiceNo: z.string(),
    lotSize: z.preprocess((v) => Number(v) || 0, z.number().int())
});
// A helper for handling JSON strings from FormData or actual arrays
const JsonParsedArray = (schema) => z.preprocess((val) => {
    if (typeof val === 'string') {
        try {
            return JSON.parse(val);
        }
        catch (e) {
            return [];
        }
    }
    return val;
}, z.array(schema).optional());
export const OgiCreateSchema = z.object({
    body: z.object({
        controlNo: z.string(),
        status: z.nativeEnum(WorkflowStatusEnum).optional(),
        siteId: z.string().uuid('Valid Site ID is required'),
        supplierId: z.string().uuid(),
        partId: z.string().uuid(),
        remarks: z.string().optional(),
        // Arrays
        lots: JsonParsedArray(OgiLotSchema),
        attachments: JsonParsedArray(OgiAttachmentSchema)
    })
});
export const OgiUpdateSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid OGI ID format')
    }),
    body: z.object({
        status: z.nativeEnum(WorkflowStatusEnum).optional(),
        request_status: z.string().optional(),
        siteId: z.string().uuid().optional(),
        supplierId: z.string().uuid().optional(),
        partId: z.string().uuid().optional(),
        remarks: z.string().optional(),
        // Arrays
        lots: JsonParsedArray(OgiLotSchema),
        attachments: JsonParsedArray(OgiAttachmentSchema)
    })
});
export const OgiActionSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid OGI ID format')
    }),
    body: z.object({
        remarks: z.string().optional()
    }).optional()
});
export const OgiIdParamSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid OGI ID format')
    })
});
export const OgiAttachmentParamSchema = z.object({
    params: z.object({
        attachmentId: z.string().uuid('Invalid Attachment ID format')
    })
});
