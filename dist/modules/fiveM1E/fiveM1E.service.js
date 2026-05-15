import { fiveM1ERepository } from './fiveM1E.repository.js';
import { SmartMapper } from '../../shared/infrastructure/SmartMapper.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/AppError.js';
import { db } from '../../shared/infrastructure/db.js';
import { fiveM1EWorkflowService } from './workflow/fiveM1E-workflow.service.js';
import { FIVE_M1E_WORKFLOW_STAGE, } from './workflow/fiveM1E-workflow.constants.js';
import { getFiveM1EWorkflowStageFormIds, normalizeFiveM1EWorkflowStage, } from './workflow/fiveM1E-workflow.utils.js';
import { assertWorkflowRecordAccess, filterWorkflowRecordsByScope, } from '../../shared/utils/workflow-access.js';
import { permissionService } from '../../shared/services/permission.service.js';
import { controlNumberService } from '../../shared/services/control-number.service.js';
import { attachmentService } from '../../shared/services/attachment.service.js';
import { extractOriginalFilenameMarker, formatAttachmentRemarks, } from '../../shared/utils/attachment-remarks.js';
import { isAdminRole } from '../../shared/utils/admin.utils.js';
import { assertNoWorkflowMutationFields } from '../../shared/utils/reject-workflow-mutation-fields.js';
import { validateAssignmentActorForForms } from '../../shared/utils/assignment-validation.utils.js';
const FIVE_M1E_ATTACHMENT_RECORD_CONFIG = {
    tableName: 'TBL_5M1E_Attachment',
    ownerColumn: 'ControlNo',
    idColumn: 'ID',
    fileNameColumn: 'FileName',
    pathColumn: 'Attribute1',
    remarksColumn: 'Attribute2',
    lastUpdateColumn: null,
    updatedByColumn: null,
};
/**
 * 5M1E Domain Service
 * Encapsulates core business logic and mapping.
 */
// Define mapping explicitly to automate DTO to Database translations
// Maps frontend snake_case DTO keys → PascalCase DB column names
const applicationSchema = {
    title: 'Title',
    supplier_id: 'SupplierID',
    supplier_cn: 'SupplierCN',
    vendor_id: 'VendorID',
    item_id: 'ItemID',
    site_id: 'SiteID',
    commodity_id: 'CommodityID',
    model_id: 'ModelID',
    report_no: 'ReportNo',
    date_register: 'DateRegister',
    class_id: 'Class',
    class_type_id: 'ClassType',
    impact_date: 'ImpactDate',
    engineer_remarks: 'EngineerRemarks',
    attribute_01: 'Attribute01',
    attribute_02: 'Attribute02',
    attribute_03: 'Attribute03',
    attribute_04: 'Attribute04',
    attribute_05: 'Attribute05',
    attribute_06: 'Attribute06',
    attribute_07: 'Attribute07',
    attribute_08: 'Attribute08',
    attribute_09: 'Attribute09',
    attribute_10: 'Attribute10',
    // Dedicated Evaluation Columns (new — replacing generic Attribute usage)
    rank_id: 'RankID',
    change_qc_process: 'ChangeQCProcess',
    change_supplier_spec: 'ChangeSupplierSpec',
    process_audit_result: 'ProcessAuditResult',
    // Note: environmental_approval is mapped manually to TBL_5M1E_Approval.EnviAppproverNecessary as YES/NO
};
/**
 * Normalize frontend field aliases before SmartMapper:
 * Frontend sends `class` and `class_type`, but SmartMapper expects `class_id` and `class_type_id`.
 */
