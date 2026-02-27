import { z } from 'zod';

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
  first_target_dt: z.string().optional(),
  verification_result: z.string().optional(),
  remarks: z.string().optional(),
  create_date: z.string().optional(),
});

const CheckItemSchema = z.object({
  id: z.string().optional(),
  check_item: z.string().optional(),
  judgement: z.string().optional(),
  remarks: z.string().optional(),
  attribute_1: z.string().optional(),
  attribute_2: z.string().optional(),
  create_date: z.string().optional(),
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
    reviewer_name: z.string().optional(),

    // Checker / Approver (General)
    checker_name: z.string().optional(),
    approver_name: z.string().optional(),

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
    envi_checker_name: z.string().optional(),

    // QA Section
    qa_checker_id: z.string().optional(),
    qa_checker_name: z.string().optional(),
    qa_checker_dt_aprd: z.string().optional(),

    // --- Child Tables ---
    parts: z.array(PartSchema).optional(),
    attachments: z.array(AttachmentSchema).optional(),
    action_items: z.array(ActionItemSchema).optional(),
    check_items: z.array(CheckItemSchema).optional(),
  }).passthrough(), // Allow extra fields from frontend without stripping
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

// ============================================================================
// Exported Types
// ============================================================================

export type CreateFiveM1EInput = z.infer<typeof CreateFiveM1ESchema>['body'];
export type UpdateFiveM1EInput = z.infer<typeof UpdateFiveM1ESchema>['body'];
