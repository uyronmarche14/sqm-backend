import { z } from 'zod';
// --- Shared Helpers ---
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
        audit_plan_date: z.string().min(1, 'Audit plan date is required'),
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
        audit_plan_date: z.string().optional(),
        sqe_pic_id: z.string().uuid().optional(),
        remarks: z.string().optional()
    })
});
// =====================================
// 2. RECORDS (Audit Execution)
// =====================================
const _booleanToPreprocess = z.preprocess((v) => (v === 'true' || v === true || v === 1 || v === '1'), z.boolean());
export const QmqaRecordCreateSchema = z.object({
    body: z.object({
        from_schedule: _booleanToPreprocess.optional(),
        schedule_id: z.string().uuid().optional(),
        // Fallback if not from schedule
        site_id: z.string().uuid().optional(),
        supplier_id: z.string().uuid().optional(),
        audit_category_id: z.string().uuid().optional(),
        audit_plan_date: z.string().optional(),
        sqe_pic_id: z.string().uuid().optional(),
        audit_type_id: z.string().uuid(),
        attention_id: z.string().uuid().optional().or(z.literal('')),
        pic_auditor_id: z.string().uuid().optional().or(z.literal('')),
        due_date: z.string().optional().or(z.literal('')),
        audit_date: z.string().min(1, 'Audit date is required'),
        audit_rating: z.preprocess((v) => {
            if (v === '' || v === undefined || v === null)
                return undefined;
            const num = Number(v);
            return isNaN(num) ? undefined : num;
        }, z.number().min(0).max(100).optional()),
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
        // Audit Plan details
        site_id: z.string().uuid().optional(),
        supplier_id: z.string().uuid().optional(),
        audit_category_id: z.string().uuid().optional(),
        audit_plan_date: z.string().optional(),
        sqe_pic_id: z.string().uuid().optional(),
        // Record details
        audit_type_id: z.string().uuid().optional(),
        attention_id: z.string().uuid().optional().or(z.literal('')),
        pic_auditor_id: z.string().uuid().optional().or(z.literal('')),
        due_date: z.string().optional().or(z.literal('')),
        audit_date: z.string().optional(),
        audit_rating: z.preprocess((v) => {
            if (v === '' || v === undefined || v === null)
                return undefined;
            const num = Number(v);
            return isNaN(num) ? undefined : num;
        }, z.number().min(0).max(100).optional()),
        auditees: z.string().optional(),
        auditors: z.string().optional(),
        attendees: z.string().optional(),
        remarks: z.string().optional(),
        // Approval info
        checker_id: z.string().uuid().optional().or(z.literal('')),
        approver_id: z.string().uuid().optional().or(z.literal('')),
        // Arrays
        cc_list: JsonParsedArray(QmqaCcListSchema).optional(),
        attachments: JsonParsedArray(QmqaAttachmentSchema).optional()
    })
});
// =====================================
// 3. VERIFICATION (Cycle 2 Approval)
// =====================================
export const QmqaVerificationSchema = z.object({
    params: z.object({
        id: z.string().uuid('Invalid QMQA ID format')
    }),
    body: z.object({
        verified_by: z.string().uuid(),
        verification_remarks: z.string().optional(),
        verification_date: z.string().optional(),
        // Cycle 2 approval fields
        cycle2_checker_id: z.string().uuid().optional(),
        cycle2_checker_remarks: z.string().optional(),
        cycle2_approver_id: z.string().uuid().optional(),
        cycle2_approver_remarks: z.string().optional(),
        attachments: JsonParsedArray(QmqaAttachmentSchema).optional()
    })
});
// =====================================
// 4. RESPONSES
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
export const QmqaAttachmentParamSchema = z.object({
    params: z.object({
        moduleType: z.string().min(1, 'Module type is required'),
        attachmentId: z.string().uuid('Invalid Attachment ID format')
    })
});
