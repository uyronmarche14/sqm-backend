import type {
  SsiAchievementMetrics,
  SsiApprovalAssignment,
  SsiArtifact,
  SsiAttachment,
  SsiCategoryFamily,
  SsiCcEntry,
  SsiCertificate,
  SsiInspectorRegistrationRow,
  SsiNotificationEvent,
  SsiRecord,
  SsiRepeatabilityStudy,
  SsiSchedule,
  SsiStatus,
  SsiWrittenExam,
} from '../types/ssi.types.js';

export const SSI_CATEGORY_OPTIONS: Array<{ label: string; value: SsiCategoryFamily }> = [
  { label: 'Qualification', value: 'QUALIFICATION' },
  { label: 'Requalification', value: 'REQUALIFICATION' },
  { label: 'Certification', value: 'CERTIFICATION' },
  { label: 'Recertification', value: 'RECERTIFICATION' },
  { label: 'Audit', value: 'AUDIT' },
];

export const SSI_AUDIT_ARTIFACT_TEMPLATES: SsiArtifact[] = [
  {
    id: 'qualification-checklist',
    subtype: 'SSI_QUALIFICATION_CHECKLIST',
    label: 'SSI Qualification Checklist',
    owner: 'ISSUER',
    allowedFileTypes: ['xlsx'],
    attachments: [],
    result: 'PENDING',
  },
  {
    id: 'readiness-audit',
    subtype: 'READINESS_AUDIT',
    label: 'Readiness Audit',
    owner: 'ISSUER',
    allowedFileTypes: ['xlsx'],
    attachments: [],
    result: 'PENDING',
  },
  {
    id: 'certification-report',
    subtype: 'SSI_CERTIFICATION_REPORT',
    label: 'SSI Certification Report',
    owner: 'ISSUER',
    allowedFileTypes: ['xlsx'],
    attachments: [],
    result: 'PENDING',
  },
  {
    id: 'patrol-audit',
    subtype: 'SSI_PATROL_AUDIT',
    label: 'SSI Patrol Audit',
    owner: 'ISSUER',
    allowedFileTypes: ['xlsx'],
    attachments: [],
    result: 'PENDING',
  },
  {
    id: 'ogi-data-confirmation',
    subtype: 'OGI_DATA_CONFIRMATION_AUDIT',
    label: 'OGI Data Confirmation Audit',
    owner: 'ISSUER',
    allowedFileTypes: ['xlsx'],
    attachments: [],
    result: 'PENDING',
  },
];

export function categoryAllowsCertificate(category: SsiCategoryFamily) {
  return category === 'QUALIFICATION' || category === 'CERTIFICATION';
}

export function getDefaultAuditType(category: SsiCategoryFamily) {
  if (category === 'AUDIT') {
    return 'SSI Patrol Audit';
  }
  return 'N/A';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown) {
  return String(value || '');
}

function normalizeNumber(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
}

function normalizeAttachment(raw: unknown): SsiAttachment {
  const item = isObject(raw) ? raw : {};
  return {
    id: normalizeString(item.id || item.attachmentId),
    fileName: normalizeString(item.fileName || item.name),
    fileUrl: normalizeString(item.fileUrl || item.downloadUrl) || undefined,
    fileExtension: normalizeString(item.fileExtension || item.extension) || undefined,
    uploadedAt: normalizeString(item.uploadedAt) || undefined,
    uploadedBy: normalizeString(item.uploadedBy) || undefined,
  };
}

export function parseJsonArray<T>(
  raw: string | null | undefined,
  mapper: (value: unknown) => T,
): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(mapper) : [];
  } catch {
    return [];
  }
}

export function parseJsonObject<T>(
  raw: string | null | undefined,
  fallback: T,
  mapper: (value: Record<string, unknown>) => T,
): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return isObject(parsed) ? mapper(parsed) : fallback;
  } catch {
    return fallback;
  }
}

export function buildEmptySchedule(): SsiSchedule {
  return {
    id: '',
    controlNo: '',
    mfgSiteId: '',
    supplierId: '',
    categoryFamily: 'QUALIFICATION',
    auditType: 'N/A',
    scheduledDate: '',
    status: 'PLANNED',
  };
}

