/**
 * QMQA Validation Schemas
 * Zod schemas for request validation
 */

import { z } from 'zod';

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

/**
 * File validation schema
 * Validates file size and type
 */
const fileSchema = z
  .any()
  .refine((file) => {
    if (!file) return false;
    return file.size <= MAX_FILE_SIZE;
  }, 'File size must be less than 10MB')
  .refine((file) => {
    if (!file) return false;
    return ALLOWED_FILE_TYPES.includes(file.mimetype);
  }, 'File type must be PDF, JPG, PNG, XLSX, or DOCX');

/**
 * Optional file validation schema
 */
const optionalFileSchema = z
  .any()
  .optional()
  .refine((file) => {
    if (!file) return true;
    return file.size <= MAX_FILE_SIZE;
  }, 'File size must be less than 10MB')
  .refine((file) => {
    if (!file) return true;
    return ALLOWED_FILE_TYPES.includes(file.mimetype);
  }, 'File type must be PDF, JPG, PNG, XLSX, or DOCX');

/**
 * Schedule Schema (minimal form)
 * Used for POST /schedules
 * 
 * Validates: Requirements 5.1
 */
export const qmqaScheduleSchema = z.object({
  mfgSiteId: z.string().min(1, 'Manufacturing site is required'),
  categoryId: z.string().min(1, 'Category is required'),
  sqePicId: z.string().min(1, 'SQE PIC is required'),
  supplierId: z.string().min(1, 'Supplier is required'),
  auditPlanDate: z.string().min(1, 'Audit plan date is required'),
  remarks: z.string().optional()
});

/**
 * Audit Plan Schema (full form)
 * Used for POST /records (direct audit creation)
 * 
 * Validates: Requirements 5.2
 */
export const qmqaAuditPlanSchema = z.object({
  mfgSiteId: z.string().min(1, 'Manufacturing site is required'),
  supplierId: z.string().min(1, 'Supplier is required'),
  categoryId: z.string().min(1, 'Category is required'),
  auditPlanDate: z.string().min(1, 'Audit plan date is required'),
  sqePicId: z.string().min(1, 'SQE PIC is required'),
  auditTypeId: z.string().min(1, 'Audit type is required'),
  remarks: z.string().optional(),
  // Optional fields for pre-filled data from schedule
  scheduleId: z.string().optional(),
  controlNo: z.string().optional()
});

/**
 * Audit Details Schema
 * Used for PUT /records/:id (updating audit details)
 * 
 * Validates: Requirements 5.3
 */
export const qmqaAuditDetailsSchema = z.object({
  attentionId: z.string().min(1, 'Attention is required'),
  picAuditorId: z.string().min(1, 'PIC Auditor is required'),
  auditRating: z
    .number()
    .min(0, 'Rating must be at least 0')
    .max(100, 'Rating must be at most 100'),
  dueDate: z.string().min(1, 'Due date is required'),
  actualDate: z.string().min(1, 'Actual date is required'),
  auditees: z.string().min(1, 'Auditees are required'),
  auditors: z.string().min(1, 'Auditors are required'),
  attendees: z.string().min(1, 'Attendees are required'),
  remarks: z.string().min(1, 'Remarks are required')
});

/**
 * Response Schema
 * Used for POST /response/:token/initial and POST /response/:token/final
 * 
 * Validates: Requirements 5.4
 */
export const qmqaResponseSchema = z.object({
  skipInitial: z.boolean().optional(),
  initialReport: z.string().optional(),
  initialReportAttachment: optionalFileSchema,
  finalReport: z.string().optional(),
  finalReportAttachment: optionalFileSchema
}).refine(
  (data) => {
    // If skipInitial is false, initial report is required
    if (data.skipInitial === false) {
      return !!data.initialReport;
    }
    return true;
  },
  {
    message: 'Initial report is required when not skipping',
    path: ['initialReport']
  }
);

/**
 * Verification Schema
 * Used for POST /records/:id/verification
 * 
 * Validates: Requirements 5.5
 */
export const qmqaVerificationSchema = z.object({
  verificationNotes: z.string().min(1, 'Verification notes are required'),
  verificationAttachment: fileSchema,
  issuer: z.object({
    userId: z.string().min(1, 'Issuer is required'),
    date: z.string().optional(),
    remarks: z.string().optional()
  }),
  checker: z.object({
    userId: z.string().min(1, 'Checker is required'),
    date: z.string().optional(),
    remarks: z.string().optional()
  }),
  approver: z.object({
    userId: z.string().min(1, 'Approver is required'),
    date: z.string().optional(),
    remarks: z.string().optional()
  })
});

/**
 * Final Report Schema
 * Used for POST /response/:token/final
 * 
 * Validates: Requirements 5.6
 */
export const qmqaFinalReportSchema = z.object({
  finalReport: z.string().min(1, 'Final report is required'),
  finalReportAttachment: fileSchema
});
