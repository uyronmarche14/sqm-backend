import { z } from 'zod';

// Helper: Parse JSON string arrays from FormData (same as other modules)
const JsonParsedArray = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return []; }
    }
    return Array.isArray(val) ? val : [];
  }, z.array(schema).optional().default([]));

// CC Notification schema (matches TBL_5M1E_CC)
const FiveM1ECcSchema = z.object({
  user_id: z.string(),
  full_name: z.string().optional(),
  email: z.string().optional(),
});

// ============================================================================
// Shared sub-schemas for child tables
// ============================================================================

const PartSchema = z.object({
  part_id: z.string().optional(),
});

const AttachmentSchema = z.object({
  id: z.string().optional(),
  file_name: z.string().optional(),
  attribute_1: z.string().optional(),
  attribute_2: z.string().optional(),
});

const ActionItemSchema = z.object({
  id: z.string().optional(),
  action_item: z.string().optional(),
  pic: z.string().optional(),
  pic_name: z.string().optional(),
  first_target_dt: z.string().optional(),
  second_target_dt: z.string().optional(),
  third_target_dt: z.string().optional(),
  verification_result: z.string().optional(),
  remarks: z.string().optional(),
  create_date: z.string().optional(),
  attribute_01: z.string().optional(),
  attribute_02: z.string().optional(),
  attribute_03: z.string().optional(),
  attribute_04: z.string().optional(),
  attribute_05: z.string().optional(),
  // Action item attachments
  attachments: z.array(z.object({
    id: z.string().optional(),
    file_name: z.string(),
    attribute1: z.string().optional(),
    attribute2: z.string().optional(),
    attribute3: z.string().optional(),
    attribute4: z.string().optional(),
    attribute5: z.string().optional(),
  })).optional(),
});

const CheckItemSchema = z.object({
  id: z.string().optional(),
  check_item: z.string().optional(),
  judgement: z.string().optional(),
  remarks: z.string().optional(),
  attribute_1: z.string().optional(),
  attribute_2: z.string().optional(),
  attribute_3: z.string().optional(),
  attribute_4: z.string().optional(),
  attribute_5: z.string().optional(),
  create_date: z.string().optional(),
  // Check item attachments
  attachments: z.array(z.object({
    id: z.string().optional(),
    file_name: z.string(),
    attribute1: z.string().optional(),
    attribute2: z.string().optional(),
    attribute3: z.string().optional(),
    attribute4: z.string().optional(),
    attribute5: z.string().optional(),
  })).optional(),
});

// ============================================================================
// Create Schema — accepts all fields from the frontend domain-to-dto mapper
// ============================================================================

