import { z } from 'zod';
import { WorkflowStatusEnum } from '../../shared/types/workflow.js';
// ==========================================
// MNR Module - Zod Validation Schemas
// ==========================================
// Nested structures based on legacy payload mapping
const MnrDispositionSchema = z.object({
    rtv: z.union([
        z.boolean(),
        z.object({ selected: z.boolean().optional(), qty: z.number().optional(), remarks: z.string().optional().nullable() })
    ]).optional(),
    sort: z.union([
        z.boolean(),
        z.object({
            selected: z.boolean().optional(),
            sorted: z.number().optional(),
            rejected: z.number().optional(),
            rate: z.number().optional(),
            rework: z.boolean().optional(),
            remarks: z.string().optional().nullable()
        })
    ]).optional(),
    other: z.union([
        z.boolean(),
        z.object({ selected: z.boolean().optional(), qty: z.number().optional(), doc: z.string().optional().nullable(), remarks: z.string().optional().nullable() })
    ]).optional(),
    // Legacy flat fields gracefully accepted
    rtvTotalQty: z.number().optional(),
    rtvQty: z.number().optional(),
    rtvRemarks: z.string().optional().nullable(),
    sortSorted: z.number().optional(),
    sortRejected: z.number().optional(),
    sortRejectRate: z.number().optional(),
    sortRemarks: z.string().optional().nullable(),
    sortRework: z.boolean().optional(),
    otherAffectedQty: z.number().optional(),
    otherAffectedDoc: z.string().optional().nullable(),
    otherRemarks: z.string().optional().nullable()
});
const MnrNonConformitySchema = z.object({
    recurrenceRef: z.string().optional().nullable()
});
const MnrMainDetailsSchema = z.object({
    mfgSites: z.string().optional().nullable(),
    supplier: z.string().optional().nullable(),
    product: z.string().optional().nullable(),
    model: z.string().optional().nullable(),
    mfgAreas: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    mnrType: z.string().optional().nullable(),
    attention: z.string().optional().nullable(),
    reference: z.string().optional().nullable(),
    reportIssuance8D: z.boolean().optional().nullable(),
    issueDate: z.string().optional().nullable(),
    initialReport: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
    actualInitialReport: z.string().optional().nullable(),
    actualFinalReport: z.string().optional().nullable(),
    remarks: z.string().optional().nullable()
});
export const MnrCreateSchema = z.object({
    body: z.object({
        mainDetails: MnrMainDetailsSchema.optional(),
        disposition: MnrDispositionSchema.optional(),
        nonConformity: MnrNonConformitySchema.optional(),
        // Sub-tables arrays
        defects: z.array(z.object({
            partId: z.string(),
            defectId: z.string(),
            qty: z.number(),
            ca: z.boolean().optional().default(false),
            classId: z.string().optional().nullable(),
            inspectionDate: z.string().optional().nullable(),
            invoiceNo: z.string().optional().nullable(),
            invoiceQty: z.number().optional().nullable(),
            lotNo: z.string().optional().nullable(),
            lotSize: z.number().optional().nullable(),
            sampleSize: z.number().optional().nullable(),
            groupLine: z.string().optional().nullable(),
            areaDefect: z.string().optional().nullable(),
            cavityNo: z.string().optional().nullable(),
            trayNo: z.string().optional().nullable(),
            encounterDate: z.string().optional().nullable(),
            verificationDate: z.string().optional().nullable(),
            verifiedBy: z.string().optional().nullable()
        })).optional(),
        copiedUsers: z.array(z.string()).optional(),
        attachments: z.array(z.object({
            name: z.string(),
            extension: z.string().optional(),
            remarks: z.string().optional()
        })).optional(),
        // Legacy root fallbacks 
        product_id: z.string().optional(),
        productId: z.string().optional(),
        product: z.string().optional(),
        model_id: z.string().optional(),
        model: z.string().optional()
    })
});
export const MnrUpdateSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid MNR ID')
    }),
    body: z.object({
        updates: z.object({
            status: z.nativeEnum(WorkflowStatusEnum).optional(),
            mainDetails: MnrMainDetailsSchema.optional(),
            disposition: MnrDispositionSchema.optional(),
            nonConformity: MnrNonConformitySchema.optional(),
            // Legacy flat fields attached directly to updates
            mfgSites: z.string().optional(),
            supplier: z.string().optional(),
            supplierId: z.string().optional(),
            model: z.string().optional(),
            mfgAreas: z.string().optional(),
            category: z.string().optional(),
            mnrType: z.string().optional(),
            attention: z.string().optional(),
            reference: z.string().optional(),
            issueDate: z.string().optional(),
            initialReport: z.string().optional(),
            dueDate: z.string().optional(),
            actualInitialReport: z.string().optional(),
            actualFinalReport: z.string().optional(),
            remarks: z.string().optional(),
            defects: z.array(z.object({
                partId: z.string(),
                defectId: z.string(),
                qty: z.number(),
                ca: z.boolean().optional().default(false),
                classId: z.string().optional().nullable(),
                inspectionDate: z.string().optional().nullable(),
                invoiceNo: z.string().optional().nullable(),
                invoiceQty: z.number().optional().nullable(),
                lotNo: z.string().optional().nullable(),
                lotSize: z.number().optional().nullable(),
                sampleSize: z.number().optional().nullable(),
                groupLine: z.string().optional().nullable(),
                areaDefect: z.string().optional().nullable(),
                cavityNo: z.string().optional().nullable(),
                trayNo: z.string().optional().nullable(),
                encounterDate: z.string().optional().nullable(),
                verificationDate: z.string().optional().nullable(),
                verifiedBy: z.string().optional().nullable(),
                id: z.string().optional() // For existing defects
            })).optional(),
            copiedUsers: z.array(z.string()).optional(),
            attachments: z.array(z.object({
                name: z.string(),
                extension: z.string().optional(),
                remarks: z.string().optional()
            })).optional()
        }).optional(),
        // Sometimes the frontend sends the payload outside of "updates"
        status: z.nativeEnum(WorkflowStatusEnum).optional(),
        mainDetails: MnrMainDetailsSchema.optional(),
        disposition: MnrDispositionSchema.optional(),
        nonConformity: MnrNonConformitySchema.optional()
    })
});
export const MnrIdParamSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid MNR ID')
    })
});
