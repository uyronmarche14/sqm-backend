import { z } from 'zod';
import { WorkflowStatusEnum } from '../../shared/types/workflow.js';

// ==========================================
// MNR Module - Zod Validation Schemas
// ==========================================

// Helper: Auto-parse JSON strings from FormData
const JsonParsed = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return val; }
    }
    return val;
  }, schema);

const JsonParsedArray = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return []; }
    }
    return val;
  }, z.array(schema).optional());

// Nested structures based on legacy payload mapping
const MnrDispositionSchema = z.object({
  rtv: z.union([
    z.boolean(),
    z.object({ selected: z.boolean().optional(), qty: z.coerce.number().optional(), remarks: z.string().optional().nullable() })
  ]).optional(),
  sort: z.union([
    z.boolean(),
    z.object({ 
      selected: z.boolean().optional(), 
      sorted: z.coerce.number().optional(), 
      rejected: z.coerce.number().optional(), 
      rate: z.coerce.number().optional(), 
      rework: z.boolean().optional(),
      remarks: z.string().optional().nullable() 
    })
  ]).optional(),
  other: z.union([
    z.boolean(),
    z.object({ selected: z.boolean().optional(), qty: z.coerce.number().optional(), doc: z.string().optional().nullable(), remarks: z.string().optional().nullable() })
  ]).optional(),
  // Legacy flat fields gracefully accepted
  rtvTotalQty: z.coerce.number().optional(),
  rtvQty: z.coerce.number().optional(),
  rtvRemarks: z.string().optional().nullable(),
  sortSorted: z.coerce.number().optional(),
  sortRejected: z.coerce.number().optional(),
  sortRejectRate: z.coerce.number().optional(),
  sortRemarks: z.string().optional().nullable(),
  sortRework: z.boolean().optional(),
  otherAffectedQty: z.coerce.number().optional(),
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

const MnrDefectSchema = z.object({
  partId: z.string(),
  defectId: z.string(),
  qty: z.coerce.number(),
  ca: z.boolean().optional().default(false),
  classId: z.string().optional().nullable(),
  inspectionDate: z.string().optional().nullable(),
  invoiceNo: z.string().optional().nullable(),
  invoiceQty: z.coerce.number().optional().nullable(),
  lotNo: z.string().optional().nullable(),
  lotSize: z.coerce.number().optional().nullable(),
  sampleSize: z.coerce.number().optional().nullable(),
  groupLine: z.string().optional().nullable(),
  areaDefect: z.string().optional().nullable(),
  cavityNo: z.string().optional().nullable(),
  trayNo: z.string().optional().nullable(),
  encounterDate: z.string().optional().nullable(),
  verificationDate: z.string().optional().nullable(),
  verifiedBy: z.string().optional().nullable()
});

const MnrAttachmentSchema = z.object({
  name: z.string().optional(),
  file_name: z.string().optional(),
  extension: z.string().optional(),
  remarks: z.string().optional(),
  id: z.string().optional(),
  action: z.string().optional()
});

const MnrCcItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional()
});

export const MnrCreateSchema = z.object({
  body: z.object({
    mainDetails: JsonParsed(MnrMainDetailsSchema).optional(),
    disposition: JsonParsed(MnrDispositionSchema).optional(),
    // Accept both field names: frontend sends 'disposition_data'
    disposition_data: JsonParsed(MnrDispositionSchema).optional(),
    nonConformity: JsonParsed(MnrNonConformitySchema).optional(),
    response8D: JsonParsed(z.record(z.string(), z.unknown())).optional(),
    approval: JsonParsed(z.record(z.string(), z.unknown())).optional(),
    
    // Sub-tables arrays (auto-parse JSON strings from FormData)
    defects: JsonParsedArray(MnrDefectSchema),
    
    // Accept both field names: frontend sends 'ccList'
    copiedUsers: JsonParsedArray(z.string()),
    ccList: JsonParsedArray(MnrCcItemSchema),
    attachments: JsonParsedArray(MnrAttachmentSchema),

    // Legacy root fallbacks (flat fields from FormData)
    site_id: z.string().optional(),
    supplier_id: z.string().optional(),
    product_id: z.string().optional(),
    productId: z.string().optional(),
    product: z.string().optional(),
    model_id: z.string().optional(),
    model: z.string().optional(),
    mfg_area_id: z.string().optional(),
    defectcategory_id: z.string().optional(),
    mnrType: z.string().optional(),
    attention_id: z.string().optional(),
    reference: z.string().optional(),
    remarks: z.string().optional(),
    reportIssuance8D: z.preprocess((v) => v === 'true' || v === true, z.boolean()).optional(),
    recurrenceRef: z.string().optional(),
    issueDate: z.string().optional(),
    initialReport: z.string().optional(),
    dueDate: z.string().optional(),
    actualInitialReport: z.string().optional(),
    actualFinalReport: z.string().optional()
  })
});

