import { v4 as uuidv4 } from 'uuid';
import { getSubFormFormCodes, getWorkflowSurfaceFormCodes, } from '@sqm/permissions-contract';
import { sqprRepository } from './sqpr.repository.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { buildSqprWorkflowMetadata, getSqprCompatibilityRequestStatus, getSqprCompatibilityStatus, matchesSqprStatusFilter, } from './workflow/sqpr-workflow.utils.js';
import { SQPR_LEGACY_STAGE_CODE } from './workflow/sqpr-workflow.constants.js';
import { assertWorkflowRecordAccess, filterWorkflowRecords, } from '../../shared/utils/workflow-access.js';
import { attachmentService } from '../../shared/services/attachment.service.js';
import { controlNumberService } from '../../shared/services/control-number.service.js';
import { permissionService } from '../../shared/services/permission.service.js';
import { formatAttachmentRemarks } from '../../shared/utils/attachment-remarks.js';
import { isAdminRole } from '../../shared/utils/admin.utils.js';
const SQPR_QUEUE_STATUS_FORM_FALLBACKS = {
    NEW: ['SQPR-03-01'],
    DRAFT: ['SQPR-03-01'],
    SUBMITTED: ['SQPR-03-02'],
    SU: ['SQPR-03-02'],
    CHECKED: ['SQPR-03-02'],
    CK: ['SQPR-03-02'],
    AWAITING_CHECKED: ['SQPR-03-02'],
    AWAITING_APPROVAL: ['SQPR-03-02'],
    AAPPROVAL: ['SQPR-03-02'],
    CHECKER: ['SQPR-03-02'],
    APPROVER: ['SQPR-03-02'],
    REJECTED: ['SQPR-03-03'],
    REJECT_CHECKER: ['SQPR-03-03'],
    REJECT_APPROVER: ['SQPR-03-03'],
    APPROVED: ['SQPR-03-04'],
    ISSUED: ['SQPR-03-04'],
    ISSUER: ['SQPR-03-04'],
    ACCEPT: ['SQPR-03-04'],
    SEARCH: ['SQPR-03-04'],
    REPORT: ['SQPR-03-04'],
    REPORTS: ['SQPR-03-04'],
    ACHIEVEMENT: ['SQPR-03-04'],
};
function uniqueFormCodes(formIds) {
    return Array.from(new Set(formIds.filter(Boolean)));
}
function resolveSqprQueueFormUniverse() {
    const contractCodes = Object.keys(SQPR_QUEUE_STATUS_FORM_FALLBACKS).flatMap((stage) => getSubFormFormCodes('SQPR', stage));
    const fallbackCodes = Object.values(SQPR_QUEUE_STATUS_FORM_FALLBACKS).flat();
    return uniqueFormCodes([...contractCodes, ...fallbackCodes]);
}
const SQPR_QUEUE_FORM_CODES = resolveSqprQueueFormUniverse();
const SQPR_REFERENCE_FORM_CODE = 'SQPR-03-04';
const SQPR_REFERENCE_SURFACES = ['tracking', 'search', 'report', 'reports', 'achievement'];
export class SqprService {
    isAdminActor(actor) {
        return isAdminRole(actor?.roleName);
    }
    getWorkflowStage(record) {
        return buildSqprWorkflowMetadata(record, {}).workflowStage;
    }
    isEditableOriginatorStage(stage) {
        return stage === 'DRAFT' || stage === 'REJECT_CHECKER' || stage === 'REJECT_APPROVER';
    }
    isReferenceVisibleStage(stage) {
        return stage === 'ISSUER' || stage === 'ACCEPT';
    }
    hasSurfaceViewListAccess(surface, roleViewListForms) {
        const surfaceFormCodes = getWorkflowSurfaceFormCodes('SQPR', surface);
        if (surfaceFormCodes.length === 0) {
            return roleViewListForms.has(SQPR_REFERENCE_FORM_CODE);
        }
        return surfaceFormCodes.some((formId) => roleViewListForms.has(formId));
    }
    async resolveRoleViewListFormCodes(userId) {
        if (!userId) {
            return new Set();
        }
        const checks = await Promise.all(SQPR_QUEUE_FORM_CODES.map(async (formId) => ({
            formId,
            allowed: await permissionService.checkRolePermission(userId, formId, 'viewlist'),
        })));
        return new Set(checks
            .filter((entry) => entry.allowed)
            .map((entry) => entry.formId));
    }
    hasReferenceViewListAccessForRecord(record, roleViewListForms) {
        if (roleViewListForms.size === 0 || !roleViewListForms.has(SQPR_REFERENCE_FORM_CODE)) {
            return false;
        }
        return this.isReferenceVisibleStage(this.getWorkflowStage(record));
    }
    isSurfaceVisible(record, actor = {}, roleViewListForms = new Set(), surface) {
        if (!surface || !SQPR_REFERENCE_SURFACES.includes(surface)) {
            return this.canReadRecord(record, actor, roleViewListForms);
        }
        if (!this.isReferenceVisibleStage(this.getWorkflowStage(record))) {
            return false;
        }
        if (this.isAdminActor(actor)) {
            return true;
        }
        return this.hasSurfaceViewListAccess(surface, roleViewListForms);
    }
    isAssignedRecord(record, actor = {}) {
        if (!actor.userId) {
            return false;
        }
        const workflow = buildSqprWorkflowMetadata(record, { actor });
        return Array.isArray(workflow.availableActions) && workflow.availableActions.length > 0;
    }
    isMineRecord(record, actor = {}) {
        if (!actor.userId) {
            return false;
        }
        return [record.incharge_id, record.checker_id, record.approver_id].includes(actor.userId);
    }
    canReadRecord(record, actor = {}, roleViewListForms = new Set()) {
        if (!actor.userId) {
            return false;
        }
        if (this.isAdminActor(actor)) {
            return true;
        }
        if (this.isAssignedRecord(record, actor)) {
            return true;
        }
        return this.hasReferenceViewListAccessForRecord(record, roleViewListForms);
    }
    canMutateMainRecord(record, actor = {}) {
        if (this.isAdminActor(actor)) {
            return true;
        }
        if (!actor.userId) {
            return false;
        }
        const stage = this.getWorkflowStage(record);
        return this.isEditableOriginatorStage(stage) && record.incharge_id === actor.userId;
    }
    canDeleteRecord(record, actor = {}) {
        if (this.isAdminActor(actor)) {
            return true;
        }
        if (!actor.userId) {
            return false;
        }
        const stage = this.getWorkflowStage(record);
        return this.isEditableOriginatorStage(stage) && record.incharge_id === actor.userId;
    }
    decorateRecord(record, actor = {}, roleViewListForms = new Set()) {
        const workflow = buildSqprWorkflowMetadata(record, { actor });
        const status = getSqprCompatibilityStatus(workflow.workflowStage, record);
        const requestStatus = getSqprCompatibilityRequestStatus(workflow.workflowStage, record);
        const permissions = {
            canView: this.canReadRecord(record, actor, roleViewListForms),
            canEdit: this.canMutateMainRecord(record, actor),
            canDelete: this.canDeleteRecord(record, actor),
        };
        return {
            ...record,
            status,
            request_status: requestStatus,
            created_at: record.date_created,
            workflow: {
                status,
                availableActions: workflow.availableActions,
                blockers: [],
                stage: workflow.workflowStage,
                stageCode: workflow.workflowStageCode,
                stageLabel: workflow.workflowStageLabel,
            },
            permissions,
            ...workflow,
        };
    }
    async getAllRecords(filters = {}, actor = {}) {
        const records = await sqprRepository.findAllDetailed();
        const roleViewListForms = this.isAdminActor(actor)
            ? new Set()
            : await this.resolveRoleViewListFormCodes(actor.userId);
        const visibleRecords = this.isAdminActor(actor)
            ? (filters.surface
                ? records.filter((record) => this.isSurfaceVisible(record, actor, roleViewListForms, filters.surface))
                : records)
            : filterWorkflowRecords(records, { scope: filters.scope || 'history', surface: filters.surface }, {
                isAssigned: (record) => this.isAssignedRecord(record, actor),
                isMine: (record) => this.isMineRecord(record, actor),
                isHistoryVisible: (record) => this.canReadRecord(record, actor, roleViewListForms),
                isSurfaceVisible: (record, surface) => this.isSurfaceVisible(record, actor, roleViewListForms, surface),
            });
        return visibleRecords
            .filter((record) => matchesSqprStatusFilter(record, filters.status))
            .map((record) => this.decorateRecord(record, actor, roleViewListForms));
    }
    async getRecordById(id, actor = {}) {
        const data = await sqprRepository.findByIdDetailed(id);
        if (!data)
            throw new NotFoundError('SQPR Record not found');
        const roleViewListForms = this.isAdminActor(actor)
            ? new Set()
            : await this.resolveRoleViewListFormCodes(actor.userId);
        assertWorkflowRecordAccess({
            allowed: this.canReadRecord(data.record, actor, roleViewListForms),
            action: 'view',
            moduleName: 'SQPR',
        });
        const { record, attachments, ccList } = data;
        return {
            ...this.decorateRecord(record, actor, roleViewListForms),
            attachments: attachments || [],
            cc_list: ccList || []
        };
    }
    async createRecord(payload, userId, files = []) {
        const sqprId = uuidv4();
        const now = new Date();
        const site = await sqprRepository.findSiteCode(payload.site_id);
        if (!site?.site_code) {
            throw new NotFoundError('Manufacturing site not found');
        }
        const controlNo = controlNumberService.buildSqprDraft({
            fiscalYear: payload.fiscal_year,
            reportType: payload.report_type,
            month: payload.month,
            siteCode: site.site_code,
        });
        const dbPayload = {
            sqpr_id: sqprId,
            control_no: controlNo,
            site_id: payload.site_id,
            fiscal_year: payload.fiscal_year,
            report_type: payload.report_type,
            month: payload.month || 1,
            supplier_id: payload.supplierId || payload.supplier_id || null,
            attention_id: payload.attentionId || payload.attention_id || null,
            attention: payload.attention || null,
            file_id: uuidv4(),
            file_name: 'Pending',
            file_extension: 'pdf',
            remarks: payload.remarks || null,
            date_created: now,
            incharge_id: payload.incharge_id || userId,
            incharge_remarks: payload.incharge_remarks || null,
            checker_id: payload.checker_id || null,
            checker_remarks: payload.checker_remarks || null,
            approver_id: payload.approver_id || null,
            approver_remarks: payload.approver_remarks || null,
            request_status: SQPR_LEGACY_STAGE_CODE.DRAFT,
            last_update: now,
            updateby: userId
        };
        return await sqprRepository.executeTransaction(async (trx) => {
            // 1. Insert Main Record
            await trx.insertInto('SQPR').values(dbPayload).execute();
            // 2. Insert Attachments
            const savedAttachments = [];
            if (payload.attachments && payload.attachments.length > 0) {
                for (const att of payload.attachments) {
                    const uploadedFile = files.find(f => f.originalname === att.file_name);
                    const diskFileName = uploadedFile ? uploadedFile.filename : att.file_name;
                    const originalName = att.file_name;
                    const finalRemarks = formatAttachmentRemarks(att.remarks, originalName);
                    const attachmentId = uuidv4();
                    await trx.insertInto('SQPR_ATTACHMENT').values({
                        sqpr_attachment_id: attachmentId,
                        sqpr_id: sqprId,
                        file_name: diskFileName || 'Unknown',
                        file_extension: diskFileName ? diskFileName.split('.').pop() : (att.file_extension || 'dat'),
                        attachment_type: att.attachment_type || 'COVER',
                        remarks: finalRemarks,
                        last_update: now,
                        updateby: userId
                    }).execute();
                    savedAttachments.push({
                        sqpr_attachment_id: attachmentId,
                        sqpr_id: sqprId,
                        file_name: diskFileName || originalName,
                        file_extension: diskFileName ? diskFileName.split('.').pop() : (att.file_extension || 'dat'),
                        attachment_type: att.attachment_type || 'COVER',
                        remarks: finalRemarks,
                        updateby: userId,
                        last_update: now
                    });
                }
            }
            // 3. Insert CC List
            const savedCcList = [];
            if (payload.cc_list && payload.cc_list.length > 0) {
                for (const cc of payload.cc_list) {
                    const ccId = uuidv4();
                    await trx.insertInto('SQPR_CC').values({
                        sqpr_cc_id: ccId,
                        sqpr_id: sqprId,
                        user_id: cc.user_id,
                        last_update: now,
                        updateby: userId
                    }).execute();
                    savedCcList.push({ sqpr_cc_id: ccId, sqpr_id: sqprId, user_id: cc.user_id, updateby: userId, last_update: now });
                }
            }
            // 4. Return record data directly (don't fetch from DB inside transaction)
            const recordData = {
                sqpr_id: sqprId,
                control_no: controlNo,
                site_id: dbPayload.site_id,
                site_name: site.site_name,
                site_code: site.site_code,
                fiscal_year: dbPayload.fiscal_year,
                report_type: dbPayload.report_type,
                month: dbPayload.month,
                supplier_id: dbPayload.supplier_id,
                attention_id: dbPayload.attention_id,
                attention: dbPayload.attention,
                remarks: dbPayload.remarks,
                date_created: now,
                request_status: dbPayload.request_status,
                last_update: now,
                updateby: userId,
                incharge_id: dbPayload.incharge_id,
                incharge_remarks: dbPayload.incharge_remarks,
                checker_id: dbPayload.checker_id,
                checker_remarks: dbPayload.checker_remarks,
                approver_id: dbPayload.approver_id,
                approver_remarks: dbPayload.approver_remarks,
                submit_date: null,
                checker_date: null,
                approver_date: null,
                file_id: dbPayload.file_id,
                file_name: dbPayload.file_name,
                file_extension: dbPayload.file_extension
            };
            return {
                success: true,
                data: {
                    ...this.decorateRecord(recordData, { userId }),
                    attachments: savedAttachments,
                    cc_list: savedCcList
                },
                message: 'Record created successfully'
            };
        });
    }
    async updateRecord(id, payload, actor, files = []) {
        const existing = await sqprRepository.findByIdDetailed(id);
        if (!existing)
            throw new NotFoundError('Record not found');
        assertWorkflowRecordAccess({
            allowed: this.canMutateMainRecord(existing.record, actor),
            action: 'update',
            moduleName: 'SQPR',
        });
        const now = new Date();
        const dbUpdates = {
            last_update: now,
            updateby: actor.userId
        };
        if (payload.site_id)
            dbUpdates.site_id = payload.site_id;
        if (payload.fiscal_year)
            dbUpdates.fiscal_year = payload.fiscal_year;
        if (payload.report_type)
            dbUpdates.report_type = payload.report_type;
        if (payload.month)
            dbUpdates.month = payload.month;
        if (payload.supplier_id !== undefined)
            dbUpdates.supplier_id = payload.supplier_id;
        if (payload.attention_id !== undefined)
            dbUpdates.attention_id = payload.attention_id;
        if (payload.attention !== undefined)
            dbUpdates.attention = payload.attention;
        if (payload.remarks !== undefined)
            dbUpdates.remarks = payload.remarks;
        if (payload.incharge_id)
            dbUpdates.incharge_id = payload.incharge_id;
        if (payload.incharge_remarks !== undefined)
            dbUpdates.incharge_remarks = payload.incharge_remarks;
        if (payload.checker_id)
            dbUpdates.checker_id = payload.checker_id;
        if (payload.checker_remarks !== undefined)
            dbUpdates.checker_remarks = payload.checker_remarks;
        if (payload.approver_id)
            dbUpdates.approver_id = payload.approver_id;
        if (payload.approver_remarks !== undefined)
            dbUpdates.approver_remarks = payload.approver_remarks;
        return await sqprRepository.executeTransaction(async (trx) => {
            // 1. Update Header
            if (Object.keys(dbUpdates).length > 2) {
                await trx.updateTable('SQPR')
                    .set(dbUpdates)
                    .where('sqpr_id', '=', existing.record.sqpr_id)
                    .execute();
            }
            // 2. Refresh Attachments (Delete & Re-insert)
            const savedAttachments = [];
            if (payload.attachments !== undefined) {
                await trx.deleteFrom('SQPR_ATTACHMENT').where('sqpr_id', '=', existing.record.sqpr_id).execute();
                for (const att of payload.attachments) {
                    const uploadedFile = files.find(f => f.originalname === att.file_name);
                    const diskFileName = uploadedFile ? uploadedFile.filename : att.file_name;
                    const originalName = att.file_name;
                    const finalRemarks = formatAttachmentRemarks(att.remarks, originalName);
                    const attachmentId = att.sqpr_attachment_id || uuidv4();
                    await trx.insertInto('SQPR_ATTACHMENT').values({
                        sqpr_attachment_id: attachmentId,
                        sqpr_id: existing.record.sqpr_id,
                        file_name: diskFileName || 'Unknown',
                        file_extension: diskFileName ? diskFileName.split('.').pop() : (att.file_extension || 'dat'),
                        attachment_type: att.attachment_type || 'COVER',
                        remarks: finalRemarks,
                        last_update: now,
                        updateby: actor.userId || 'SYSTEM'
                    }).execute();
                    savedAttachments.push({
                        sqpr_attachment_id: attachmentId,
                        sqpr_id: existing.record.sqpr_id,
                        file_name: diskFileName || originalName,
                        file_extension: diskFileName ? diskFileName.split('.').pop() : (att.file_extension || 'dat'),
                        attachment_type: att.attachment_type || 'COVER',
                        remarks: finalRemarks,
                        updateby: actor.userId,
                        last_update: now
                    });
                }
            }
            // 3. Refresh CC (Delete & Re-insert)
            const savedCcList = [];
            if (payload.cc_list !== undefined) {
                await trx.deleteFrom('SQPR_CC').where('sqpr_id', '=', existing.record.sqpr_id).execute();
                for (const cc of payload.cc_list) {
                    const ccId = cc.sqpr_cc_id || uuidv4();
                    await trx.insertInto('SQPR_CC').values({
                        sqpr_cc_id: ccId,
                        sqpr_id: existing.record.sqpr_id,
                        user_id: cc.user_id,
                        last_update: now,
                        updateby: actor.userId || 'SYSTEM'
                    }).execute();
                    savedCcList.push({ sqpr_cc_id: ccId, sqpr_id: existing.record.sqpr_id, user_id: cc.user_id, updateby: actor.userId || 'SYSTEM', last_update: now });
                }
            }
            // 4. Return record data directly (don't fetch from DB inside transaction)
            const recordData = {
                ...existing.record,
                ...dbUpdates,
                sqpr_id: existing.record.sqpr_id,
                control_no: existing.record.control_no,
                incharge_remarks: dbUpdates.incharge_remarks || existing.record.incharge_remarks,
                checker_remarks: dbUpdates.checker_remarks || existing.record.checker_remarks,
                approver_remarks: dbUpdates.approver_remarks || existing.record.approver_remarks
            };
            return {
                success: true,
                data: {
                    ...this.decorateRecord(recordData, actor),
                    attachments: savedAttachments.length > 0 ? savedAttachments : (existing.attachments || []),
                    cc_list: savedCcList.length > 0 ? savedCcList : (existing.ccList || [])
                },
                message: 'Record updated successfully'
            };
        });
    }
    async deleteRecord(id, actor = {}) {
        const existing = await sqprRepository.findByIdDetailed(id);
        if (!existing)
            throw new NotFoundError('Record not found');
        assertWorkflowRecordAccess({
            allowed: this.canDeleteRecord(existing.record, actor),
            action: 'delete',
            moduleName: 'SQPR',
        });
        return await sqprRepository.executeTransaction(async (trx) => {
            await trx.deleteFrom('SQPR_ATTACHMENT').where('sqpr_id', '=', existing.record.sqpr_id).execute();
            await trx.deleteFrom('SQPR_CC').where('sqpr_id', '=', existing.record.sqpr_id).execute();
            await trx.deleteFrom('SQPR').where('sqpr_id', '=', existing.record.sqpr_id).execute();
            return { success: true, message: 'Record deleted successfully' };
        });
    }
    /**
     * Batch delete multiple SQPR records
     */
    async batchDelete(ids, actor = {}) {
        const records = await Promise.all(ids.map((id) => sqprRepository.findByIdDetailed(id)));
        const deletableRecords = records.filter((record) => Boolean(record));
        deletableRecords.forEach((existing) => {
            assertWorkflowRecordAccess({
                allowed: this.canDeleteRecord(existing.record, actor),
                action: 'delete',
                moduleName: 'SQPR',
            });
        });
        return await sqprRepository.executeTransaction(async (trx) => {
            let deletedCount = 0;
            for (const existing of deletableRecords) {
                await trx.deleteFrom('SQPR_ATTACHMENT').where('sqpr_id', '=', existing.record.sqpr_id).execute();
                await trx.deleteFrom('SQPR_CC').where('sqpr_id', '=', existing.record.sqpr_id).execute();
                await trx.deleteFrom('SQPR').where('sqpr_id', '=', existing.record.sqpr_id).execute();
                deletedCount++;
            }
            return { success: true, message: `${deletedCount} records deleted successfully` };
        });
    }
    /**
     * Get attachment file info for download
     */
    async getAttachment(attachmentId) {
        // @ts-ignore
        const { db } = await import('../../shared/infrastructure/db.js');
        const attachment = await db.selectFrom('SQPR_ATTACHMENT')
            .select(['sqpr_attachment_id', 'sqpr_id', 'file_name', 'file_extension', 'remarks'])
            .where('sqpr_attachment_id', '=', attachmentId)
            .executeTakeFirst();
        if (!attachment)
            throw new NotFoundError('Attachment not found');
        return attachment;
    }
    async downloadAttachment(attachmentId, actor = {}) {
        const owner = await sqprRepository.findAttachmentOwner(attachmentId);
        if (!owner?.sqpr_id) {
            throw new NotFoundError('Attachment not found');
        }
        const existing = await sqprRepository.findByIdDetailed(owner.sqpr_id);
        if (!existing) {
            throw new NotFoundError('SQPR Record not found');
        }
        const roleViewListForms = this.isAdminActor(actor)
            ? new Set()
            : await this.resolveRoleViewListFormCodes(actor.userId);
        assertWorkflowRecordAccess({
            allowed: this.canReadRecord(existing.record, actor, roleViewListForms),
            action: 'download',
            moduleName: 'SQPR',
        });
        return attachmentService.downloadAttachment('sqpr-main', attachmentId);
    }
}
export const sqprService = new SqprService();
