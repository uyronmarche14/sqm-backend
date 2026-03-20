import { z } from 'zod';
import { WorkflowStatusEnum } from '../../shared/types/workflow.js';
const OptionalUuidField = z.preprocess((value) => (value === '' || value == null ? undefined : value), z.string().uuid().optional());
const OptionalStringField = z.preprocess((value) => (value === '' || value == null ? undefined : value), z.string().optional());
const OptionalClearableStringField = z.preprocess((value) => (value == null ? undefined : String(value)), z.string().optional());
const OptionalCounterField = z.preprocess((value) => (value === '' || value == null ? undefined : Number(value)), z.number().int().min(0).max(10).optional());
const OptionalDateField = z.preprocess((value) => {
    if (value === '' || value == null)
        return undefined;
    if (value instanceof Date)
        return value;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? value : parsed;
}, z.date().optional());
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
    quantity: z.coerce.number().int().min(0)
});
const NpiDataCategorySchema = z.object({
    partdatacategory_name: z.string(),
    std_min: z.coerce.number(),
    std_max: z.coerce.number(),
    actual_min: z.coerce.number().nullable().optional(),
    actual_max: z.coerce.number().nullable().optional(),
    cpk: z.coerce.number().nullable().optional(),
    remarks: z.string().optional()
});
const NpiDimensionCategorySchema = z.object({
    partdimensioncategory_name: z.string(),
    std_min: z.coerce.number(),
    std_max: z.coerce.number(),
    actual_min: z.coerce.number().nullable().optional(),
    actual_max: z.coerce.number().nullable().optional(),
    cpk: z.coerce.number().nullable().optional(),
    remarks: z.string().optional()
});
const NpiNoiseCategorySchema = z.object({
    partnoisecategory_name: z.string(),
    std_min: z.coerce.number(),
    std_max: z.coerce.number(),
    actual_min: z.coerce.number().nullable().optional(),
    actual_max: z.coerce.number().nullable().optional(),
    cpk: z.coerce.number().nullable().optional(),
    remarks: z.string().optional(),
});
const NpiMaterialCertificateSchema = z.object({
    component: z.string(),
    description: z.string(),
    required_data: z.string(),
    judgement: z.union([z.boolean(), z.coerce.number()]).nullable().optional(),
    remarks: z.string().optional(),
});
const NpiCcListSchema = z.object({
    user_id: z.string().optional(),
    email: z.string().email().optional()
}).refine((data) => data.user_id || data.email, {
    message: "Either user_id or email must be provided"
}).transform((data) => ({
    // Return whichever is provided - service layer will resolve email to user_id
    user_id: data.user_id,
    email: data.email
}));
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
        controlNo: OptionalStringField,
        siteId: z.preprocess((value) => (value === '' || value == null ? undefined : value), z.string().uuid('Valid Site ID is required').optional()),
        supplierId: OptionalUuidField,
        partId: OptionalUuidField,
        model: OptionalUuidField,
        lotNo: OptionalStringField,
        lotSize: z.preprocess((v) => Number(v) || 0, z.number().int()),
        invoiceNo: OptionalStringField,
        poNo: OptionalStringField,
        inspectionMethod: OptionalUuidField,
        inspectionTemp: z.preprocess((v) => Number(v) || 0, z.number()),
        inspectionHum: z.preprocess((v) => Number(v) || 0, z.number()),
        startTime: z.preprocess((v) => Number(v) || 0, z.number().int()),
        endTime: z.preprocess((v) => Number(v) || 0, z.number().int()),
        receivedTime: z.preprocess((v) => Number(v) || 0, z.number().int()),
        endorseTime: z.preprocess((v) => Number(v) || 0, z.number().int()),
        severity: OptionalUuidField,
        severity_seq: OptionalStringField,
        sampleSize: z.preprocess((v) => Number(v) || 0, z.number().int()),
        disposition: OptionalUuidField,
        inspectionDate: OptionalDateField,
        deliveryDate: OptionalDateField,
        inspectedBy: OptionalUuidField,
        inspectionCategory: OptionalUuidField,
        dataVerifiedBy: OptionalUuidField,
        total_minor: z.preprocess((v) => Number(v) || 0, z.number().int()),
        total_major: z.preprocess((v) => Number(v) || 0, z.number().int()),
        total_critical: z.preprocess((v) => Number(v) || 0, z.number().int()),
        judgment: OptionalStringField,
        rohsVerification: OptionalStringField,
        referenceMnrNo: OptionalClearableStringField,
        correctedLotVerification: OptionalCounterField,
        incrementCorrectedLotVerification: z.preprocess((value) => value === 'true' || value === '1' || value === true, z.boolean().optional()),
        remarks: OptionalStringField,
        // Approval Section
        inspectorId: OptionalUuidField,
        inspector_id: OptionalUuidField,
        inspectorRemarks: OptionalStringField,
        inspector_remarks: OptionalStringField,
        submittedDate: OptionalDateField,
        submitted_date: OptionalDateField,
        checkerId: OptionalUuidField,
        checker_id: OptionalUuidField,
        checkerRemarks: OptionalStringField,
        checker_remarks: OptionalStringField,
        checkedDate: OptionalDateField,
        checked_date: OptionalDateField,
        approverId: OptionalUuidField,
        approver_id: OptionalUuidField,
        approverRemarks: OptionalStringField,
        approver_remarks: OptionalStringField,
        approvedDate: OptionalDateField,
        approved_date: OptionalDateField,
        // Extra fields
        ssiAccept: z.preprocess((v) => v === 'true' || v === '1' || v === true ? 1 : 0, z.number()).optional(),
        ogiRefNo: OptionalStringField,
        status: z.nativeEnum(WorkflowStatusEnum).optional(),
        // Complex Sub-arrays
        attachments: JsonParsedArray(NpiAttachmentSchema),
        visual_categories: JsonParsedArray(NpiVisualCategorySchema),
        data_categories: JsonParsedArray(NpiDataCategorySchema),
        dimension_categories: JsonParsedArray(NpiDimensionCategorySchema),
        noise_categories: JsonParsedArray(NpiNoiseCategorySchema),
        material_certificates: JsonParsedArray(NpiMaterialCertificateSchema),
        cc_list: JsonParsedArray(NpiCcListSchema),
    })
});
export const NpiUpdateSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid NPI ID format')
    }),
    body: z.object({
        status: z.nativeEnum(WorkflowStatusEnum).optional(),
        request_status: OptionalStringField,
        siteId: OptionalUuidField,
        supplierId: OptionalUuidField,
        partId: OptionalUuidField,
        model: OptionalUuidField,
        lotNo: OptionalStringField,
        lotSize: z.preprocess((v) => Number(v), z.number().int().optional()),
        invoiceNo: OptionalStringField,
        poNo: OptionalStringField,
        inspectionMethod: OptionalUuidField,
        inspectionTemp: z.preprocess((v) => Number(v), z.number().optional()),
        inspectionHum: z.preprocess((v) => Number(v), z.number().optional()),
        startTime: z.preprocess((v) => Number(v), z.number().int().optional()),
        endTime: z.preprocess((v) => Number(v), z.number().int().optional()),
        receivedTime: z.preprocess((v) => Number(v), z.number().int().optional()),
        endorseTime: z.preprocess((v) => Number(v), z.number().int().optional()),
        severity: OptionalUuidField,
        severity_seq: OptionalStringField,
        sampleSize: z.preprocess((v) => Number(v), z.number().int().optional()),
        disposition: OptionalUuidField,
        inspectionDate: OptionalDateField,
        deliveryDate: OptionalDateField,
        inspectedBy: OptionalUuidField,
        inspectionCategory: OptionalUuidField,
        dataVerifiedBy: OptionalUuidField,
        total_minor: z.preprocess((v) => Number(v), z.number().int().optional()),
        total_major: z.preprocess((v) => Number(v), z.number().int().optional()),
        total_critical: z.preprocess((v) => Number(v), z.number().int().optional()),
        judgment: OptionalStringField,
        rohsVerification: OptionalStringField,
        referenceMnrNo: OptionalClearableStringField,
        correctedLotVerification: OptionalCounterField,
        incrementCorrectedLotVerification: z.preprocess((value) => value === 'true' || value === '1' || value === true, z.boolean().optional()),
        remarks: OptionalStringField,
        // Approval Section
        inspectorId: OptionalUuidField,
        inspector_id: OptionalUuidField,
        inspectorRemarks: OptionalStringField,
        inspector_remarks: OptionalStringField,
        submittedDate: OptionalDateField,
        submitted_date: OptionalDateField,
        checkerId: OptionalUuidField,
        checker_id: OptionalUuidField,
        checkerRemarks: OptionalStringField,
        checker_remarks: OptionalStringField,
        checkedDate: OptionalDateField,
        checked_date: OptionalDateField,
        approverId: OptionalUuidField,
        approver_id: OptionalUuidField,
        approverRemarks: OptionalStringField,
        approver_remarks: OptionalStringField,
        approvedDate: OptionalDateField,
        approved_date: OptionalDateField,
        // Extra fields
        ssiAccept: z.preprocess((v) => v === 'true' || v === '1' || v === true ? 1 : 0, z.number()).optional(),
        ogiRefNo: OptionalStringField,
        attachments: JsonParsedArray(NpiAttachmentSchema),
        visual_categories: JsonParsedArray(NpiVisualCategorySchema),
        data_categories: JsonParsedArray(NpiDataCategorySchema),
        dimension_categories: JsonParsedArray(NpiDimensionCategorySchema),
        noise_categories: JsonParsedArray(NpiNoiseCategorySchema),
        material_certificates: JsonParsedArray(NpiMaterialCertificateSchema),
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
export const NpiAttachmentParamSchema = z.object({
    params: z.object({
        attachmentId: z.string().uuid('Invalid Attachment ID format')
    })
});