export function buildEmptyRecord(): SsiRecord {
  return {
    id: '',
    controlNo: '',
    status: 'DRAFT',
    availableActions: ['save-draft', 'submit'],
    categoryFamily: 'QUALIFICATION',
    mfgSiteId: '',
    supplierId: '',
    scheduledDate: '',
    inspectorRegistrations: [],
    writtenExam: {
      overviewAttachments: [],
      writtenExamAttachments: [],
      answerSheetAttachments: [],
    },
    repeatabilityStudy: {
      id: 'repeatability-study',
      title: 'Attribute Repeatability and Reproducibility',
      trials: [
        { id: 'trial-1', label: 'Upload Trial 1', attachments: [], result: 'PENDING' },
        { id: 'trial-2', label: 'Upload Trial 2', attachments: [], result: 'PENDING' },
        { id: 'trial-3', label: 'Upload Trial 3', attachments: [], result: 'PENDING' },
      ],
    },
    auditArtifacts: SSI_AUDIT_ARTIFACT_TEMPLATES.map((artifact) => ({ ...artifact, attachments: [] })),
    overallJudgment: 'PENDING',
    ccList: [],
    approvers: [],
    certificate: {
      inspectorCertificateGenerated: false,
      companyCertificateGenerated: false,
      attachments: [],
    },
    notifications: [],
  };
}

export function mapInspectorRegistration(raw: unknown): SsiInspectorRegistrationRow {
  const item = isObject(raw) ? raw : {};
  return {
    id: normalizeString(item.id),
    inspectorId: normalizeString(item.inspectorId) || undefined,
    name: normalizeString(item.name),
    firstName: normalizeString(item.firstName) || undefined,
    middleName: normalizeString(item.middleName) || undefined,
    lastName: normalizeString(item.lastName) || undefined,
    category: normalizeString(item.category),
    company: normalizeString(item.company) || undefined,
    role: normalizeString(item.role) || undefined,
    scheduledDate: normalizeString(item.scheduledDate) || undefined,
    remarks: normalizeString(item.remarks) || undefined,
  };
}

export function mapWrittenExam(raw: Record<string, unknown>): SsiWrittenExam {
  return {
    overviewAttachments: Array.isArray(raw.overviewAttachments) ? raw.overviewAttachments.map(normalizeAttachment) : [],
    writtenExamAttachments: Array.isArray(raw.writtenExamAttachments) ? raw.writtenExamAttachments.map(normalizeAttachment) : [],
    answerSheetAttachments: Array.isArray(raw.answerSheetAttachments) ? raw.answerSheetAttachments.map(normalizeAttachment) : [],
    remarks: normalizeString(raw.remarks) || undefined,
  };
}

export function mapRepeatabilityStudy(raw: Record<string, unknown>): SsiRepeatabilityStudy {
  return {
    id: normalizeString(raw.id || 'repeatability-study'),
    title: normalizeString(raw.title || 'Attribute Repeatability and Reproducibility'),
    trials: Array.isArray(raw.trials)
      ? raw.trials.map((trial) => {
          const item = isObject(trial) ? trial : {};
          return {
            id: normalizeString(item.id),
            label: normalizeString(item.label),
            score: normalizeNumber(item.score),
            result: normalizeString(item.result || 'PENDING') as 'PASSED' | 'FAILED' | 'PENDING',
            remarks: normalizeString(item.remarks) || undefined,
            attachments: Array.isArray(item.attachments) ? item.attachments.map(normalizeAttachment) : [],
          };
        })
      : buildEmptyRecord().repeatabilityStudy.trials,
    summaryRemarks: normalizeString(raw.summaryRemarks) || undefined,
  };
}

export function mapArtifact(raw: unknown): SsiArtifact {
  const item = isObject(raw) ? raw : {};
  return {
    id: normalizeString(item.id),
    subtype: normalizeString(item.subtype) as SsiArtifact['subtype'],
    label: normalizeString(item.label),
    owner: normalizeString(item.owner || 'ISSUER') as SsiArtifact['owner'],
    score: normalizeNumber(item.score) ?? null,
    result: normalizeString(item.result || 'PENDING') as SsiArtifact['result'],
    remarks: normalizeString(item.remarks) || undefined,
    allowedFileTypes: Array.isArray(item.allowedFileTypes) ? item.allowedFileTypes.map(String) : ['xlsx'],
    attachments: Array.isArray(item.attachments) ? item.attachments.map(normalizeAttachment) : [],
  };
}

