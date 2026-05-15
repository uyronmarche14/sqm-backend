import { Insertable, Selectable, Updateable } from 'kysely';

export interface SsiPlanTable {
  ssi_plan_id: string;
  control_no: string;
  mfg_site_id: string;
  supplier_id: string;
  category_family: string;
  audit_type: string | null;
  scheduled_date: Date | string;
  sqe_pic_id: string;
  remarks: string | null;
  request_status: string;
  linked_record_id: string | null;
  cancel_remarks: string | null;
  created_date: Date | string;
  last_update: Date | string;
  updateby: string;
}

export interface SsiRecordTable {
  ssi_record_id: string;
  ssi_plan_id: string | null;
  control_no: string;
  request_status: string;
  mfg_site_id: string;
  supplier_id: string;
  category_family: string;
  audit_type: string | null;
  sqe_pic_id: string;
  scheduled_date: Date | string;
  remarks: string | null;
  created_date: Date | string;
  created_by: string | null;
  issued_date: Date | string | null;
  closed_date: Date | string | null;
  overall_judgment: string | null;
  overall_judgment_remarks: string | null;
  inspector_registrations_json: string | null;
  written_exam_json: string | null;
  repeatability_study_json: string | null;
  audit_artifacts_json: string | null;
  certificate_json: string | null;
  cc_list_json: string | null;
  approvers_json: string | null;
  notifications_json: string | null;
  issuer_id: string | null;
  checker_id: string | null;
  approver_id: string | null;
  issuer_remarks: string | null;
  checker_remarks: string | null;
  approver_remarks: string | null;
  submit_date: Date | string | null;
  checked_date: Date | string | null;
  approved_date: Date | string | null;
  rejected_date: Date | string | null;
  last_update: Date | string;
  updateby: string;
}

export interface SsiResponseTable {
  ssi_response_id: string;
  ssi_record_id: string;
  response_status: string;
  payload_json: string | null;
  review_remarks: string | null;
  submitted_by: string | null;
  checked_by: string | null;
  approved_by: string | null;
  submitted_at: Date | string | null;
  checked_at: Date | string | null;
  approved_at: Date | string | null;
  rejected_at: Date | string | null;
  last_update: Date | string;
  updateby: string;
}

export interface SsiWorkflowEventTable {
  ssi_workflow_event_id: string;
  ssi_record_id: string;
  action_name: string;
  from_status: string | null;
  to_status: string;
  actor_user_id: string | null;
  remarks: string | null;
  payload_json: string | null;
  created_date: Date | string;
}

export type SsiPlan = Selectable<SsiPlanTable>;
export type NewSsiPlan = Insertable<SsiPlanTable>;
export type SsiPlanUpdate = Updateable<SsiPlanTable>;
export type SsiRecord = Selectable<SsiRecordTable>;
export type NewSsiRecord = Insertable<SsiRecordTable>;
export type SsiRecordUpdate = Updateable<SsiRecordTable>;
export type SsiResponse = Selectable<SsiResponseTable>;
export type NewSsiResponse = Insertable<SsiResponseTable>;
export type SsiResponseUpdate = Updateable<SsiResponseTable>;
export type SsiWorkflowEvent = Selectable<SsiWorkflowEventTable>;
export type NewSsiWorkflowEvent = Insertable<SsiWorkflowEventTable>;
export type SsiWorkflowEventUpdate = Updateable<SsiWorkflowEventTable>;
