import { z } from 'zod';
import { SqmpAttachmentSchema } from '../main/main.schema.js';

// Helper: Auto-parse JSON string arrays from FormData
const JsonParsedArray = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return []; }
    }
    return val;
  }, z.array(schema).optional());

/**
 * Single Response Upsert Schema
 * (Handles vendor filing response or TIP closing plan)
 */
export const SqmpResponseUpsertSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Invalid SQMP ID format')
  }),
  body: z.object({
    sqmp_response_id: z.string().uuid().optional(),
    response_date: z.string().or(z.date()).nullable().optional(),
    main_document_remarks: z.string().optional(),
    appendix_sheet_remarks: z.string().optional(),
    closure_remarks: z.string().optional(),
    remarks: z.string().optional(),
    
    // Approval fields (Cycle 2)
    issuer_id: z.string().uuid().or(z.string().length(0)).nullable().optional(),
    issuer_remarks: z.string().optional(),
    issuer_date: z.string().or(z.date()).nullable().optional(),
    checker_id: z.string().uuid().or(z.string().length(0)).nullable().optional(),
    checker_remarks: z.string().optional(),
    checker_date: z.string().or(z.date()).nullable().optional(),
    approver_id: z.string().uuid().or(z.string().length(0)).nullable().optional(),
    approver_remarks: z.string().optional(),
    approver_date: z.string().or(z.date()).nullable().optional(),

    // Nested attachments parsed from FormData
    documents: JsonParsedArray(SqmpAttachmentSchema),
    appendixes: JsonParsedArray(SqmpAttachmentSchema),
    closures: JsonParsedArray(SqmpAttachmentSchema)
  })
});

/**
 * Cycle 2 Action Schema (Check/Approve/Reject)
 */
export const SqmpResponseActionSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Invalid SQMP ID format'),
    responseId: z.string().uuid().optional() // Optional if it implicitly targets latest
  }),
  body: z.object({
    remarks: z.string().optional()
  }).optional()
});

export type SQMPResponseUpsertInput = z.infer<typeof SqmpResponseUpsertSchema>['body'];
export type SQMPResponseActionInput = z.infer<typeof SqmpResponseActionSchema>['body'];