export function mapCertificate(raw: Record<string, unknown>): SsiCertificate {
  return {
    inspectorCertificateGenerated: Boolean(raw.inspectorCertificateGenerated),
    companyCertificateGenerated: Boolean(raw.companyCertificateGenerated),
    inspectorTemplateName: normalizeString(raw.inspectorTemplateName) || undefined,
    companyTemplateName: normalizeString(raw.companyTemplateName) || undefined,
    issueDate: normalizeString(raw.issueDate) || undefined,
    signatoryId: normalizeString(raw.signatoryId) || undefined,
    signatoryName: normalizeString(raw.signatoryName) || undefined,
    signatoryTitle: normalizeString(raw.signatoryTitle) || undefined,
    remarks: normalizeString(raw.remarks) || undefined,
    attachments: Array.isArray(raw.attachments) ? raw.attachments.map(normalizeAttachment) : [],
  };
}

export function mapCcEntry(raw: unknown): SsiCcEntry {
  const item = isObject(raw) ? raw : {};
  return {
    id: normalizeString(item.id),
    userId: normalizeString(item.userId) || undefined,
    name: normalizeString(item.name),
    email: normalizeString(item.email) || undefined,
  };
}

export function mapApprovalAssignment(raw: unknown): SsiApprovalAssignment {
  const item = isObject(raw) ? raw : {};
  return {
    id: normalizeString(item.id) || undefined,
    role: normalizeString(item.role || 'ISSUER') as SsiApprovalAssignment['role'],
    userId: normalizeString(item.userId) || undefined,
    userName: normalizeString(item.userName) || undefined,
    remarks: normalizeString(item.remarks) || undefined,
    approvedAt: normalizeString(item.approvedAt) || undefined,
  };
}

export function mapNotification(raw: unknown): SsiNotificationEvent {
  const item = isObject(raw) ? raw : {};
  return {
    id: normalizeString(item.id),
    event: normalizeString(item.event),
    audience: normalizeString(item.audience || 'ISSUER') as SsiNotificationEvent['audience'],
    triggerAction: normalizeString(item.triggerAction),
    deepLinkTarget: normalizeString(item.deepLinkTarget) || undefined,
  };
}

export function serializeJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

