import { z } from 'zod';

// --- Shared Helpers ---
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

const QmqaAttachmentSchema = z.object({
  id: z.string().uuid().optional(),
  fileName: z.string().optional(),
  file_name: z.string().optional(),
  remarks: z.string().optional()
});

const QmqaCcListSchema = z.object({
  user_id: z.string().uuid()
});

// =====================================
// 1. SCHEDULES (Audit Plan)
// =====================================
export const QmqaScheduleCreateSchema = z.object({
  body: z.object({
    site_id: z.string().uuid(),
    supplier_id: z.string().uuid(),
    audit_category_id: z.string().uuid(),
    audit_plan_date: z.string().datetime().or(z.date()),
    sqe_pic_id: z.string().uuid(),
    remarks: z.string().optional()
  })
});

export const QmqaScheduleUpdateSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Schedule ID format')
  }),
  body: z.object({
    site_id: z.string().uuid().optional(),
    supplier_id: z.string().uuid().optional(),
    audit_category_id: z.string().uuid().optional(),
    audit_plan_date: z.string().datetime().or(z.date()).optional(),
    sqe_pic_id: z.string().uuid().optional(),
    remarks: z.string().optional()
  })
});

// =====================================
// 2. RECORDS (Audit Execution)
// =====================================
const _booleanToPreprocess = z.preprocess(
    (v) => (v === 'true' || v === true || v === 1 || v === '1'),
    z.boolean()
);

export const QmqaRecordCreateSchema = z.object({
  body: z.object({
    from_schedule: _booleanToPreprocess.optional(),
    schedule_id: z.string().uuid().optional(),
    
    // Fallback if not from schedule
    site_id: z.string().uuid().optional(),
    supplier_id: z.string().uuid().optional(),
    audit_category_id: z.string().uuid().optional(),
    audit_plan_date: z.string().datetime().or(z.date()).optional(),
    sqe_pic_id: z.string().uuid().optional(),

    audit_type_id: z.string().uuid(),
    attention_id: z.string().uuid().optional().or(z.literal('')),
    pic_auditor_id: z.string().uuid().optional().or(z.literal('')),
    
    due_date: z.string().datetime().or(z.date()).optional().or(z.literal('')),
    audit_date: z.string().datetime().or(z.date()),
    audit_rating: z.preprocess((v) => Number(v), z.number().min(0).max(100).optional()),
    
    auditees: z.string().optional(),
    auditors: z.string().optional(),
    attendees: z.string().optional(),
    remarks: z.string().optional(),
    
    checker_id: z.string().uuid().optional().or(z.literal('')),
    approver_id: z.string().uuid().optional().or(z.literal('')),

    // Arrays
    cc_list: JsonParsedArray(QmqaCcListSchema),
    attachments: JsonParsedArray(QmqaAttachmentSchema)
  })
});

export const QmqaRecordUpdateSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Record ID format')
  }),
  body: z.object({
    audit_type_id: z.string().uuid().optional(),
    attention_id: z.string().uuid().optional().or(z.literal('')),
    pic_auditor_id: z.string().uuid().optional().or(z.literal('')),
    
    due_date: z.string().datetime().or(z.date()).optional().or(z.literal('')),
    audit_date: z.string().datetime().or(z.date()).optional(),
    audit_rating: z.preprocess((v) => Number(v), z.number().min(0).max(100).optional()),
    
    auditees: z.string().optional(),
    auditors: z.string().optional(),
    attendees: z.string().optional(),
    remarks: z.string().optional(),
    
    checker_id: z.string().uuid().optional().or(z.literal('')),
    approver_id: z.string().uuid().optional().or(z.literal('')),

    // Arrays
    cc_list: JsonParsedArray(QmqaCcListSchema),
    attachments: JsonParsedArray(QmqaAttachmentSchema)
  })
});

// =====================================
// 3. RESPONSES
// =====================================
export const QmqaResponseReportSchema = z.object({
    body: z.object({
        token: z.string().optional(),
        skip_initial: _booleanToPreprocess.optional(),
        remarks: z.string().optional(),
        attachments: JsonParsedArray(QmqaAttachmentSchema).optional()
    })
});

export const QmqaActionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid QMQA ID format')
  }),
  body: z.object({
    remarks: z.string().optional()
  }).optional()
});

export const QmqaIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid ID format')
  })
});

export type QMQAScheduleCreationInput = z.infer<typeof QmqaScheduleCreateSchema>['body'];
export type QMQAScheduleUpdateInput = z.infer<typeof QmqaScheduleUpdateSchema>['body'];
export type QMQARecordCreationInput = z.infer<typeof QmqaRecordCreateSchema>['body'];
export type QMQARecordUpdateInput = z.infer<typeof QmqaRecordUpdateSchema>['body'];
