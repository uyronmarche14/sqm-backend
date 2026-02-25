import { z } from 'zod';
import { WorkflowStatusEnum } from '../../shared/types/workflow.js';
const NpiAttachmentSchema = z.object({
    npi_attachment_id: z.string().uuid().optional(),
    fileName: z.string().optional(),
    file_name: z.string().optional(),
    file_extension: z.string().optional(),
    remarks: z.string().optional()
});
const NpiVisualCategorySchema = z.object({
    defectclass_id: z.string().uuid(),
    defect_id: z.string().uuid(),
    quantity: z.number().int().min(0)
});
const NpiDataCategorySchema = z.object({
    partdatacategory_name: z.string(),
    std_min: z.number(),
    std_max: z.number(),
    actual_min: z.number().nullable().optional(),
    actual_max: z.number().nullable().optional(),
    cpk: z.number().nullable().optional(),
    remarks: z.string().optional()
});
const NpiCcListSchema = z.object({
    user_id: z.string().uuid()
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
export const NpiCreateSchema = z.object({
    body: z.object({
        controlNo: z.string(),
        siteId: z.string().uuid('Valid Site ID is required'),
        supplierId: z.string().uuid(),
        partId: z.string().uuid(),
        model: z.string().uuid(),
        lotNo: z.string().optional(),
        lotSize: z.preprocess((v) => Number(v) || 0, z.number().int()),
        invoiceNo: z.string().optional(),
        poNo: z.string().optional(),
        inspectionMethod: z.string().uuid(),
        inspectionTemp: z.preprocess((v) => Number(v) || 0, z.number()),
        inspectionHum: z.preprocess((v) => Number(v) || 0, z.number()),
        startTime: z.preprocess((v) => Number(v) || 0, z.number().int()),
        endTime: z.preprocess((v) => Number(v) || 0, z.number().int()),
        receivedTime: z.preprocess((v) => Number(v) || 0, z.number().int()),
        endorseTime: z.preprocess((v) => Number(v) || 0, z.number().int()),
        severity: z.string().uuid(),
        severity_seq: z.string().optional(),
        sampleSize: z.preprocess((v) => Number(v) || 0, z.number().int()),
        disposition: z.string().uuid(),
        inspectionDate: z.string().datetime().or(z.date()).optional(),
        deliveryDate: z.string().datetime().or(z.date()).optional(),
        inspectionCategory: z.string().uuid().optional(),
        dataVerifiedBy: z.string().uuid().optional(),
        total_minor: z.preprocess((v) => Number(v) || 0, z.number().int()),
        total_major: z.preprocess((v) => Number(v) || 0, z.number().int()),
        total_critical: z.preprocess((v) => Number(v) || 0, z.number().int()),
        judgment: z.string().optional(),
        rohsVerification: z.string().optional(),
        referenceMnrNo: z.string().optional(),
        inspectorRemarks: z.string().optional(),
        status: z.nativeEnum(WorkflowStatusEnum).optional(),
        // Complex Sub-arrays
        attachments: JsonParsedArray(NpiAttachmentSchema),
        visual_categories: JsonParsedArray(NpiVisualCategorySchema),
        data_categories: JsonParsedArray(NpiDataCategorySchema),
        cc_list: JsonParsedArray(NpiCcListSchema),
    })
});
export const NpiUpdateSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid NPI ID format')
    }),
    body: z.object({
        status: z.nativeEnum(WorkflowStatusEnum).optional(),
        request_status: z.string().optional(),
        siteId: z.string().uuid().optional(),
        supplierId: z.string().uuid().optional(),
        partId: z.string().uuid().optional(),
        model: z.string().uuid().optional(),
        lotNo: z.string().optional(),
        lotSize: z.preprocess((v) => Number(v), z.number().int().optional()),
        invoiceNo: z.string().optional(),
        poNo: z.string().optional(),
        inspectionMethod: z.string().uuid().optional(),
        inspectionTemp: z.preprocess((v) => Number(v), z.number().optional()),
        inspectionHum: z.preprocess((v) => Number(v), z.number().optional()),
        startTime: z.preprocess((v) => Number(v), z.number().int().optional()),
        endTime: z.preprocess((v) => Number(v), z.number().int().optional()),
        receivedTime: z.preprocess((v) => Number(v), z.number().int().optional()),
        endorseTime: z.preprocess((v) => Number(v), z.number().int().optional()),
        severity: z.string().uuid().optional(),
        severity_seq: z.string().optional(),
        sample_size: z.preprocess((v) => Number(v), z.number().int().optional()),
        disposition: z.string().uuid().optional(),
        inspectionDate: z.string().datetime().or(z.date()).optional(),
        deliveryDate: z.string().datetime().or(z.date()).optional(),
        inspectedBy: z.string().uuid().optional(),
        inspectionCategory: z.string().uuid().optional(),
        dataVerifiedBy: z.string().uuid().optional(),
        total_minor: z.preprocess((v) => Number(v), z.number().int().optional()),
        total_major: z.preprocess((v) => Number(v), z.number().int().optional()),
        total_critical: z.preprocess((v) => Number(v), z.number().int().optional()),
        judgment: z.string().optional(),
        rohsVerification: z.string().optional(),
        referenceMnrNo: z.string().optional(),
        inspectorRemarks: z.string().optional(),
        checkerRemarks: z.string().optional(),
        approverRemarks: z.string().optional(),
        attachments: JsonParsedArray(NpiAttachmentSchema),
        visual_categories: JsonParsedArray(NpiVisualCategorySchema),
        data_categories: JsonParsedArray(NpiDataCategorySchema),
        cc_list: JsonParsedArray(NpiCcListSchema),
    })
});
export const NpiActionSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid NPI ID format')
    }),
    body: z.object({
        remarks: z.string().optional()
    }).optional()
});
export const NpiIdParamSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid NPI ID format'),
        attachmentId: z.string().uuid('Invalid Attachment ID format').optional()
    })
});
