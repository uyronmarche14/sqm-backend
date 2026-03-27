import { fiveM1ERepository } from './fiveM1E.repository.js';
import { SmartMapper } from '../../shared/infrastructure/SmartMapper.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { fiveM1EWorkflowService } from './workflow/fiveM1E-workflow.service.js';
import { FIVE_M1E_WORKFLOW_STAGE, } from './workflow/fiveM1E-workflow.constants.js';
import { getFiveM1EWorkflowStageFormIds } from './workflow/fiveM1E-workflow.utils.js';
import { assertWorkflowRecordAccess, filterWorkflowRecordsByScope, } from '../../shared/utils/workflow-access.js';
import { permissionService } from '../../shared/services/permission.service.js';
import { controlNumberService } from '../../shared/services/control-number.service.js';
import { attachmentService } from '../../shared/services/attachment.service.js';
import { formatAttachmentRemarks } from '../../shared/utils/attachment-remarks.js';
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
    return normalized;
}
function toRequiredLegacyString(value, fallback = '') {
    if (value === undefined || value === null) {
        return fallback;
    }
    return String(value);
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
        return (actor?.roleName || '').toUpperCase().includes('ADMIN');
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
    async createApplication(data, userId, files = []) {
        console.log('[5M1E Service] Create Application Payload:', JSON.stringify(data, null, 2));
        console.log(`[5M1E Service] Attached files count: ${files.length}`);
        const controlNo = controlNumberService.buildFiveM1ETemporary();
        // Normalize field aliases (class → class_id, class_type → class_type_id)
        const normalized = normalizeInput(data);
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
        if (data.mpd_pic)
            approvalData.MPDPIC = data.mpd_pic;
        if (data.mpd_checker)
            approvalData.MPDChecker = data.mpd_checker;
        if (data.mpd_checker_name)
            approvalData.MPDCheckerName = data.mpd_checker_name;
        if (data.mpd_approver)
            approvalData.MPDApprover = data.mpd_approver;
        if (data.mpd_approver_name)
            approvalData.MPDApproverName = data.mpd_approver_name;
        if (data.mpd_apr_dt_aprd)
            approvalData.MPDAprDtAprd = data.mpd_apr_dt_aprd;
        if (data.mpd_chkr_dt_aprd)
            approvalData.MPDChkrDtAprd = data.mpd_chkr_dt_aprd;
        if (data.hde_pic)
            approvalData.HDEPIC = data.hde_pic;
        if (data.evaluation_ic)
            approvalData.EvaluationIC = data.evaluation_ic;
        if (data.evaluation_ic_dt_aprd)
            approvalData.EvaluationICDtAprd = data.evaluation_ic_dt_aprd;
        if (data.ds_approver_necessary)
            approvalData.DSAppproverNecessary = data.ds_approver_necessary;
        if (data.design_approver_id)
            approvalData.DesignApproverID = data.design_approver_id;
        if (data.design_approver_name)
            approvalData.DesignApproverName = data.design_approver_name;
        if (data.ds_checker_necessary)
            approvalData.DSCheckerNecessary = data.ds_checker_necessary;
        // Environmental Approval Logic: Either from Final stage radio ('YES'/'NO') or Evaluation checkbox ('1'/'0')
        let enviNecessary = 'NO';
        if (data.envi_approver_necessary === 'YES' || data.environmental_approval === '1' || data.environmental_approval === 1 || data.environmental_approval === true) {
            enviNecessary = 'YES';
        }
        approvalData.EnviAppproverNecessary = enviNecessary;
        approvalData.EnviCheckerNecessary = enviNecessary; // Legacy sync
        if (data.envi_approver_id)
            approvalData.EnviApproverID = data.envi_approver_id;
        if (data.envi_approve_name)
            approvalData.EnviApproveName = data.envi_approve_name;
        if (data.envi_approve_dt_aprd)
            approvalData.EnviApproveDtAprd = data.envi_approve_dt_aprd;
        if (data.qa_checker_id)
            approvalData.QACheckerID = data.qa_checker_id;
        if (data.qa_checker_name)
            approvalData.QACheckerName = data.qa_checker_name;
        if (data.qa_checker_dt_aprd)
            approvalData.QACheckerDtAprd = data.qa_checker_dt_aprd;
        if (data.final_approver)
            approvalData.FinalApprover = data.final_approver;
        if (data.fa_name)
            approvalData.FAName = data.fa_name;
        if (data.fa_dt_aprd)
            approvalData.FADtAprd = data.fa_dt_aprd;
        if (data.fa_status)
            approvalData.FAStatus = data.fa_status;
        if (data.apr_status)
            approvalData.AprStatus = data.apr_status;
        if (data.design_approver_dt_aprd)
            approvalData.DesignApproverDtAprd = data.design_approver_dt_aprd;
        if (data.approval_seq !== undefined)
            approvalData.ApprovalSeq = data.approval_seq;
        // NEW: Add reviewer, checker, approver fields from approval section
        if (data.reviewer)
            approvalData.Reviewer = data.reviewer;
        if (data.checker)
            approvalData.Checker = data.checker;
        if (data.approver)
            approvalData.Approver = data.approver;
        if (data.issue_date)
            approvalData.IssueDate = data.issue_date;
        if (data.chkr_dt_aprd)
            approvalData.ChkrDtAprd = data.chkr_dt_aprd;
        if (data.approver_dt_aprd)
            approvalData.ApproverDtAprd = data.approver_dt_aprd;
        console.log('[5M1E Service] Approval data built:', Object.keys(approvalData));
        // Transactional Insert: Application + Approval + Child Tables
        const newRecord = await this.repository.createWithApproval(dbData, data.status || 'DRAFT', approvalData);
        // Insert child tables
        const cn = newRecord.ControlNo;
        if (data.parts && data.parts.length > 0) {
            await this.repository.insertParts(cn, data.parts);
        }
        // Process attachments with file uploads
        if (data.attachments && data.attachments.length > 0) {
            console.log(`[5M1E Service] Processing ${data.attachments.length} attachment(s) with ${files.length} file(s)`);
            await this.processAttachments(cn, data.attachments, files);
        }
        if (data.action_items && data.action_items.length > 0) {
            await this.repository.replaceActionItems(cn, data.action_items);
        }
        if (data.check_items && data.check_items.length > 0) {
            if (files && files.length > 0) {
                data.check_items.forEach(item => {
                    if (item.attribute_2 && typeof item.attribute_2 === 'string') {
                        const uploadedFile = files.find(f => f.originalname === item.attribute_2);
                        if (uploadedFile) {
                            console.log(`[5M1E Service] Processing check_item attachment: ${item.attribute_2} -> ${uploadedFile.filename}`);
                            item.attribute_2 = uploadedFile.path;
                        }
                    }
                });
            }
            await this.repository.replaceCheckItems(cn, data.check_items);
        }
        if (data.status_remarks && data.status_remarks.length > 0) {
            await this.repository.replaceStatusRemarks(cn, data.status_remarks);
        }
        // Insert CC Notification List
        if (data.cc_list && data.cc_list.length > 0) {
            await this.repository.replaceCCUsers(cn, data.cc_list, userId);
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
    async getAllApplications(status, actor, scope = 'history') {
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
        return visibleRecords.map((entry) => entry.data);
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
            attachments: attachments.map((a) => ({
                id: a.ID, file_name: a.FileName,
                attribute_1: a.Attribute1, attribute_2: a.Attribute2,
            })),
            action_items: actionItems.map((ai) => ({
                id: ai.ID, action_item: ai.ActionItem, pic: ai.PIC, pic_name: ai.PICName,
                first_target_dt: ai.FirstTargetDt, second_target_dt: ai.SecondTargetDt, third_target_dt: ai.ThirdTargetDt,
                verification_result: ai.VerificationResult, remarks: ai.Remarks,
                attribute_01: ai.Attribute01, attribute_02: ai.Attribute02, attribute_03: ai.Attribute03,
                attribute_04: ai.Attribute04, attribute_05: ai.Attribute05,
            })),
            check_items: checkItems.map((ci) => ({
                id: ci.ID, check_item: ci.CheckItem, judgement: ci.Judgement,
                remarks: ci.Remarks, attribute_1: ci.Attribute1, attribute_2: ci.Attribute2,
                attribute_3: ci.Attribute3, attribute_4: ci.Attribute4, attribute_5: ci.Attribute5,
            })),
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
        const normalized = normalizeInput(data);
        const updateDbData = SmartMapper.toDB(normalized, applicationSchema);
        if (Object.keys(updateDbData).length > 0) {
            await this.repository.updateByControlNo(controlNo, updateDbData);
        }
        // Update Approval table fields (status + any approval workflow data)
        const approvalUpdates = {};
        if (data.mpd_pic)
            approvalUpdates.MPDPIC = data.mpd_pic;
        if (data.mpd_approver)
            approvalUpdates.MPDApprover = data.mpd_approver;
        if (data.mpd_approver_name)
            approvalUpdates.MPDApproverName = data.mpd_approver_name;
        if (data.mpd_checker)
            approvalUpdates.MPDChecker = data.mpd_checker;
        if (data.mpd_checker_name)
            approvalUpdates.MPDCheckerName = data.mpd_checker_name;
        if (data.hde_pic)
            approvalUpdates.HDEPIC = data.hde_pic;
        if (data.evaluation_ic)
            approvalUpdates.EvaluationIC = data.evaluation_ic;
        if (data.evaluation_ic_dt_aprd)
            approvalUpdates.EvaluationICDtAprd = data.evaluation_ic_dt_aprd;
        if (data.final_approver)
            approvalUpdates.FinalApprover = data.final_approver;
        if (data.fa_name)
            approvalUpdates.FAName = data.fa_name;
        if (data.fa_dt_aprd)
            approvalUpdates.FADtAprd = data.fa_dt_aprd;
        if (data.fa_status)
            approvalUpdates.FAStatus = data.fa_status;
        if (data.apr_status)
            approvalUpdates.AprStatus = data.apr_status;
        if (data.qa_checker_id)
            approvalUpdates.QACheckerID = data.qa_checker_id;
        if (data.qa_checker_name)
            approvalUpdates.QACheckerName = data.qa_checker_name;
        if (data.qa_checker_dt_aprd)
            approvalUpdates.QACheckerDtAprd = data.qa_checker_dt_aprd;
        if (data.ds_approver_necessary)
            approvalUpdates.DSAppproverNecessary = data.ds_approver_necessary;
        if (data.design_approver_id)
            approvalUpdates.DesignApproverID = data.design_approver_id;
        if (data.design_approver_name)
            approvalUpdates.DesignApproverName = data.design_approver_name;
        if (data.design_approver_dt_aprd)
            approvalUpdates.DesignApproverDtAprd = data.design_approver_dt_aprd;
        if (data.ds_checker_necessary)
            approvalUpdates.DSCheckerNecessary = data.ds_checker_necessary;
        // Environmental Approval Logic: Either from Final stage radio ('YES'/'NO') or Evaluation checkbox ('1'/'0')
        if (data.envi_approver_necessary !== undefined || data.environmental_approval !== undefined) {
            let enviNecessary = existing.envi_approver_necessary || 'NO';
            if (data.envi_approver_necessary === 'YES' || data.envi_approver_necessary === 'NO') {
                enviNecessary = data.envi_approver_necessary;
            }
            else if (data.environmental_approval === '1' || data.environmental_approval === 1 || data.environmental_approval === true) {
                enviNecessary = 'YES';
            }
            else if (data.environmental_approval === '0' || data.environmental_approval === 0 || data.environmental_approval === false) {
                enviNecessary = 'NO';
            }
            approvalUpdates.EnviAppproverNecessary = enviNecessary;
            approvalUpdates.EnviCheckerNecessary = enviNecessary; // Legacy sync
        }
        if (data.envi_approver_id)
            approvalUpdates.EnviApproverID = data.envi_approver_id;
        if (data.envi_approve_name)
            approvalUpdates.EnviApproveName = data.envi_approve_name;
        if (data.envi_approve_dt_aprd)
            approvalUpdates.EnviApproveDtAprd = data.envi_approve_dt_aprd;
        // NEW: Add reviewer, checker, approver updates
        if (data.reviewer)
            approvalUpdates.Reviewer = data.reviewer;
        if (data.checker)
            approvalUpdates.Checker = data.checker;
        if (data.approver)
            approvalUpdates.Approver = data.approver;
        if (data.issue_date)
            approvalUpdates.IssueDate = data.issue_date;
        if (data.chkr_dt_aprd)
            approvalUpdates.ChkrDtAprd = data.chkr_dt_aprd;
        if (data.approver_dt_aprd)
            approvalUpdates.ApproverDtAprd = data.approver_dt_aprd;
        console.log('[5M1E Service] Approval updates built:', Object.keys(approvalUpdates));
        if (Object.keys(approvalUpdates).length > 0) {
            approvalUpdates.ModifiedDate = new Date();
            await this.repository.updateApprovalStatus(existing.ControlNo, existing.approval_status || 'DRAFT', approvalUpdates);
        }
        // Sync child tables (replace strategy)
        const cn = existing.ControlNo;
        if (data.parts) {
            await this.repository.replaceParts(cn, data.parts);
        }
        if (data.attachments) {
            console.log(`[5M1E Service] Update - Processing ${data.attachments.length} attachment(s) with ${files.length} file(s)`);
            await this.repository.replaceAttachments(cn, []); // Clear existing
            await this.processAttachments(cn, data.attachments, files); // Insert new with files
        }
        if (data.action_items) {
            await this.repository.replaceActionItems(cn, data.action_items);
        }
        if (data.check_items) {
            if (files && files.length > 0) {
                data.check_items.forEach(item => {
                    if (item.attribute_2 && typeof item.attribute_2 === 'string') {
                        const uploadedFile = files.find(f => f.originalname === item.attribute_2);
                        if (uploadedFile) {
                            console.log(`[5M1E Service] Processing check_item attachment: ${item.attribute_2} -> ${uploadedFile.filename}`);
                            item.attribute_2 = uploadedFile.path;
                        }
                    }
                });
            }
            await this.repository.replaceCheckItems(cn, data.check_items);
        }
        if (data.status_remarks) {
            await this.repository.replaceStatusRemarks(cn, data.status_remarks);
        }
        // Replace CC Notification List (delete & re-insert)
        if (data.cc_list !== undefined) {
            await this.repository.replaceCCUsers(cn, data.cc_list, actor.userId || 'SYSTEM');
        }
        return {
            success: true,
            message: 'Application updated successfully',
            data: { controlNo }
        };
    }
    /**
     * Process attachments with file uploads
     * Matches uploaded files to attachment metadata by original filename
     */
    async processAttachments(controlNo, attachments, files) {
        for (const att of attachments) {
            const originalName = att.file_name || att.fileName;
            if (!originalName) {
                console.log('[5M1E Service] Skipping attachment with no filename');
                continue;
            }
            // Find the uploaded file that matches this attachment's original name
            const uploadedFile = files.find(f => f.originalname === originalName);
            const diskFileName = uploadedFile ? uploadedFile.filename : originalName;
            // Build remarks with original filename reference
            const finalRemarks = formatAttachmentRemarks(att.attribute_2 || '', originalName)?.slice(0, 200) || null;
            console.log(`[5M1E Service] Processing attachment: ${originalName} -> ${diskFileName}`);
            await this.repository.insertAttachments(controlNo, [{
                    id: att.id || undefined,
                    file_name: diskFileName || 'Unknown',
                    attribute_1: uploadedFile ? uploadedFile.path : (att.attribute_1 || null), // Store file path or URL
                    attribute_2: finalRemarks || undefined,
                }]);
        }
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
        // Delete child tables first, then approval, then application
        await this.repository.replaceParts(cn, []);
        await this.repository.replaceAttachments(cn, []);
        await this.repository.replaceActionItems(cn, []);
        await this.repository.replaceCheckItems(cn, []);
        await this.repository.replaceStatusRemarks(cn, []);
        await this.repository.replaceCCUsers(cn, []);
        await this.repository.deleteApproval(cn);
        await this.repository.deleteByControlNo(cn);
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