function normalizeInput(data) {
    const normalized = { ...data };
    // Frontend sends `class` → normalize to `class_id`
    if (normalized.class && !normalized.class_id) {
        normalized.class_id = normalized.class;
    }
    // Frontend sends `class_type` → normalize to `class_type_id`
    if (normalized.class_type && !normalized.class_type_id) {
        normalized.class_type_id = normalized.class_type;
    }
    delete normalized.class;
    delete normalized.class_type;
    return normalized;
}
function toRequiredLegacyString(value, fallback = '') {
    if (value === undefined || value === null) {
        return fallback;
    }
    return String(value);
}
function inferLegacyAttachmentFileName(value, fallback = 'attachment') {
    const raw = String(value || '').split('?')[0] || '';
    const normalized = raw.split(/[\\/]/).filter(Boolean);
    return normalized[normalized.length - 1] || fallback;
}
const FIVE_M1E_IGNORED_WRITE_FIELDS = [
    'control_no',
    'id',
    'created_by',
    'approval_seq',
    'revised_sequence',
    'cr',
    'rejected_by',
    'rejected_date',
    'mpd_checker',
    'mpd_checker_name',
    'mpd_checker_status',
    'mpd_checker_status_flag',
    'mpd_chkr_dt_aprd',
    'mpd_approver_name',
    'mpd_apr_dt_aprd',
    'hde_pic',
    'reviewer_name',
    'issue_date',
    'checker_name',
    'chkr_dt_aprd',
    'approver_name',
    'approver_dt_aprd',
    'apr_status',
    'fa_name',
    'fa_dt_aprd',
    'fa_status',
    'evaluation_ic_dt_aprd',
    'design_approver_name',
    'design_approver_dt_aprd',
    'envi_approve_name',
    'envi_approve_dt_aprd',
    'envi_checker_id',
    'envi_checker_name',
    'envi_checker_dt_aprd',
    'qa_checker_name',
    'qa_checker_dt_aprd',
    'qa_checker_status',
];
const FIVE_M1E_YES_NO_FIELDS = new Set([
    'ds_approver_necessary',
    'ds_checker_necessary',
    'envi_approver_necessary',
    'environmental_approval',
]);
const FIVE_M1E_BOOLEANISH_FIELDS = new Set([
    'attribute_04',
    'change_qc_process',
    'change_supplier_spec',
]);
const FIVE_M1E_STAGE_GUARDED_FIELDS = {
    site_id: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER],
        existingKeys: ['site_id', 'SiteID'],
        label: 'site_id',
    },
    commodity_id: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER],
        existingKeys: ['commodity_id', 'CommodityID'],
        label: 'commodity_id',
    },
    model_id: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER],
        existingKeys: ['model_id', 'ModelID'],
        label: 'model_id',
    },
    impact_date: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER],
        existingKeys: ['impact_date', 'ImpactDate'],
        label: 'impact_date',
    },
    attribute_03: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER],
        existingKeys: ['attribute_03', 'Attribute03'],
        label: 'attribute_03',
    },
    attribute_04: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER],
        existingKeys: ['attribute_04', 'Attribute04'],
        label: 'attribute_04',
    },
    engineer_remarks: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER],
        existingKeys: ['engineer_remarks', 'EngineerRemarks'],
        label: 'engineer_remarks',
    },
    mpd_approver: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER],
        existingKeys: ['mpd_approver', 'MPDApprover'],
        label: 'mpd_approver',
        assignmentRole: 'approver',
        validationStages: [FIVE_M1E_WORKFLOW_STAGE.MPD_APPROVER],
    },
    report_no: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.REVIEWER, FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC],
        existingKeys: ['report_no', 'ReportNo'],
        label: 'report_no',
    },
    class_id: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.REVIEWER, FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC],
        existingKeys: ['class_id', 'Class'],
        label: 'class_id',
    },
    class_type_id: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.REVIEWER, FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC],
        existingKeys: ['class_type_id', 'ClassType'],
        label: 'class_type_id',
    },
    attribute_02: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.REVIEWER, FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC],
        existingKeys: ['attribute_02', 'Attribute02'],
        label: 'attribute_02',
    },
    rank_id: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.REVIEWER, FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC],
        existingKeys: ['rank_id', 'RankID'],
        label: 'rank_id',
    },
    change_qc_process: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.REVIEWER, FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC],
        existingKeys: ['change_qc_process', 'ChangeQCProcess'],
        label: 'change_qc_process',
    },
    change_supplier_spec: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.REVIEWER, FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC],
        existingKeys: ['change_supplier_spec', 'ChangeSupplierSpec'],
        label: 'change_supplier_spec',
    },
    process_audit_result: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.REVIEWER, FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC],
        existingKeys: ['process_audit_result', 'ProcessAuditResult'],
        label: 'process_audit_result',
    },
    environmental_approval: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.REVIEWER, FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC],
        existingKeys: ['environmental_approval', 'envi_approver_necessary', 'EnviAppproverNecessary'],
        label: 'environmental_approval',
    },
    mpd_pic: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.REVIEWER, FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC],
        existingKeys: ['mpd_pic', 'MPDPIC'],
        label: 'mpd_pic',
        assignmentRole: 'owner',
        validationStages: [FIVE_M1E_WORKFLOW_STAGE.REVIEWER],
    },
    evaluation_ic: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.REVIEWER, FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC],
        existingKeys: ['evaluation_ic', 'EvaluationIC'],
        label: 'evaluation_ic',
        assignmentRole: 'owner',
        validationStages: [FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC],
    },
    reviewer: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.REVIEWER, FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC],
        existingKeys: ['reviewer', 'Reviewer'],
        label: 'reviewer',
        assignmentRole: 'issuer',
        validationStages: [FIVE_M1E_WORKFLOW_STAGE.DRAFT],
    },
    checker: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.REVIEWER, FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC],
        existingKeys: ['checker', 'Checker'],
        label: 'checker',
        assignmentRole: 'checker',
        validationStages: [FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER],
    },
    approver: {
        allowedStages: [FIVE_M1E_WORKFLOW_STAGE.REVIEWER, FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC],
        existingKeys: ['approver', 'Approver'],
        label: 'approver',
        assignmentRole: 'approver',
        validationStages: [FIVE_M1E_WORKFLOW_STAGE.MPD_APPROVER],
    },
    ds_approver_necessary: {
        allowedStages: [
            FIVE_M1E_WORKFLOW_STAGE.APPROVED,
            FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION,
            FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE,
        ],
        existingKeys: ['ds_approver_necessary', 'DSAppproverNecessary'],
        label: 'ds_approver_necessary',
    },
    ds_checker_necessary: {
        allowedStages: [
            FIVE_M1E_WORKFLOW_STAGE.APPROVED,
            FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION,
            FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE,
        ],
        existingKeys: ['ds_checker_necessary', 'DSCheckerNecessary'],
        label: 'ds_checker_necessary',
    },
    design_approver_id: {
        allowedStages: [
            FIVE_M1E_WORKFLOW_STAGE.APPROVED,
            FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION,
            FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE,
        ],
        existingKeys: ['design_approver_id', 'DesignApproverID'],
        label: 'design_approver_id',
        assignmentRole: 'approver',
        validationStages: [FIVE_M1E_WORKFLOW_STAGE.DESIGN_APPROVER],
    },
    envi_approver_necessary: {
        allowedStages: [
            FIVE_M1E_WORKFLOW_STAGE.APPROVED,
            FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION,
            FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE,
        ],
        existingKeys: ['envi_approver_necessary', 'EnviAppproverNecessary'],
        label: 'envi_approver_necessary',
    },
    envi_approver_id: {
        allowedStages: [
            FIVE_M1E_WORKFLOW_STAGE.APPROVED,
            FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION,
            FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE,
        ],
        existingKeys: ['envi_approver_id', 'EnviApproverID'],
        label: 'envi_approver_id',
        assignmentRole: 'approver',
        validationStages: [FIVE_M1E_WORKFLOW_STAGE.ENVI_APPROVER],
    },
    qa_checker_id: {
        allowedStages: [
            FIVE_M1E_WORKFLOW_STAGE.APPROVED,
            FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION,
            FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE,
        ],
        existingKeys: ['qa_checker_id', 'QACheckerID'],
        label: 'qa_checker_id',
        assignmentRole: 'checker',
        validationStages: [FIVE_M1E_WORKFLOW_STAGE.QA_CHECKER],
    },
    final_approver: {
        allowedStages: [
            FIVE_M1E_WORKFLOW_STAGE.APPROVED,
            FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION,
            FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE,
        ],
        existingKeys: ['final_approver', 'FinalApprover'],
        label: 'final_approver',
        assignmentRole: 'approver',
        validationStages: [FIVE_M1E_WORKFLOW_STAGE.FINAL_APPROVER],
    },
};
function hasMeaningfulWriteValue(value) {
    if (value === undefined || value === null) {
        return false;
    }
    if (typeof value === 'string') {
        return value.trim().length > 0;
    }
    return true;
}
function normalizeYesNo(value) {
    if (!hasMeaningfulWriteValue(value)) {
        return null;
    }
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'yes' || normalized === 'true' || normalized === '1') {
        return 'YES';
    }
    if (normalized === 'no' || normalized === 'false' || normalized === '0') {
        return 'NO';
    }
    return normalized.toUpperCase();
}
function normalizeBooleanish(value) {
    if (!hasMeaningfulWriteValue(value)) {
        return null;
    }
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
        return '1';
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
        return '0';
    }
    return normalized;
}
function normalizeComparableFiveM1EValue(field, value) {
    if (FIVE_M1E_YES_NO_FIELDS.has(field)) {
        return normalizeYesNo(value);
    }
    if (FIVE_M1E_BOOLEANISH_FIELDS.has(field)) {
        return normalizeBooleanish(value);
    }
    if (!hasMeaningfulWriteValue(value)) {
        return null;
    }
    return String(value).trim();
}
function getRecordComparableFiveM1EValue(record, field, keys) {
    if (!record) {
        return null;
    }
    for (const key of keys) {
        const value = record[key];
        const normalizedValue = normalizeComparableFiveM1EValue(field, value);
        if (normalizedValue !== null) {
            return normalizedValue;
        }
    }
    return null;
}
export class FiveM1EService {
    repository;
    permissions;
    attachments;
    constructor(repository = fiveM1ERepository, permissions = permissionService, attachments = attachmentService) {
        this.repository = repository;
        this.permissions = permissions;
        this.attachments = attachments;
    }
    isAdminActor(actor) {
        return isAdminRole(actor?.roleName);
    }
    isParticipant(record, userId) {
        if (!userId) {
            return false;
        }
        return [
            record.CreatedBy,
            record.Reviewer,
            record.Checker,
            record.Approver,
            record.MPDPIC,
            record.MPDChecker,
            record.MPDApprover,
            record.EvaluationIC,
            record.DesignApproverID,
            record.EnviApproverID,
            record.QACheckerID,
            record.FinalApprover,
        ].includes(userId);
    }
    buildAttachmentView(attachment) {
        const attachmentId = String(attachment.ID || attachment.id || attachment.attachmentId || '');
        const downloadUrl = attachmentId ? `/api/5m1e/attachments/${attachmentId}` : '';
        return {
            ...attachment,
            id: attachmentId,
            attachmentId,
            downloadUrl,
            download_url: downloadUrl,
            attachmentUrl: downloadUrl,
            attribute_1: downloadUrl,
        };
    }
    async syncMainAttachments(controlNo, attachments, files, userId) {
        if (attachments === undefined) {
            return {
                cleanupQueue: [],
            };
        }
        const newAttachmentCount = attachments.filter((attachment) => {
            const attachmentId = attachment.id || attachment.attachmentId;
            return !attachmentId;
        }).length;
        const reservedIds = await this.repository.reserveAttachmentIds(newAttachmentCount, db);
        let nextIdIndex = 0;
        return this.attachments.syncAttachments(db, attachments, files, {
            ownerId: controlNo,
            userId,
            now: new Date(),
            recordConfig: FIVE_M1E_ATTACHMENT_RECORD_CONFIG,
            createId: () => String(reservedIds[nextIdIndex++] || Date.now()),
            remarkFormatter: ({ command, existing, originalName }) => formatAttachmentRemarks(command.remarks ?? existing?.remarks ?? null, originalName, extractOriginalFilenameMarker(existing?.remarks))?.slice(0, 200) || null,
            pathValueResolver: ({ uploadedFile, existing }) => uploadedFile ? null : (existing?.storagePath ?? null),
        });
    }
    resolveCheckItemUploadedFile(attachment, files) {
        const uploadId = attachment.client_upload_id || attachment.clientUploadId;
        const requestedField = attachment.file_field ||
            attachment.fileField ||
            (uploadId ? `file:5m1e-check-item:${uploadId}` : null);
        if (requestedField) {
            const matchedByField = files.find((file) => file.fieldname === requestedField);
            if (matchedByField) {
                return matchedByField;
            }
        }
        const expectedOriginalName = attachment.file_name || attachment.fileName;
        if (!expectedOriginalName) {
            return undefined;
        }
        return files.find((file) => file.originalname === expectedOriginalName);
    }
    normalizeCheckItemsForPersistence(checkItems, files) {
        if (!Array.isArray(checkItems)) {
            return checkItems;
        }
        return checkItems.map((item) => {
            const hasNestedAttachments = Array.isArray(item.attachments) && item.attachments.length > 0;
            const sourceAttachments = hasNestedAttachments
                ? item.attachments
                : (item.attribute_2
                    ? [{
                            file_name: inferLegacyAttachmentFileName(item.attribute_2, item.check_item || 'attachment'),
                            attribute1: item.attribute_2,
                        }]
                    : []);
            const attachments = sourceAttachments
                .map((attachment) => {
                const uploadedFile = this.resolveCheckItemUploadedFile(attachment, files);
                const persistedPath = uploadedFile?.path ||
                    attachment.attribute1 ||
                    attachment.attribute_1 ||
                    attachment.download_url ||
                    null;
                const fileName = attachment.file_name ||
                    uploadedFile?.originalname ||
                    inferLegacyAttachmentFileName(persistedPath, item.check_item || 'attachment');
                if (!fileName) {
                    return null;
                }
                return {
                    id: attachment.id,
                    file_name: fileName,
                    attribute1: persistedPath,
                    attribute2: attachment.attribute2 || attachment.attribute_2 || null,
                };
            })
                .filter((attachment) => Boolean(attachment));
            const legacyAttachmentPath = hasNestedAttachments ? null : (item.attribute_2 || null);
            return {
                ...item,
                attachments,
                attribute_2: legacyAttachmentPath,
            };
        });
    }
    async hasReadableRolePermission(userId, formId) {
        return ((await this.permissions.checkRolePermission(userId, formId, 'viewlist')) ||
            (await this.permissions.checkRolePermission(userId, formId, 'view')));
    }
    async hasStageReadAccess(userId, stage, cache) {
        const cacheKey = String(stage || '');
        const resolver = async () => {
            const formIds = getFiveM1EWorkflowStageFormIds(stage);
            for (const formId of formIds) {
                if (await this.hasReadableRolePermission(userId, formId)) {
                    return true;
                }
            }
            return false;
        };
        if (!cache) {
            return resolver();
        }
        if (!cache.has(cacheKey)) {
            cache.set(cacheKey, resolver());
        }
        return cache.get(cacheKey);
    }
    async hasSearchReadAccess(userId, cache) {
        if (!cache) {
            return this.hasReadableRolePermission(userId, '5M1ESEARCH-11-01');
        }
        if (!cache.value) {
            cache.value = this.hasReadableRolePermission(userId, '5M1ESEARCH-11-01');
        }
        return cache.value;
    }
    stripIgnoredWriteFields(payload) {
        const sanitizedPayload = { ...payload };
        for (const field of FIVE_M1E_IGNORED_WRITE_FIELDS) {
            delete sanitizedPayload[field];
        }
        return sanitizedPayload;
    }
    assertCreateStatusPayload(payload) {
        if (!hasMeaningfulWriteValue(payload.status)) {
            return;
        }
        const normalizedStatus = String(payload.status).trim().toUpperCase();
        if (normalizedStatus === 'DRAFT') {
            return;
        }
        throw new BadRequestError('5M1E workflow state cannot be changed through the generic save endpoint. New records must start as DRAFT.');
    }
    async assertStageOwnedWriteFields(payload, stage, existing) {
        const invalidFields = Object.entries(FIVE_M1E_STAGE_GUARDED_FIELDS)
            .filter(([field, rule]) => {
            if (!Object.prototype.hasOwnProperty.call(payload, field)) {
                return false;
            }
            const nextValue = normalizeComparableFiveM1EValue(field, payload[field]);
            const existingValue = getRecordComparableFiveM1EValue(existing, field, rule.existingKeys);
            const mutated = nextValue !== existingValue;
            return mutated && !rule.allowedStages.includes(stage);
        })
            .map(([field]) => field);
        if (invalidFields.length === 0) {
            return;
        }
        throw new BadRequestError(`5M1E generic save cannot modify ${invalidFields.join(', ')} during ${stage}. Use the current stage owner or the dedicated workflow action instead.`);
    }
    async validateStageAssignmentChanges(payload, stage, existing) {
        for (const [field, rule] of Object.entries(FIVE_M1E_STAGE_GUARDED_FIELDS)) {
            if (!rule.assignmentRole || !rule.allowedStages.includes(stage)) {
                continue;
            }
            if (!Object.prototype.hasOwnProperty.call(payload, field)) {
                continue;
            }
            const nextValue = normalizeComparableFiveM1EValue(field, payload[field]);
            const existingValue = getRecordComparableFiveM1EValue(existing, field, rule.existingKeys);
            if (nextValue === null || nextValue === existingValue) {
                continue;
            }
            const validationStages = rule.validationStages?.length
                ? rule.validationStages
                : [stage];
            const formIds = Array.from(new Set(validationStages.flatMap((validationStage) => getFiveM1EWorkflowStageFormIds(validationStage))));
            await validateAssignmentActorForForms(String(payload[field]), rule.assignmentRole, formIds, { roleLabel: rule.label });
        }
    }
    async resolveReadAccess(record, actor) {
        const workflow = await fiveM1EWorkflowService.getWorkflowMetadata(record, actor?.userId);
        const isMine = this.isParticipant(record, actor?.userId);
        const hasWorkflowAccess = Boolean(actor?.userId) &&
            Array.isArray(workflow.availableActions) &&
            workflow.availableActions.length > 0;
        let canSearchView = false;
        let canStageView = false;
        if (!this.isAdminActor(actor) && actor?.userId && !isMine && !hasWorkflowAccess) {
            canStageView = await this.hasStageReadAccess(actor.userId, workflow.workflowStage);
            if (!canStageView) {
                canSearchView = await this.hasSearchReadAccess(actor.userId);
            }
        }
        return {
            workflow,
            allowed: this.isAdminActor(actor) ||
                canSearchView ||
                canStageView ||
                isMine ||
                hasWorkflowAccess,
        };
    }
    async assertReadableRecord(record, actor) {
        const access = await this.resolveReadAccess(record, actor);
        assertWorkflowRecordAccess({
            allowed: access.allowed,
            action: 'view',
            moduleName: '5M1E',
        });
        return access.workflow;
    }
    /**
     * Creates a new 5M1E Application and its initial Approval state
     */
    async createApplication(data, actorOrUserId, files = []) {
        console.log('[5M1E Service] Create Application Payload:', JSON.stringify(data, null, 2));
        console.log(`[5M1E Service] Attached files count: ${files.length}`);
        const actor = typeof actorOrUserId === 'string'
            ? { userId: actorOrUserId }
            : actorOrUserId;
        const userId = actor.userId;
        if (!userId) {
            throw new BadRequestError('Authenticated user is required to create a 5M1E application.');
        }
        const controlNo = controlNumberService.buildFiveM1ETemporary();
        // Normalize field aliases (class → class_id, class_type → class_type_id)
        this.assertCreateStatusPayload(data);
        const normalized = this.stripIgnoredWriteFields(normalizeInput(data));
        await this.assertStageOwnedWriteFields(normalized, FIVE_M1E_WORKFLOW_STAGE.DRAFT);
        await this.validateStageAssignmentChanges(normalized, FIVE_M1E_WORKFLOW_STAGE.DRAFT);
        // Automap Frontend Fields to DB Columns using SmartMapper
        const dbData = SmartMapper.toDB(normalized, applicationSchema);
        const now = new Date();
        // Legacy table contract: drafts may be partially filled, but non-null legacy
        // text columns must still receive empty strings instead of NULL.
        dbData.Title = toRequiredLegacyString(dbData.Title);
        dbData.SupplierCN = toRequiredLegacyString(dbData.SupplierCN, toRequiredLegacyString(normalized.supplier_cn ?? normalized.supplierCN));
        dbData.VendorID = toRequiredLegacyString(dbData.VendorID, toRequiredLegacyString(normalized.vendor_id ?? normalized.vendorId, 'UNKNOWN'));
        dbData.ItemID = toRequiredLegacyString(dbData.ItemID, toRequiredLegacyString(normalized.item_id ?? normalized.itemId));
        dbData.ImpactDate = toRequiredLegacyString(dbData.ImpactDate, toRequiredLegacyString(normalized.impact_date ?? normalized.impactDate));
        dbData.ControlNo = controlNo;
        dbData.CreatedBy = userId;
        dbData.CreateDate = now;
        dbData.ModifiedDate = now;
        // Build approval data from frontend payload
        const approvalData = {};
        if (normalized.mpd_pic)
            approvalData.MPDPIC = normalized.mpd_pic;
        if (normalized.mpd_checker)
            approvalData.MPDChecker = normalized.mpd_checker;
        if (normalized.mpd_checker_name)
            approvalData.MPDCheckerName = normalized.mpd_checker_name;
        if (normalized.mpd_approver)
            approvalData.MPDApprover = normalized.mpd_approver;
        if (normalized.mpd_approver_name)
            approvalData.MPDApproverName = normalized.mpd_approver_name;
        if (normalized.mpd_apr_dt_aprd)
            approvalData.MPDAprDtAprd = normalized.mpd_apr_dt_aprd;
        if (normalized.mpd_chkr_dt_aprd)
            approvalData.MPDChkrDtAprd = normalized.mpd_chkr_dt_aprd;
        if (normalized.hde_pic)
            approvalData.HDEPIC = normalized.hde_pic;
        if (normalized.evaluation_ic)
            approvalData.EvaluationIC = normalized.evaluation_ic;
        if (normalized.evaluation_ic_dt_aprd)
            approvalData.EvaluationICDtAprd = normalized.evaluation_ic_dt_aprd;
        if (normalized.ds_approver_necessary)
            approvalData.DSAppproverNecessary = normalized.ds_approver_necessary;
        if (normalized.design_approver_id)
            approvalData.DesignApproverID = normalized.design_approver_id;
        if (normalized.design_approver_name)
            approvalData.DesignApproverName = normalized.design_approver_name;
        if (normalized.ds_checker_necessary)
            approvalData.DSCheckerNecessary = normalized.ds_checker_necessary;
        // Environmental Approval Logic: Either from Final stage radio ('YES'/'NO') or Evaluation checkbox ('1'/'0')
        let enviNecessary = 'NO';
        if (normalized.envi_approver_necessary === 'YES' || normalized.environmental_approval === '1' || normalized.environmental_approval === 1 || normalized.environmental_approval === true) {
            enviNecessary = 'YES';
        }
        approvalData.EnviAppproverNecessary = enviNecessary;
        approvalData.EnviCheckerNecessary = enviNecessary; // Legacy sync
        if (normalized.envi_approver_id)
            approvalData.EnviApproverID = normalized.envi_approver_id;
        if (normalized.envi_approve_name)
            approvalData.EnviApproveName = normalized.envi_approve_name;
        if (normalized.envi_approve_dt_aprd)
            approvalData.EnviApproveDtAprd = normalized.envi_approve_dt_aprd;
        if (normalized.qa_checker_id)
            approvalData.QACheckerID = normalized.qa_checker_id;
        if (normalized.qa_checker_name)
            approvalData.QACheckerName = normalized.qa_checker_name;
        if (normalized.qa_checker_dt_aprd)
            approvalData.QACheckerDtAprd = normalized.qa_checker_dt_aprd;
        if (normalized.final_approver)
            approvalData.FinalApprover = normalized.final_approver;
        if (normalized.fa_name)
            approvalData.FAName = normalized.fa_name;
        if (normalized.fa_dt_aprd)
            approvalData.FADtAprd = normalized.fa_dt_aprd;
        if (normalized.fa_status)
            approvalData.FAStatus = normalized.fa_status;
        if (normalized.apr_status)
            approvalData.AprStatus = normalized.apr_status;
        if (normalized.design_approver_dt_aprd)
            approvalData.DesignApproverDtAprd = normalized.design_approver_dt_aprd;
        if (normalized.approval_seq !== undefined)
            approvalData.ApprovalSeq = normalized.approval_seq;
        // NEW: Add reviewer, checker, approver fields from approval section
        if (normalized.reviewer)
            approvalData.Reviewer = normalized.reviewer;
        if (normalized.checker)
            approvalData.Checker = normalized.checker;
        if (normalized.approver)
            approvalData.Approver = normalized.approver;
        if (normalized.issue_date)
            approvalData.IssueDate = normalized.issue_date;
        if (normalized.chkr_dt_aprd)
            approvalData.ChkrDtAprd = normalized.chkr_dt_aprd;
        if (normalized.approver_dt_aprd)
            approvalData.ApproverDtAprd = normalized.approver_dt_aprd;
        console.log('[5M1E Service] Approval data built:', Object.keys(approvalData));
        // Transactional Insert: Application + Approval + Child Tables
        const newRecord = await this.repository.createWithApproval(dbData, 'DRAFT', approvalData);
        // Insert child tables
        const cn = newRecord.ControlNo;
        if (normalized.parts && normalized.parts.length > 0) {
            await this.repository.insertParts(cn, normalized.parts);
        }
        // Process attachments with file uploads
        if (normalized.attachments !== undefined) {
            console.log(`[5M1E Service] Processing ${normalized.attachments.length} attachment(s) with ${files.length} file(s)`);
            await this.syncMainAttachments(cn, normalized.attachments, files, userId);
        }
        if (normalized.action_items && normalized.action_items.length > 0) {
            await this.repository.replaceActionItems(cn, normalized.action_items);
        }
        if (normalized.check_items && normalized.check_items.length > 0) {
            await this.repository.replaceCheckItems(cn, this.normalizeCheckItemsForPersistence(normalized.check_items, files) || []);
        }
        if (normalized.status_remarks && normalized.status_remarks.length > 0) {
            await this.repository.replaceStatusRemarks(cn, normalized.status_remarks);
        }
        // Insert CC Notification List
        if (normalized.cc_list && normalized.cc_list.length > 0) {
            await this.repository.replaceCCUsers(cn, normalized.cc_list, userId);
        }
        return {
            success: true,
            message: 'Application created successfully',
            data: {
                id: newRecord.ID,
                recordId: newRecord.ID,
                controlNo: newRecord.ControlNo,
                controlNoState: controlNumberService.getControlNoState(newRecord.ControlNo),
                control_no: newRecord.ControlNo,
            }
        };
    }
    /**
     * Retrieves all 5M1E Applications
     */
    async getAllApplications(status, actor, scope = 'history', filters = {}) {
        const records = await this.repository.findAllWithApproval(status);
        const isAdmin = this.isAdminActor(actor);
        const requestedStatuses = new Set(String(status || '')
            .split(',')
            .map((value) => value.trim().toUpperCase())
            .filter(Boolean));
        const allowRoleVisibleAssignedQueue = requestedStatuses.has('FAPPROVED');
        const stageReadAccessCache = new Map();
        const searchReadAccessCache = {};
        const decoratedRecords = await Promise.all(records.map(async (record) => {
            const dto = SmartMapper.toDTO(record, applicationSchema);
            const workflow = await fiveM1EWorkflowService.getWorkflowMetadata(record, actor?.userId);
            const isMine = this.isParticipant(record, actor?.userId);
            const hasWorkflowAccess = Array.isArray(workflow.availableActions) && workflow.availableActions.length > 0;
            const canViewByRole = actor?.userId && !isAdmin && !isMine && !hasWorkflowAccess
                ? await this.hasStageReadAccess(actor.userId, workflow.workflowStage, stageReadAccessCache)
                : false;
            const normalizedStatus = workflow.workflowStage === FIVE_M1E_WORKFLOW_STAGE.RELEASED ? 'RELEASE' : record.approval_status;
            return {
                source: record,
                workflow,
                isMine,
                hasWorkflowAccess,
                canViewByRole,
                data: {
                    ...dto,
                    id: record.ID,
                    control_no: record.ControlNo,
                    controlNoState: controlNumberService.getControlNoState(record.ControlNo),
                    status: normalizedStatus,
                    workflowStage: workflow.workflowStage,
                    workflowStageCode: workflow.workflowStageCode,
                    workflowStageLabel: workflow.workflowStageLabel,
                    availableActions: workflow.availableActions,
                    nextApproverId: workflow.nextApproverId,
                    nextApproverName: workflow.nextApproverName,
                    ownerMode: workflow.ownerMode,
                    mpd_pic: record.mpd_pic,
                    mpd_approver: record.mpd_approver,
                    created_at: record.CreateDate,
                    apr_status: record.apr_status,
                    fa_status: record.fa_status,
                    reviewer_name: record.reviewer_full_name,
                    checker_name: record.checker_full_name,
                    approver_name: record.approver_full_name,
                    supplier_name: record.supplier_name,
                    vendor_name: record.vendor_name,
                    site_name: record.site_name,
                    part_code: record.part_code,
                    item_name: record.item_name,
                    model_name: record.model_name,
                    part_type_name: record.part_type_name,
                    class_name: record.class_name,
                    class_desc: record.class_desc,
                    class_type_name: record.class_type_name,
                    rank_name: record.rank_name,
                    category_name: record.category_name,
                    attribute_05_name: record.attribute_05_name,
                    attribute_06_name: record.attribute_06_name,
                    attribute_03_name: record.attribute_03_name,
                    mpd_pic_name: record.mpd_pic_name,
                },
            };
        }));
        const canSearchHistory = actor?.userId &&
            !isAdmin &&
            decoratedRecords.some((entry) => !entry.isMine && !entry.hasWorkflowAccess && !entry.canViewByRole)
            ? await this.hasSearchReadAccess(actor.userId, searchReadAccessCache)
            : false;
        const visibleRecords = isAdmin
            ? decoratedRecords
            : filterWorkflowRecordsByScope(decoratedRecords, scope, {
                isAssigned: (entry) => Boolean(actor?.userId &&
                    (((entry.workflow.ownerMode === 'assigned' || entry.workflow.ownerMode === 'role-fallback') &&
                        entry.workflow.nextApproverId === actor.userId) ||
                        (entry.workflow.ownerMode === 'shared-queue' &&
                            (entry.canViewByRole || entry.hasWorkflowAccess)) ||
                        (allowRoleVisibleAssignedQueue &&
                            entry.canViewByRole))),
                isMine: (entry) => entry.isMine,
                isHistoryVisible: (entry) => canSearchHistory ||
                    entry.canViewByRole ||
                    entry.isMine ||
                    entry.hasWorkflowAccess,
            });
        return visibleRecords
            .map((entry) => entry.data)
            .filter((record) => {
            if (filters.picId) {
                const createdBy = String(record.created_by || record.CreatedBy || '');
                const pic = String(record.pic || record.pic_id || record.PIC || '');
                if (createdBy !== filters.picId && pic !== filters.picId) {
                    return false;
                }
            }
            if (filters.siteId) {
                const siteId = String(record.site_id || record.SiteID || '');
                if (siteId !== filters.siteId) {
                    return false;
                }
            }
            if (filters.supplierId) {
                const supplierId = String(record.supplier_id || record.SupplierID || '');
                const vendorId = String(record.vendor_id || record.VendorID || '');
                if (supplierId !== filters.supplierId && vendorId !== filters.supplierId) {
                    return false;
                }
            }
            return true;
        });
    }
    /**
     * Retrieves a 5M1E Application with its full Approval + Child Tables
     */
    async getApplication(controlNo, actor) {
        const record = await this.repository.findWithApproval(controlNo);
        if (!record) {
            throw new NotFoundError(`5M1E Application ${controlNo} not found`);
        }
        const workflow = await this.assertReadableRecord(record, actor);
        // SmartMap back to frontend standard DTO payload
        const dto = SmartMapper.toDTO(record, applicationSchema);
        // Fetch child tables
        const cn = record.ControlNo;
        const [parts, attachments, actionItems, checkItems, statusRemarks, ccList] = await Promise.all([
            this.repository.findParts(cn),
            this.repository.findAttachments(cn),
            this.repository.findActionItems(cn),
            this.repository.findCheckItems(cn),
            this.repository.findStatusRemarks(cn),
            this.repository.findCCUsers(cn),
        ]);
        const normalizedStatus = workflow.workflowStage === FIVE_M1E_WORKFLOW_STAGE.RELEASED ? 'RELEASE' : record.approval_status;
        return {
            ...dto,
            id: record.ID,
            control_no: record.ControlNo,
            controlNoState: controlNumberService.getControlNoState(record.ControlNo),
            status: normalizedStatus,
            workflowStage: workflow.workflowStage,
            workflowStageCode: workflow.workflowStageCode,
            workflowStageLabel: workflow.workflowStageLabel,
            availableActions: workflow.availableActions,
            nextApproverId: workflow.nextApproverId,
            nextApproverName: workflow.nextApproverName,
            ownerMode: workflow.ownerMode,
            workflow,
            // Human-readable display names resolved via USERS table JOIN
            created_by_name: record.created_by_name,
            reviewer_name: record.reviewer_full_name,
            checker_name: record.checker_full_name,
            approver_name: record.approver_full_name,
            supplier_name: record.supplier_name,
            supplier_company_name: record.supplier_name,
            vendor_name: record.vendor_name,
            site_name: record.site_name,
            part_code: record.part_code,
            item_name: record.item_name,
            model_name: record.model_name,
            part_type_name: record.part_type_name,
            class_name: record.class_name,
            class_desc: record.class_desc,
            class_type_name: record.class_type_name,
            rank_name: record.rank_name,
            category_name: record.category_name,
            attribute_05_name: record.attribute_05_name,
            attribute_06_name: record.attribute_06_name,
            attribute_03_name: record.attribute_03_name,
            mpd_approver_name: record.mpd_approver_name,
            mpd_pic_name: record.mpd_pic_name,
            // Approval fields (flat)
            reviewer: record.reviewer,
            checker: record.checker,
            approver: record.approver,
            issue_date: record.issue_date,
            chkr_dt_aprd: record.chkr_dt_aprd,
            approver_dt_aprd: record.approver_dt_aprd,
            apr_status: record.apr_status,
            fa_status: record.fa_status,
            mpd_pic: record.mpd_pic,
            mpd_approver: record.mpd_approver,
            mpd_checker: record.MPDChecker,
            mpd_checker_name: record.MPDCheckerName,
            hde_pic: record.HDEPIC,
            evaluation_ic: record.EvaluationIC,
            final_approver: record.FinalApprover,
            fa_name: record.FAName,
            approval_seq: record.ApprovalSeq,
            // Environment Approval fields (human-readable names resolved via USERS JOINs)
            envi_checker_necessary: record.envi_checker_necessary,
            envi_checker_id: record.envi_checker_id,
            envi_checker_name: record.envi_checker_full_name || record.envi_checker_name,
            envi_checker_status: record.envi_checker_status,
            envi_checker_dt_aprd: record.envi_checker_dt_aprd,
            envi_approver_necessary: record.envi_approver_necessary,
            envi_approver_id: record.envi_approver_id,
            envi_approve_name: record.envi_approver_full_name || record.envi_approve_name,
            envi_approve_status: record.envi_approve_status,
            envi_approve_dt_aprd: record.envi_approve_dt_aprd,
            // Child tables
            parts: parts.map((p) => ({ part_id: p.part_id })),
            attachments: attachments.map((a) => this.buildAttachmentView({
                ...a,
                file_name: a.FileName,
                attribute_2: a.Attribute2,
            })),
            action_items: actionItems.map((ai) => ({
                id: ai.ID, action_item: ai.ActionItem, pic: ai.PIC, pic_name: ai.PICName,
                first_target_dt: ai.FirstTargetDt, second_target_dt: ai.SecondTargetDt, third_target_dt: ai.ThirdTargetDt,
                verification_result: ai.VerificationResult, remarks: ai.Remarks,
                attribute_01: ai.Attribute01, attribute_02: ai.Attribute02, attribute_03: ai.Attribute03,
                attribute_04: ai.Attribute04, attribute_05: ai.Attribute05,
            })),
            check_items: checkItems.map((ci) => {
                const attachments = Array.isArray(ci.attachments) ? ci.attachments : [];
                const firstAttachment = attachments[0];
                return {
                    id: ci.ID,
                    check_item: ci.CheckItem,
                    judgement: ci.Judgement,
                    remarks: ci.Remarks,
                    attribute_1: ci.Attribute1,
                    attribute_2: firstAttachment?.attribute1 || firstAttachment?.FileName || ci.Attribute2,
                    attribute_3: ci.Attribute3,
                    attribute_4: ci.Attribute4,
                    attribute_5: ci.Attribute5,
                    attachments: attachments.map((attachment) => ({
                        id: String(attachment.ID || ''),
                        file_name: attachment.FileName,
                        attribute1: attachment.attribute1 || attachment.Attribute1 || null,
                        attribute2: attachment.attribute2 || attachment.Attribute2 || null,
                        download_url: attachment.attribute1 || attachment.Attribute1 || null,
                    })),
                };
            }),
            status_remarks: statusRemarks.map((sr) => ({
                id: sr.ID, remarks: sr.Remarks, remark_by: sr.RemarkBy, status: sr.Status,
                create_date: sr.CreateDate,
                attribute1: sr.attribute1, attribute2: sr.attribute2, attribute3: sr.attribute3,
                attribute4: sr.attribute4, attribute5: sr.attribute5,
            })),
            cc_list: ccList.map((cc) => ({
                id: cc.id,
                user_id: cc.user_id,
                full_name: cc.full_name || '',
                email: cc.email || '',
            })),
        };
    }
    async downloadAttachment(attachmentId, actor) {
        const attachment = await this.attachments.getAttachmentInfo('5m1e-main', attachmentId);
        const controlNo = String(attachment.ControlNo || attachment.control_no || '');
        if (!controlNo) {
            throw new NotFoundError(`5M1E attachment ${attachmentId} is missing its owning record.`);
        }
        const record = await this.repository.findWithApproval(controlNo);
        if (!record) {
            throw new NotFoundError(`5M1E Application ${controlNo} not found`);
        }
        await this.assertReadableRecord(record, actor);
        return this.attachments.downloadAttachment('5m1e-main', attachmentId);
    }
    /**
     * Updates an Application intelligently picking valid fields
     */
    async updateApplication(controlNo, data, files = [], actor = {}) {
        console.log('[5M1E Service] Update Application Payload:', JSON.stringify(data, null, 2));
        console.log(`[5M1E Service] Attached files count: ${files.length}`);
        const existing = await this.repository.findWithApproval(controlNo);
        if (!existing) {
            throw new NotFoundError(`5M1E Application ${controlNo} not found`);
        }
        const canUpdate = Boolean(actor.userId) &&
            await fiveM1EWorkflowService.canUserUpdateRecord(existing.ControlNo, actor.userId);
        assertWorkflowRecordAccess({
            allowed: canUpdate,
            action: 'update',
            moduleName: '5M1E',
        });
        assertNoWorkflowMutationFields(data, '5M1E', ['status']);
        const stage = normalizeFiveM1EWorkflowStage(existing);
        const normalized = this.stripIgnoredWriteFields(normalizeInput(data));
        await this.assertStageOwnedWriteFields(normalized, stage, existing);
        await this.validateStageAssignmentChanges(normalized, stage, existing);
        const updateDbData = SmartMapper.toDB(normalized, applicationSchema);
        if (Object.keys(updateDbData).length > 0) {
            await this.repository.updateByControlNo(controlNo, updateDbData);
        }
        // Update Approval table fields (status + any approval workflow data)
        const approvalUpdates = {};
        if (normalized.mpd_pic)
            approvalUpdates.MPDPIC = normalized.mpd_pic;
        if (normalized.mpd_approver)
            approvalUpdates.MPDApprover = normalized.mpd_approver;
        if (normalized.mpd_approver_name)
            approvalUpdates.MPDApproverName = normalized.mpd_approver_name;
        if (normalized.mpd_checker)
            approvalUpdates.MPDChecker = normalized.mpd_checker;
        if (normalized.mpd_checker_name)
            approvalUpdates.MPDCheckerName = normalized.mpd_checker_name;
        if (normalized.hde_pic)
            approvalUpdates.HDEPIC = normalized.hde_pic;
        if (normalized.evaluation_ic)
            approvalUpdates.EvaluationIC = normalized.evaluation_ic;
        if (normalized.evaluation_ic_dt_aprd)
            approvalUpdates.EvaluationICDtAprd = normalized.evaluation_ic_dt_aprd;
        if (normalized.final_approver)
            approvalUpdates.FinalApprover = normalized.final_approver;
        if (normalized.fa_name)
            approvalUpdates.FAName = normalized.fa_name;
        if (normalized.fa_dt_aprd)
            approvalUpdates.FADtAprd = normalized.fa_dt_aprd;
        if (normalized.fa_status)
            approvalUpdates.FAStatus = normalized.fa_status;
        if (normalized.apr_status)
            approvalUpdates.AprStatus = normalized.apr_status;
        if (normalized.qa_checker_id)
            approvalUpdates.QACheckerID = normalized.qa_checker_id;
        if (normalized.qa_checker_name)
            approvalUpdates.QACheckerName = normalized.qa_checker_name;
        if (normalized.qa_checker_dt_aprd)
            approvalUpdates.QACheckerDtAprd = normalized.qa_checker_dt_aprd;
        if (normalized.ds_approver_necessary)
            approvalUpdates.DSAppproverNecessary = normalized.ds_approver_necessary;
        if (normalized.design_approver_id)
            approvalUpdates.DesignApproverID = normalized.design_approver_id;
        if (normalized.design_approver_name)
            approvalUpdates.DesignApproverName = normalized.design_approver_name;
        if (normalized.design_approver_dt_aprd)
            approvalUpdates.DesignApproverDtAprd = normalized.design_approver_dt_aprd;
        if (normalized.ds_checker_necessary)
            approvalUpdates.DSCheckerNecessary = normalized.ds_checker_necessary;
        // Environmental Approval Logic: Either from Final stage radio ('YES'/'NO') or Evaluation checkbox ('1'/'0')
        if (normalized.envi_approver_necessary !== undefined || normalized.environmental_approval !== undefined) {
            let enviNecessary = existing.envi_approver_necessary || 'NO';
            if (normalized.envi_approver_necessary === 'YES' || normalized.envi_approver_necessary === 'NO') {
                enviNecessary = normalized.envi_approver_necessary;
            }
            else if (normalized.environmental_approval === '1' || normalized.environmental_approval === 1 || normalized.environmental_approval === true) {
                enviNecessary = 'YES';
            }
            else if (normalized.environmental_approval === '0' || normalized.environmental_approval === 0 || normalized.environmental_approval === false) {
                enviNecessary = 'NO';
            }
            approvalUpdates.EnviAppproverNecessary = enviNecessary;
            approvalUpdates.EnviCheckerNecessary = enviNecessary; // Legacy sync
        }
        if (normalized.envi_approver_id)
            approvalUpdates.EnviApproverID = normalized.envi_approver_id;
        if (normalized.envi_approve_name)
            approvalUpdates.EnviApproveName = normalized.envi_approve_name;
        if (normalized.envi_approve_dt_aprd)
            approvalUpdates.EnviApproveDtAprd = normalized.envi_approve_dt_aprd;
        // NEW: Add reviewer, checker, approver updates
        if (normalized.reviewer)
            approvalUpdates.Reviewer = normalized.reviewer;
        if (normalized.checker)
            approvalUpdates.Checker = normalized.checker;
        if (normalized.approver)
            approvalUpdates.Approver = normalized.approver;
        if (normalized.issue_date)
            approvalUpdates.IssueDate = normalized.issue_date;
        if (normalized.chkr_dt_aprd)
            approvalUpdates.ChkrDtAprd = normalized.chkr_dt_aprd;
        if (normalized.approver_dt_aprd)
            approvalUpdates.ApproverDtAprd = normalized.approver_dt_aprd;
        console.log('[5M1E Service] Approval updates built:', Object.keys(approvalUpdates));
        if (Object.keys(approvalUpdates).length > 0) {
            approvalUpdates.ModifiedDate = new Date();
            await this.repository.updateApprovalStatus(existing.ControlNo, existing.approval_status || 'DRAFT', approvalUpdates);
        }
        // Sync child tables (replace strategy)
        const cn = existing.ControlNo;
        if (normalized.parts) {
            await this.repository.replaceParts(cn, normalized.parts);
        }
        if (normalized.attachments !== undefined) {
            console.log(`[5M1E Service] Update - Processing ${normalized.attachments.length} attachment(s) with ${files.length} file(s)`);
            const attachmentSync = await this.syncMainAttachments(cn, normalized.attachments, files, actor.userId || 'SYSTEM');
            await this.attachments.deleteStoredAttachments('5m1e-main', attachmentSync.cleanupQueue || []);
        }
        if (normalized.action_items) {
            await this.repository.replaceActionItems(cn, normalized.action_items);
        }
        if (normalized.check_items) {
            await this.repository.replaceCheckItems(cn, this.normalizeCheckItemsForPersistence(normalized.check_items, files) || []);
        }
        if (normalized.status_remarks) {
            await this.repository.replaceStatusRemarks(cn, normalized.status_remarks);
        }
        // Replace CC Notification List (delete & re-insert)
        if (normalized.cc_list !== undefined) {
            await this.repository.replaceCCUsers(cn, normalized.cc_list, actor.userId || 'SYSTEM');
        }
        return {
            success: true,
            message: 'Application updated successfully',
            data: { controlNo }
        };
    }
    /**
     * Deletes a 5M1E Application and all child tables
     */
    async deleteApplication(controlNo, actor = {}) {
        const existing = await this.repository.findWithApproval(controlNo);
        if (!existing) {
            throw new NotFoundError(`5M1E Application ${controlNo} not found`);
        }
        const canDelete = Boolean(actor.userId) &&
            await fiveM1EWorkflowService.canUserDeleteRecord(existing.ControlNo, actor.userId, actor.roleName);
        assertWorkflowRecordAccess({
            allowed: canDelete,
            action: 'delete',
            moduleName: '5M1E',
        });
        const cn = existing.ControlNo;
        const existingAttachments = await this.repository.findAttachments(cn);
        const cleanupQueue = existingAttachments.map((attachment) => ({
            fileName: attachment.FileName,
            storedPath: attachment.Attribute1,
        }));
        // Delete child tables first, then approval, then application
        await this.repository.replaceParts(cn, []);
        await this.repository.replaceAttachments(cn, []);
        await this.repository.replaceActionItems(cn, []);
        await this.repository.replaceCheckItems(cn, []);
        await this.repository.replaceStatusRemarks(cn, []);
        await this.repository.replaceCCUsers(cn, []);
        await this.repository.deleteApproval(cn);
        await this.repository.deleteByControlNo(cn);
        await this.attachments.deleteStoredAttachments('5m1e-main', cleanupQueue);
        return { success: true, message: 'Application deleted successfully', data: { controlNo } };
    }
    /**
     * Workflow: Submit application (DRAFT → SUBMITTED)
     */
    async submitApplication(controlNo, _userId) {
        return fiveM1EWorkflowService.submitApplication(controlNo, _userId);
    }
    /**
     * Workflow: Check application (SUBMITTED → CHECKED)
     * Two-stage approval: Checker marks as reviewed, record stays on Awaiting Approval page
     */
    async checkApplication(controlNo, userId, remarks) {
        return fiveM1EWorkflowService.checkApplication(controlNo, userId, remarks);
    }
    /**
     * Workflow: Approve application (SUBMITTED → APPROVED)
     */
    async approveApplication(controlNo, userId, remarks, status = 'APPROVED') {
        return fiveM1EWorkflowService.approveApplication(controlNo, userId, remarks, status);
    }
    /**
     * Workflow: Reject application → REJECTED
     */
    async rejectApplication(controlNo, userId, remarks) {
        return fiveM1EWorkflowService.rejectApplication(controlNo, userId, remarks);
    }
    /**
     * Workflow: Release application (APPROVED → RELEASE)
     */
    async releaseApplication(controlNo, _userId) {
        return fiveM1EWorkflowService.releaseApplication(controlNo, _userId);
    }
}
export const fiveM1EService = new FiveM1EService();
