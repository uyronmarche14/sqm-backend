import { z } from 'zod';

const OgiAttachmentSchema = z.object({
  id: z.string().uuid().optional(),
  ogi_attachment_id: z.string().uuid().optional(),
  fileName: z.string().optional(),
  file_name: z.string().optional(),
  file_extension: z.string().optional(),
  remarks: z.string().optional()
}).transform((data) => ({
  id: data.id,
  ogi_attachment_id: data.ogi_attachment_id,
  fileName: data.fileName || data.file_name || '',
  file_extension: data.file_extension,
  remarks: data.remarks
}));

const OgiLotSchema = z.object({
  id: z.string().uuid().optional(),
  ogi_lot_id: z.string().uuid().optional(),
  lotNo: z.string().optional(),
  lot_no: z.string().optional(),
  invoiceNo: z.string().optional(),
  invoice_no: z.string().optional(),
  lotSize: z.preprocess((v) => Number(v) || 0, z.number().int()).optional(),
  lot_size: z.preprocess((v) => Number(v) || 0, z.number().int()).optional()
}).transform((data) => ({
  id: data.id,
  ogi_lot_id: data.ogi_lot_id,
  lotNo: data.lotNo || data.lot_no || '',
  invoiceNo: data.invoiceNo || data.invoice_no || '',
  lotSize: data.lotSize || data.lot_size || 0
}));

// A helper for handling JSON strings from FormData or actual arrays
const JsonParsedArray = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch (e) {
        return [];
      }
    }
    return val;
  }, z.array(schema).optional());


export const OgiCreateSchema = z.object({
  body: z.object({
    controlNo: z.string().optional(),
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
    id: z.string().min(1, 'OGI ID is required')
  }),
  body: z.object({
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
    id: z.string().min(1, 'OGI ID is required')
  }),
  body: z.object({
    remarks: z.string().optional()
  }).optional()
});

export const OgiIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'OGI ID is required')
  })
});

export const OgiAttachmentParamSchema = z.object({
  params: z.object({
    attachmentId: z.string().uuid('Invalid Attachment ID format')
  })
});

export type OGICreationInput = z.infer<typeof OgiCreateSchema>['body'];
export type OGIUpdateInput = z.infer<typeof OgiUpdateSchema>['body'];