export const CreateFiveM1ESchema = z.object({
  body: z.object({
    // --- Application Table Fields ---
    title: z.string().optional(),
    supplier_id: z.string().optional(),
    supplier_cn: z.string().optional(),
    vendor_id: z.string().optional(),
    item_id: z.string().optional(),
    site_id: z.string().optional(),
    commodity_id: z.string().optional(),
    model_id: z.string().optional(),
    report_no: z.string().optional(),
    date_register: z.string().optional(),
    impact_date: z.string().optional(),
    engineer_remarks: z.string().optional(),

    // Accept both frontend naming conventions (class vs class_id)
    class: z.string().optional(),
    class_id: z.string().optional(),
    class_type: z.string().optional(),
    class_type_id: z.string().optional(),

    // Attributes (01-10)
    attribute_01: z.string().optional(),
    attribute_02: z.string().optional(),
    attribute_03: z.string().optional(),
    attribute_04: z.string().optional(),
    attribute_05: z.string().optional(),
    attribute_06: z.string().optional(),
    attribute_07: z.string().optional(),
    attribute_08: z.string().optional(),
    attribute_09: z.string().optional(),
    attribute_10: z.string().optional(),

    // Dedicated Evaluation Columns (new)
    rank_id: z.string().optional(),
    change_qc_process: z.union([z.string(), z.boolean(), z.number()]).optional(),
    change_supplier_spec: z.union([z.string(), z.boolean(), z.number()]).optional(),
    process_audit_result: z.string().optional(),
    environmental_approval: z.union([z.string(), z.boolean(), z.number()]).optional(),

    // CC Notification List
    cc_list: JsonParsedArray(FiveM1ECcSchema),

    // --- Workflow / Status ---
    status: z.string().default('DRAFT'),
    created_by: z.string().optional(),
    control_no: z.string().optional(),
    id: z.string().optional(),

    // --- Approval Table Fields (MPD Section) ---
    mpd_pic: z.string().optional(),
    mpd_checker: z.string().optional(),
    mpd_checker_name: z.string().optional(),
    mpd_checker_status: z.union([z.boolean(), z.number()]).optional(),
    mpd_chkr_dt_aprd: z.string().optional(),
    mpd_approver: z.string().optional(),
    mpd_approver_name: z.string().optional(),
    mpd_apr_dt_aprd: z.string().optional(),

    // HDE
    hde_pic: z.string().optional(),

    // Reviewer
    reviewer: z.string().optional(),
    reviewer_name: z.string().optional(),
    issue_date: z.string().optional(),

    // Checker / Approver (General)
    checker: z.string().optional(),
    checker_name: z.string().optional(),
    chkr_dt_aprd: z.string().optional(),
    approver: z.string().optional(),
    approver_name: z.string().optional(),
    approver_dt_aprd: z.string().optional(),
    apr_status: z.string().optional(),

    // Final Approver
    final_approver: z.string().optional(),
    fa_name: z.string().optional(),
    fa_dt_aprd: z.string().optional(),

    // Sequence
    approval_seq: z.coerce.number().optional(),
    revised_sequence: z.coerce.number().optional(),
    cr: z.string().optional(),
    mpd_checker_status_flag: z.string().optional(),

    // Evaluation IC
    evaluation_ic: z.string().optional(),
    evaluation_ic_dt_aprd: z.string().optional(),

    // Design Section
    ds_approver_necessary: z.string().optional(),
    design_approver_id: z.string().optional(),
    design_approver_name: z.string().optional(),
    design_approver_dt_aprd: z.string().optional(),
    ds_checker_necessary: z.string().optional(),
    design_checker_name: z.string().optional(),

    // Environment Section
    envi_approver_necessary: z.string().optional(),
    envi_approver_id: z.string().optional(),
    envi_approve_name: z.string().optional(),
    envi_approve_dt_aprd: z.string().optional(),
    envi_checker_necessary: z.string().optional(),
    envi_checker_id: z.string().optional(),
    envi_checker_name: z.string().optional(),
    envi_checker_dt_aprd: z.string().optional(),

    // QA Section
    qa_checker_id: z.string().optional(),
    qa_checker_name: z.string().optional(),
    qa_checker_dt_aprd: z.string().optional(),
    qa_checker_status: z.union([z.boolean(), z.number()]).optional(),

    // Final Approver
    fa_status: z.string().optional(),

    // Rejection
    rejected_by: z.string().optional(),
    rejected_date: z.string().optional(),

    // --- Status Remarks History ---
    status_remarks: z.array(z.object({
      id: z.string().optional(),
      remarks: z.string().optional(),
      remark_by: z.string(),
      status: z.string(),
      create_date: z.string().optional(),
      attribute1: z.string().optional(),
      attribute2: z.string().optional(),
      attribute3: z.string().optional(),
      attribute4: z.string().optional(),
      attribute5: z.string().optional(),
    })).optional(),

    // --- Child Tables ---
    parts: z.array(PartSchema).optional(),
    attachments: z.array(AttachmentSchema).optional(),
    action_items: z.array(ActionItemSchema).optional(),
    check_items: z.array(CheckItemSchema).optional(),
  }),
});

// ============================================================================
// Update Schema — partial version of Create
// ============================================================================

export const UpdateFiveM1ESchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: CreateFiveM1ESchema.shape.body.partial(),
});

export const FiveM1EAttachmentParamSchema = z.object({
  params: z.object({
    attachmentId: z.string().min(1, 'Attachment ID is required')
  })
});

export type CreateFiveM1EInput = z.infer<typeof CreateFiveM1ESchema>['body'];
export type UpdateFiveM1EInput = z.infer<typeof UpdateFiveM1ESchema>['body'];