export const MnrUpdateSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'MNR ID is required')
  }),
  body: z.object({
    updates: z.object({
      status: z.nativeEnum(WorkflowStatusEnum).optional(),
      mainDetails: JsonParsed(MnrMainDetailsSchema).optional(),
      disposition: JsonParsed(MnrDispositionSchema).optional(),
      disposition_data: JsonParsed(MnrDispositionSchema).optional(),
      nonConformity: JsonParsed(MnrNonConformitySchema).optional(),
      response8D: JsonParsed(z.record(z.string(), z.unknown())).optional(),
      approval: JsonParsed(z.record(z.string(), z.unknown())).optional(),
      
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
      site_id: z.string().optional(),
      supplier_id: z.string().optional(),
      product_id: z.string().optional(),
      model_id: z.string().optional(),
      mfg_area_id: z.string().optional(),
      defectcategory_id: z.string().optional(),
      attention_id: z.string().optional(),
      reportIssuance8D: z.preprocess((v) => v === 'true' || v === true, z.boolean()).optional(),
      recurrenceRef: z.string().optional(),
      
      defects: JsonParsedArray(MnrDefectSchema.extend({ id: z.string().optional() })),
      
      copiedUsers: JsonParsedArray(z.string()),
      ccList: JsonParsedArray(MnrCcItemSchema),
      attachments: JsonParsedArray(MnrAttachmentSchema)
    }).optional(),
    
    // Sometimes the frontend sends the payload outside of "updates"
    status: z.nativeEnum(WorkflowStatusEnum).optional(),
    mainDetails: JsonParsed(MnrMainDetailsSchema).optional(),
    disposition: JsonParsed(MnrDispositionSchema).optional(),
    disposition_data: JsonParsed(MnrDispositionSchema).optional(),
    nonConformity: JsonParsed(MnrNonConformitySchema).optional(),
    response8D: JsonParsed(z.record(z.string(), z.unknown())).optional(),
    approval: JsonParsed(z.record(z.string(), z.unknown())).optional()
    ,
    site_id: z.string().optional(),
    supplier_id: z.string().optional(),
    product_id: z.string().optional(),
    model_id: z.string().optional(),
    mfg_area_id: z.string().optional(),
    defectcategory_id: z.string().optional(),
    attention_id: z.string().optional(),
    mnrType: z.string().optional(),
    reportIssuance8D: z.preprocess((v) => v === 'true' || v === true, z.boolean()).optional(),
    recurrenceRef: z.string().optional(),
    issueDate: z.string().optional(),
    initialReport: z.string().optional(),
    dueDate: z.string().optional(),
    actualInitialReport: z.string().optional(),
    actualFinalReport: z.string().optional(),
    remarks: z.string().optional(),
    reference: z.string().optional()
  })
});

export const MnrIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'MNR ID is required')
  })
});

export const MnrAttachmentParamSchema = z.object({
  params: z.object({
    attachmentId: z.string().min(1, 'Attachment ID is required')
  })
});

export type MNRCreationInput = z.infer<typeof MnrCreateSchema>['body'];
export type MNRUpdateInput = z.infer<typeof MnrUpdateSchema>['body'];