export function buildSsiRecordFromRow(
  row: Record<string, unknown>,
  extras: {
    mfgSiteName?: string | null;
    supplierName?: string | null;
    sqePicName?: string | null;
    availableActions?: SsiRecord['availableActions'];
    workflowStageLabel?: string;
    nextApproverId?: string | null;
    nextApproverName?: string | null;
  } = {},
): SsiRecord {
  const empty = buildEmptyRecord();
  return {
    ...empty,
    id: normalizeString(row.ssi_record_id || row.id),
    scheduleId: normalizeString(row.ssi_plan_id || row.scheduleId) || undefined,
    controlNo: normalizeString(row.control_no || row.controlNo),
    createdDate: row.created_date ? new Date(String(row.created_date)).toISOString() : undefined,
    createdBy: normalizeString(row.created_by || row.createdBy) || undefined,
    updatedAt: row.last_update ? new Date(String(row.last_update)).toISOString() : undefined,
    updatedBy: normalizeString(row.updateby || row.updatedBy) || undefined,
    status: normalizeString(row.request_status || row.status || 'DRAFT') as SsiStatus,
    workflowStageLabel: extras.workflowStageLabel,
    availableActions: extras.availableActions || empty.availableActions,
    categoryFamily: normalizeString(row.category_family || row.categoryFamily || 'QUALIFICATION') as SsiCategoryFamily,
    mfgSiteId: normalizeString(row.mfg_site_id || row.mfgSiteId),
    mfgSiteName: normalizeString(extras.mfgSiteName || row.site_name || row.mfgSiteName) || undefined,
    supplierId: normalizeString(row.supplier_id || row.supplierId),
    supplierName: normalizeString(extras.supplierName || row.supplier_name || row.supplierName) || undefined,
    auditType: normalizeString(row.audit_type || row.auditType) || undefined,
    sqePicId: normalizeString(row.sqe_pic_id || row.sqePicId) || undefined,
    sqePicName: normalizeString(extras.sqePicName || row.sqe_pic_name || row.sqePicName) || undefined,
    scheduledDate: row.scheduled_date ? new Date(String(row.scheduled_date)).toISOString().slice(0, 10) : '',
    remarks: normalizeString(row.remarks) || undefined,
    inspectorRegistrations: parseJsonArray(String(row.inspector_registrations_json || ''), mapInspectorRegistration),
    writtenExam: parseJsonObject(String(row.written_exam_json || ''), empty.writtenExam, mapWrittenExam),
    repeatabilityStudy: parseJsonObject(String(row.repeatability_study_json || ''), empty.repeatabilityStudy, mapRepeatabilityStudy),
    auditArtifacts: parseJsonArray(String(row.audit_artifacts_json || ''), mapArtifact),
    overallJudgment: normalizeString(row.overall_judgment || 'PENDING') as SsiRecord['overallJudgment'],
    overallJudgmentRemarks: normalizeString(row.overall_judgment_remarks) || undefined,
    certificate: parseJsonObject(String(row.certificate_json || ''), empty.certificate!, mapCertificate),
    ccList: parseJsonArray(String(row.cc_list_json || ''), mapCcEntry),
    approvers: parseJsonArray(String(row.approvers_json || ''), mapApprovalAssignment),
    notifications: parseJsonArray(String(row.notifications_json || ''), mapNotification),
    nextApproverId: extras.nextApproverId ?? null,
    nextApproverName: extras.nextApproverName ?? null,
  };
}

export function buildSsiScheduleFromRow(row: Record<string, unknown>): SsiSchedule {
  return {
    id: normalizeString(row.ssi_plan_id || row.id),
    controlNo: normalizeString(row.control_no || row.controlNo),
    mfgSiteId: normalizeString(row.mfg_site_id || row.mfgSiteId),
    mfgSiteName: normalizeString(row.site_name || row.mfgSiteName) || undefined,
    supplierId: normalizeString(row.supplier_id || row.supplierId),
    supplierName: normalizeString(row.supplier_name || row.supplierName) || undefined,
    categoryFamily: normalizeString(row.category_family || row.categoryFamily || 'QUALIFICATION') as SsiCategoryFamily,
    auditType: normalizeString(row.audit_type || row.auditType) || undefined,
    scheduledDate: row.scheduled_date ? new Date(String(row.scheduled_date)).toISOString().slice(0, 10) : '',
    sqePicId: normalizeString(row.sqe_pic_id || row.sqePicId) || undefined,
    sqePicName: normalizeString(row.sqe_pic_name || row.sqePicName) || undefined,
    remarks: normalizeString(row.remarks) || undefined,
    status: normalizeString(row.request_status || row.status || 'PLANNED') as SsiSchedule['status'],
    createdAt: row.created_date ? new Date(String(row.created_date)).toISOString() : undefined,
    updatedAt: row.last_update ? new Date(String(row.last_update)).toISOString() : undefined,
    recordId: normalizeString(row.linked_record_id || row.record_id) || null,
    recordStatus: normalizeString(row.record_status || '') as SsiStatus || null,
  };
}

export function buildAchievementMetrics(records: SsiRecord[]): SsiAchievementMetrics {
  const totalRecords = records.length;
  const passedRecords = records.filter((record) => record.overallJudgment === 'PASSED').length;
  const failedRecords = records.filter((record) => record.overallJudgment === 'FAILED').length;
  const pendingRecords = records.filter((record) => record.overallJudgment === 'PENDING').length;
  const issuedRecords = records.filter((record) => record.status === 'ISSUED').length;
  const closedRecords = records.filter((record) => record.status === 'CLOSED').length;

  return {
    totalRecords,
    passedRecords,
    failedRecords,
    pendingRecords,
    issuedRecords,
    closedRecords,
  };
}
