export const SSI_STATUSES = [
  'PLANNED',
  'DRAFT',
  'AWAITING_CHECKED',
  'AWAITING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'ISSUED',
  'WITH_INITIAL_REPORT',
  'WITH_FINAL_REPORT',
  'RESPONSE_AWAIT_APPROVAL',
  'RESPONSE_REJECTED',
  'CLOSED',
  'CANCELLED',
] as const;

export type SsiStatus = typeof SSI_STATUSES[number];

export const SSI_WORKFLOW_ACTIONS = [
  'save-draft',
  'submit',
  'check',
  'approve',
  'reject',
  'issue',
  'cancel',
  'resubmit',
  'save-response',
  'submit-response',
  'review-response',
  'generate-certificate',
] as const;

export type SsiWorkflowAction = typeof SSI_WORKFLOW_ACTIONS[number];

export type SsiCategoryFamily =
  | 'QUALIFICATION'
  | 'REQUALIFICATION'
  | 'CERTIFICATION'
  | 'RECERTIFICATION'
  | 'AUDIT';

export type SsiArtifactSubtype =
  | 'SSI_QUALIFICATION_CHECKLIST'
  | 'READINESS_AUDIT'
  | 'SSI_CERTIFICATION_REPORT'
  | 'SSI_PATROL_AUDIT'
  | 'OGI_DATA_CONFIRMATION_AUDIT';

export type SsiArtifactOwner = 'ISSUER' | 'SUPPLIER';
export type SsiAuditResult = 'PASSED' | 'FAILED' | 'PENDING';
export type SsiApprovalRole = 'ISSUER' | 'CHECKER' | 'APPROVER';

export interface SsiAttachment {
  id: string;
  fileName: string;
  fileUrl?: string;
  fileExtension?: string;
  uploadedAt?: string;
  uploadedBy?: string;
}

export interface SsiArtifact {
  id: string;
  subtype: SsiArtifactSubtype;
  label: string;
  owner: SsiArtifactOwner;
  score?: number | null;
  result?: SsiAuditResult | null;
  remarks?: string;
  allowedFileTypes: string[];
  attachments: SsiAttachment[];
}

export interface SsiRepeatabilityTrial {
  id: string;
  label: string;
  score?: number | null;
  result?: SsiAuditResult | null;
  remarks?: string;
  attachments: SsiAttachment[];
}

export interface SsiRepeatabilityStudy {
  id: string;
  title: string;
  trials: SsiRepeatabilityTrial[];
  summaryRemarks?: string;
}

export interface SsiInspectorRegistrationRow {
  id: string;
  inspectorId?: string;
  name: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  category: string;
  company?: string;
  role?: string;
  scheduledDate?: string;
  remarks?: string;
}

export interface SsiWrittenExam {
  overviewAttachments: SsiAttachment[];
  writtenExamAttachments: SsiAttachment[];
  answerSheetAttachments: SsiAttachment[];
  remarks?: string;
}

export interface SsiCertificate {
  inspectorCertificateGenerated: boolean;
  companyCertificateGenerated: boolean;
  inspectorTemplateName?: string;
  companyTemplateName?: string;
  issueDate?: string;
  signatoryId?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  remarks?: string;
  attachments: SsiAttachment[];
}

export interface SsiCcEntry {
  id: string;
  userId?: string;
  name: string;
  email?: string;
}

export interface SsiApprovalAssignment {
  id?: string;
  role: SsiApprovalRole;
  userId?: string;
  userName?: string;
  remarks?: string;
  approvedAt?: string;
}

export interface SsiNotificationEvent {
  id: string;
  event: string;
  audience: 'ISSUER' | 'SUPPLIER' | 'CHECKER' | 'APPROVER' | 'CC';
  triggerAction: string;
  deepLinkTarget?: string;
}

export interface SsiSchedule {
  id: string;
  controlNo: string;
  mfgSiteId: string;
  mfgSiteName?: string;
  supplierId: string;
  supplierName?: string;
  categoryFamily: SsiCategoryFamily;
  auditType?: string;
  scheduledDate: string;
  sqePicId?: string;
  sqePicName?: string;
  remarks?: string;
  status: 'PLANNED' | 'CANCELLED';
  createdAt?: string;
  updatedAt?: string;
  recordId?: string | null;
  recordStatus?: SsiStatus | null;
}

export interface SsiRecord {
  id: string;
  scheduleId?: string;
  controlNo: string;
  createdDate?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  status: SsiStatus;
  workflowStageLabel?: string;
  availableActions: SsiWorkflowAction[];
  categoryFamily: SsiCategoryFamily;
  mfgSiteId: string;
  mfgSiteName?: string;
  supplierId: string;
  supplierName?: string;
  auditType?: string;
  sqePicId?: string;
  sqePicName?: string;
  scheduledDate: string;
  remarks?: string;
  inspectorRegistrations: SsiInspectorRegistrationRow[];
  writtenExam: SsiWrittenExam;
  repeatabilityStudy: SsiRepeatabilityStudy;
  auditArtifacts: SsiArtifact[];
  overallJudgment?: SsiAuditResult;
  overallJudgmentRemarks?: string;
  certificate?: SsiCertificate;
  ccList: SsiCcEntry[];
  approvers: SsiApprovalAssignment[];
  notifications?: SsiNotificationEvent[];
  nextApproverId?: string | null;
  nextApproverName?: string | null;
}

export interface SsiResponseDetail {
  id: string;
  recordId: string;
  responseStatus: string;
  payload: Record<string, unknown>;
  reviewRemarks?: string;
  submittedBy?: string | null;
  checkedBy?: string | null;
  approvedBy?: string | null;
  submittedAt?: string | null;
  checkedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
}

export interface SsiAchievementMetrics {
  totalRecords: number;
  passedRecords: number;
  failedRecords: number;
  pendingRecords: number;
  issuedRecords: number;
  closedRecords: number;
}

export interface SsiAchievementResponse {
  records: SsiRecord[];
  metrics: SsiAchievementMetrics;
}

export interface SsiReportsResponse {
  records: SsiRecord[];
  summary: Array<{ label: string; value: number }>;
}

export interface SsiLookupsPayload {
  sites: Array<Record<string, unknown>>;
  suppliers: Array<Record<string, unknown>>;
  inspectors: Array<Record<string, unknown>>;
  sqeUsers: Array<Record<string, unknown>>;
  categories: Array<{ label: string; value: SsiCategoryFamily }>;
}

export interface SsiActorContext {
  userId?: string | null;
  roleId?: string | null;
  roleName?: string | null;
  supplierIds: string[];
}
