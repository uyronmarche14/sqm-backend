import { v4 as uuidv4 } from 'uuid';
import { sql } from 'kysely';
import { db } from '../../shared/infrastructure/db.js';
import { ConflictError, NotFoundError } from '../../shared/errors/AppError.js';
import { mapStatusFromDB } from '../../shared/utils/status-mapper.js';
import { qmqaRepository } from './qmqa.repository.js';
import { buildQmqaWorkflowMetadata, getQmqaCompatibilityStatus, isQmqaSupplierActor, resolveQmqaStatusFilter, } from './workflow/qmqa-workflow.utils.js';
import { assertWorkflowRecordAccess, filterWorkflowRecordsByScope, resolveWorkflowListScope, } from '../../shared/utils/workflow-access.js';
const sanitizeUUID = (value) => {
    return value && value.trim() !== '' ? value : null;
};
const QMQA_DUPLICATE_KEY_NUMBERS = new Set([2601, 2627]);
export class QmqaService {
    extractDuplicateControlNo(error) {
        const message = String(error?.message || '');
        const match = message.match(/duplicate key value is \(([^)]+)\)/i);
        return match?.[1] || null;
    }
    getControlNoSequence(controlNo, prefix) {
        if (!controlNo || !controlNo.startsWith(prefix)) {
            return null;
        }
        const sequence = Number(controlNo.slice(prefix.length));
        return Number.isNaN(sequence) ? null : sequence;
    }
    getDbErrorNumber(error) {
        const candidates = [
            error?.number,
            error?.code,
            error?.originalError?.info?.number,
            error?.originalError?.number,
            error?.cause?.number,
        ];
        for (const candidate of candidates) {
            const parsed = Number(candidate);
            if (!Number.isNaN(parsed)) {
                return parsed;
            }
        }
        return undefined;
    }
    isDuplicateControlNoError(error) {
        const message = String(error?.message || '');
        const errorNumber = this.getDbErrorNumber(error);
        return ((errorNumber !== undefined && QMQA_DUPLICATE_KEY_NUMBERS.has(errorNumber)) ||
            (message.includes('UNIQUE KEY constraint') && message.includes('duplicate key value')));
    }
    async generateControlNoInContext(year, isSchedule = false, trxOrDb = db, minimumSequence) {
        const prefix = isSchedule ? `P-${year}-` : `A-${year}-`;
        const canExecuteRawSql = typeof trxOrDb?.getExecutor === 'function';
        const lastControlNo = canExecuteRawSql
            ? (await sql `
            SELECT TOP 1 control_no
            FROM QMQA_AUDIT_PLAN WITH (UPDLOCK, HOLDLOCK)
            WHERE control_no LIKE ${`${prefix}%`}
            ORDER BY control_no DESC
          `.execute(trxOrDb)).rows[0]?.control_no
            : (await trxOrDb.selectFrom('QMQA_AUDIT_PLAN')
                .select('control_no')
                .where('control_no', 'like', `${prefix}%`)
                .orderBy('control_no', 'desc')
                .executeTakeFirst())?.control_no;
        let nextNum = 1;
        if (lastControlNo) {
            const numPart = this.getControlNoSequence(lastControlNo, prefix);
            if (numPart !== null) {
                nextNum = numPart + 1;
            }
        }
        if (minimumSequence !== undefined && minimumSequence !== null) {
            nextNum = Math.max(nextNum, minimumSequence + 1);
        }
        return `${prefix}${nextNum.toString().padStart(4, '0')}`;
    }
    async resolveAttentionId(userIdOrSupplierUserId, trxOrDb = db) {
        const cleanAttentionId = sanitizeUUID(userIdOrSupplierUserId);
        if (!cleanAttentionId) {
            return null;
        }
        const supplierUser = await trxOrDb.selectFrom('SUPPLIERSUSER')
            .select('user_id')
            .where('Id', '=', cleanAttentionId)
            .executeTakeFirst();
        return supplierUser?.user_id || cleanAttentionId;
    }
    async resolveActorContextWithRole(userId, roleName) {
        if (!userId) {
            return {};
        }
        return {
            userId,
            supplierIds: await qmqaRepository.findSupplierIdsByUserId(userId),
            roleName: roleName || null,
        };
    }
    isAdminActor(actor) {
        return (actor?.roleName || '').toUpperCase().includes('ADMIN');
    }
    isAssignedRecord(record, latestResponse, actor) {
        if (!actor.userId) {
            return false;
        }
        const workflow = buildQmqaWorkflowMetadata(record, {
            latestResponse: latestResponse || null,
            actor,
        });
        return Array.isArray(workflow.availableActions) && workflow.availableActions.length > 0;
    }
    isMineRecord(record, latestResponse, actor) {
        if (!actor.userId) {
            return false;
        }
        return (record.encoder_id === actor.userId ||
            record.issuer_id === actor.userId ||
            record.sqe_pic_id === actor.userId ||
            this.isAssignedRecord(record, latestResponse, actor));
    }
    canReadRecord(record, latestResponse, actor) {
        if (!actor.userId || this.isAdminActor(actor)) {
            return true;
        }
        if (this.isAssignedRecord(record, latestResponse, actor) || isQmqaSupplierActor(record, actor)) {
            return true;
        }
        return [
            record.encoder_id,
            record.issuer_id,
            record.checker_id,
            record.approver_id,
            record.attention_id,
            record.sqe_pic_id,
            record.pic_auditor_id,
            latestResponse?.checker_id,
            latestResponse?.approver_id,
            latestResponse?.updateby,
        ].includes(actor.userId);
    }
    canMutateMainRecord(record, actor) {
        if (!actor.userId || this.isAdminActor(actor)) {
            return true;
        }
        return record.encoder_id === actor.userId || record.issuer_id === actor.userId;
    }
    async findLatestResponseMap(qmqaIds) {
        const latestResponseMap = new Map();
        const latestResponses = await qmqaRepository.findLatestResponsesByQmqaIds(qmqaIds);
        for (const response of latestResponses) {
            if (!latestResponseMap.has(response.qmqa_id)) {
                latestResponseMap.set(response.qmqa_id, response);
            }
        }
        return latestResponseMap;
    }
    decorateRecord(record, actor, latestResponse) {
        const workflow = buildQmqaWorkflowMetadata(record, {
            latestResponse: latestResponse || null,
            actor,
        });
        return {
            ...record,
            status: getQmqaCompatibilityStatus(workflow.workflowStage, latestResponse, record),
            created_at: record.created_date,
            ...workflow,
        };
    }
    async generateControlNo(year, isSchedule = false) {
        return this.generateControlNoInContext(year, isSchedule, db);
    }
    async getAllSchedules() {
        const schedules = await qmqaRepository.findAllSchedules();
        return schedules.map((schedule) => ({
            ...schedule,
            status: mapStatusFromDB(schedule.request_status),
            recordId: schedule.record_id || null,
            recordStatus: schedule.record_status ? mapStatusFromDB(schedule.record_status) : null,
            created_at: schedule.created_date,
        }));
    }
    async getScheduleById(id) {
        const schedule = await qmqaRepository.findScheduleById(id);
        if (!schedule) {
            throw new NotFoundError('Schedule not found');
        }
        return {
            ...schedule,
            status: mapStatusFromDB(schedule.request_status),
            recordId: schedule.record_id || null,
            recordStatus: schedule.record_status ? mapStatusFromDB(schedule.record_status) : null,
            created_at: schedule.created_date,
        };
    }
    async createSchedule(payload, userId) {
        const id = uuidv4();
        const now = new Date();
        const effectiveUserId = userId || 'SYSTEM';
        const year = new Date(payload.audit_plan_date).getFullYear();
        let minimumSequence = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                return await qmqaRepository.executeTransaction(async (trx) => {
                    const controlNo = await this.generateControlNoInContext(year, true, trx, minimumSequence);
                    await trx.insertInto('QMQA_AUDIT_PLAN').values({
                        qmqa_audit_plan_id: id,
                        control_no: controlNo,
                        created_date: now,
                        site_id: payload.site_id,
                        supplier_id: payload.supplier_id,
                        audit_category_id: payload.audit_category_id,
                        audit_plan_date: payload.audit_plan_date,
                        sqe_pic_id: payload.sqe_pic_id,
                        remarks: payload.remarks || null,
                        request_status: 'PL',
                        last_update: now,
                        updateby: effectiveUserId,
                    }).execute();
                    return { success: true, id, controlNo, message: 'Schedule created' };
                });
            }
            catch (error) {
                if (!this.isDuplicateControlNoError(error) || attempt === 2) {
                    throw error;
                }
                minimumSequence = this.getControlNoSequence(this.extractDuplicateControlNo(error), `P-${year}-`);
            }
        }
        throw new ConflictError('Unable to generate a unique QMQA schedule control number.');
    }
    async updateSchedule(id, payload, userId) {
        const existing = await qmqaRepository.findScheduleById(id);
        if (!existing) {
            throw new NotFoundError('Schedule not found');
        }
        const dbUpdates = {
            last_update: new Date(),
            updateby: userId || 'SYSTEM',
        };
        if (payload.site_id)
            dbUpdates.site_id = payload.site_id;
        if (payload.supplier_id)
            dbUpdates.supplier_id = payload.supplier_id;
        if (payload.audit_category_id)
            dbUpdates.audit_category_id = payload.audit_category_id;
        if (payload.audit_plan_date)
            dbUpdates.audit_plan_date = payload.audit_plan_date;
        if (payload.sqe_pic_id)
            dbUpdates.sqe_pic_id = payload.sqe_pic_id;
        if (payload.remarks !== undefined)
            dbUpdates.remarks = payload.remarks;
        return qmqaRepository.executeTransaction(async (trx) => {
            await trx.updateTable('QMQA_AUDIT_PLAN')
                .set(dbUpdates)
                .where('qmqa_audit_plan_id', '=', id)
                .execute();
            return { success: true, message: 'Schedule updated' };
        });
    }
    async getAllRecords(filters, actor) {
        const mappedStatus = resolveQmqaStatusFilter(filters?.status);
        const actorContext = await this.resolveActorContextWithRole(actor?.userId, actor?.roleName);
        const scope = resolveWorkflowListScope({ scope: filters?.scope }, 'history');
        const records = await qmqaRepository.findAllRecordsDetailed({
            mappedStatus,
            actorContext,
        });
        const latestResponseMap = await this.findLatestResponseMap(records.map((record) => record.qmqa_id));
        const visibleRecords = this.isAdminActor(actorContext)
            ? records
            : filterWorkflowRecordsByScope(records, scope, {
                isAssigned: (record) => this.isAssignedRecord(record, latestResponseMap.get(record.qmqa_id) || null, actorContext),
                isMine: (record) => this.isMineRecord(record, latestResponseMap.get(record.qmqa_id) || null, actorContext),
                isHistoryVisible: (record) => this.canReadRecord(record, latestResponseMap.get(record.qmqa_id) || null, actorContext),
            });
        return visibleRecords.map((record) => this.decorateRecord(record, actorContext, latestResponseMap.get(record.qmqa_id) || null));
    }
    async getRecordById(id, actor) {
        const data = await qmqaRepository.findRecordByIdDetailed(id);
        if (!data) {
            throw new NotFoundError('QMQA Record not found');
        }
        const planAttachments = await qmqaRepository.findPlanAttachments(data.qmqa_id);
        const attachments = await qmqaRepository.findAttachments(data.qmqa_id);
        const ccList = await qmqaRepository.findCcList(data.qmqa_id);
        const response = await qmqaRepository.findResponseByQmqaId(data.qmqa_id);
        const actorContext = await this.resolveActorContextWithRole(actor?.userId, actor?.roleName);
        assertWorkflowRecordAccess({
            allowed: this.canReadRecord(data, response, actorContext),
            action: 'view',
            moduleName: 'QMQA',
        });
        let responseInitialAttachments = [];
        let responseFinalAttachments = [];
        let responseVerificationAttachments = [];
        if (response) {
            const rawInitial = await qmqaRepository.findResponseInitialAttachments(response.qmqa_response_id);
            const rawFinal = await qmqaRepository.findResponseFinalAttachments(response.qmqa_response_id);
            const rawVerification = await qmqaRepository.findResponseVerificationAttachments(response.qmqa_response_id);
            // Transform snake_case to camelCase for frontend compatibility
            responseInitialAttachments = rawInitial.map((a) => ({
                id: a.qmqa_response_initial_attachment_id,
                fileName: a.file_name,
                fileExtension: a.file_extension,
                fileSize: a.file_size,
                fileUrl: a.file_url,
                remarks: a.remarks,
                uploadedBy: a.updateby,
                uploadedAt: a.last_update,
            }));
            responseFinalAttachments = rawFinal.map((a) => ({
                id: a.qmqa_response_final_attachment_id,
                fileName: a.file_name,
                fileExtension: a.file_extension,
                fileSize: a.file_size,
                fileUrl: a.file_url,
                remarks: a.remarks,
                uploadedBy: a.updateby,
                uploadedAt: a.last_update,
            }));
            responseVerificationAttachments = rawVerification.map((a) => ({
                id: a.qmqa_response_verification_attachment_id,
                fileName: a.file_name,
                fileExtension: a.file_extension,
                fileSize: a.file_size,
                fileUrl: a.file_url,
                remarks: a.remarks,
                uploadedBy: a.updateby,
                uploadedAt: a.last_update,
            }));
        }
        return {
            ...this.decorateRecord(data, actorContext, response),
            audit_plan_attachments: planAttachments,
            attachments,
            cc_list: ccList,
            response: response || null,
            response_initial_attachments: responseInitialAttachments,
            response_final_attachments: responseFinalAttachments,
            response_verification_attachments: responseVerificationAttachments,
            // Map first attachment to single field for frontend compatibility
            initialReportAttachment: responseInitialAttachments[0] || null,
            finalReportAttachment: responseFinalAttachments[0] || null,
            verificationAttachment: responseVerificationAttachments[0] || null,
        };
    }
    async createRecord(payload, userId, files = []) {
        const now = new Date();
        const effectiveUserId = userId || 'SYSTEM';
        const qmqaId = uuidv4();
        const isLinkedToExistingSchedule = Boolean(payload.schedule_id);
        const unscheduledAuditYear = new Date(payload.audit_date).getFullYear();
        let minimumSequence = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                return await qmqaRepository.executeTransaction(async (trx) => {
                    let auditPlanId = payload.schedule_id;
                    if (!isLinkedToExistingSchedule || !auditPlanId) {
                        auditPlanId = uuidv4();
                        const controlNo = await this.generateControlNoInContext(unscheduledAuditYear, false, trx, minimumSequence);
                        await trx.insertInto('QMQA_AUDIT_PLAN').values({
                            qmqa_audit_plan_id: auditPlanId,
                            control_no: controlNo,
                            created_date: now,
                            site_id: payload.site_id,
                            supplier_id: payload.supplier_id,
                            audit_category_id: payload.audit_category_id,
                            audit_plan_date: payload.audit_plan_date || now,
                            sqe_pic_id: payload.sqe_pic_id,
                            remarks: null,
                            request_status: 'CO',
                            last_update: now,
                            updateby: effectiveUserId,
                        }).execute();
                    }
                    else {
                        await trx.updateTable('QMQA_AUDIT_PLAN')
                            .set({
                            request_status: 'CO',
                            last_update: now,
                            updateby: effectiveUserId,
                        })
                            .where('qmqa_audit_plan_id', '=', auditPlanId)
                            .execute();
                    }
                    const resolvedAttentionId = await this.resolveAttentionId(payload.attention_id, trx);
                    await trx.insertInto('QMQA').values({
                        qmqa_id: qmqaId,
                        qmqa_audit_plan_id: auditPlanId,
                        created_date: now,
                        audit_type_id: payload.audit_type_id,
                        attention_id: resolvedAttentionId,
                        pic_auditor_id: sanitizeUUID(payload.pic_auditor_id),
                        due_date: payload.due_date ? new Date(payload.due_date) : null,
                        audit_date: new Date(payload.audit_date),
                        issued_date: null,
                        audit_rating: payload.audit_rating ?? null,
                        auditees: payload.auditees || null,
                        auditors: payload.auditors || null,
                        attendees: payload.attendees || null,
                        remarks: payload.remarks || null,
                        encoder_id: effectiveUserId,
                        encoder_date: now,
                        issuer_id: effectiveUserId,
                        issuer_remarks: null,
                        issuer_date: null,
                        checker_id: sanitizeUUID(payload.checker_id),
                        checker_remarks: null,
                        checker_date: null,
                        approver_id: sanitizeUUID(payload.approver_id),
                        approver_remarks: null,
                        approver_date: null,
                        request_status: '2',
                        last_update: now,
                        updateby: effectiveUserId,
                    }).execute();
                    if (payload.cc_list?.length) {
                        for (const cc of payload.cc_list) {
                            await trx.insertInto('QMQA_CC').values({
                                qmqa_cc_id: uuidv4(),
                                qmqa_id: qmqaId,
                                user_id: cc.user_id,
                                last_update: now,
                                updateby: effectiveUserId,
                            }).execute();
                        }
                    }
                    if (payload.attachments?.length) {
                        for (const attachment of payload.attachments) {
                            const originalName = attachment.file_name || attachment.fileName;
                            if (!originalName)
                                continue;
                            const uploadedFile = files.find((file) => file.originalname === originalName);
                            const diskFileName = uploadedFile ? uploadedFile.filename : originalName;
                            await trx.insertInto('QMQA_ATTACHMENT').values({
                                qmqa_attachment_id: attachment.id || uuidv4(),
                                qmqa_id: qmqaId,
                                file_name: diskFileName || 'Unknown',
                                file_extension: diskFileName ? diskFileName.split('.').pop() : 'unknown',
                                remarks: attachment.remarks || null,
                                last_update: now,
                                updateby: effectiveUserId,
                            }).execute();
                        }
                    }
                    if (files?.length) {
                        for (const file of files) {
                            await trx.insertInto('QMQA_PLAN_ATTACHMENT').values({
                                qmqa_plan_attachment_id: uuidv4(),
                                qmqa_id: qmqaId,
                                file_name: file.filename || file.originalname,
                                file_extension: (file.originalname || '').split('.').pop() || 'unknown',
                                remarks: `(Original: ${file.originalname})`,
                                last_update: now,
                                updateby: effectiveUserId,
                            }).execute();
                        }
                    }
                    return { success: true, id: qmqaId, apid: auditPlanId };
                });
            }
            catch (error) {
                if (!this.isDuplicateControlNoError(error) || attempt === 2 || isLinkedToExistingSchedule) {
                    throw error;
                }
                minimumSequence = this.getControlNoSequence(this.extractDuplicateControlNo(error), `A-${unscheduledAuditYear}-`);
            }
        }
        throw new ConflictError('Unable to generate a unique QMQA control number.');
    }
    async updateRecord(id, payload, actor) {
        const existing = await qmqaRepository.findRecordByIdDetailed(id);
        if (!existing) {
            throw new NotFoundError('QMQA Record not found');
        }
        const actorContext = await this.resolveActorContextWithRole(actor.userId, actor.roleName);
        assertWorkflowRecordAccess({
            allowed: this.canMutateMainRecord(existing, actorContext),
            action: 'update',
            moduleName: 'QMQA',
        });
        const now = new Date();
        const resolvedAttentionId = payload.attention_id !== undefined
            ? await this.resolveAttentionId(payload.attention_id)
            : undefined;
        const qmqaUpdates = {
            last_update: now,
            updateby: actor.userId || 'SYSTEM',
        };
        if (payload.audit_type_id !== undefined)
            qmqaUpdates.audit_type_id = payload.audit_type_id;
        if (resolvedAttentionId !== undefined)
            qmqaUpdates.attention_id = resolvedAttentionId;
        if (payload.pic_auditor_id !== undefined)
            qmqaUpdates.pic_auditor_id = sanitizeUUID(payload.pic_auditor_id);
        if (payload.due_date !== undefined)
            qmqaUpdates.due_date = payload.due_date ? new Date(payload.due_date) : null;
        if (payload.audit_date !== undefined)
            qmqaUpdates.audit_date = payload.audit_date ? new Date(payload.audit_date) : null;
        if (payload.audit_rating !== undefined) {
            const rating = payload.audit_rating;
            qmqaUpdates.audit_rating = (rating === '' || rating === null || rating === undefined)
                ? null
                : Number(rating);
        }
        if (payload.auditees !== undefined)
            qmqaUpdates.auditees = payload.auditees || null;
        if (payload.auditors !== undefined)
            qmqaUpdates.auditors = payload.auditors || null;
        if (payload.attendees !== undefined)
            qmqaUpdates.attendees = payload.attendees || null;
        if (payload.remarks !== undefined)
            qmqaUpdates.remarks = payload.remarks || null;
        if (payload.checker_id !== undefined)
            qmqaUpdates.checker_id = sanitizeUUID(payload.checker_id);
        if (payload.approver_id !== undefined)
            qmqaUpdates.approver_id = sanitizeUUID(payload.approver_id);
        const planUpdates = {
            last_update: now,
            updateby: actor.userId || 'SYSTEM',
        };
        if (payload.site_id !== undefined)
            planUpdates.site_id = payload.site_id;
        if (payload.supplier_id !== undefined)
            planUpdates.supplier_id = payload.supplier_id;
        if (payload.audit_category_id !== undefined)
            planUpdates.audit_category_id = payload.audit_category_id;
        if (payload.audit_plan_date !== undefined)
            planUpdates.audit_plan_date = payload.audit_plan_date ? new Date(payload.audit_plan_date) : null;
        if (payload.sqe_pic_id !== undefined)
            planUpdates.sqe_pic_id = payload.sqe_pic_id;
        return qmqaRepository.executeTransaction(async (trx) => {
            if (Object.keys(qmqaUpdates).length > 2) {
                await trx.updateTable('QMQA')
                    .set(qmqaUpdates)
                    .where('qmqa_id', '=', id)
                    .execute();
            }
            if (Object.keys(planUpdates).length > 2) {
                await trx.updateTable('QMQA_AUDIT_PLAN')
                    .set(planUpdates)
                    .where('qmqa_audit_plan_id', '=', existing.qmqa_audit_plan_id)
                    .execute();
            }
            return { success: true, message: 'QMQA Record updated successfully' };
        });
    }
    async saveSupplierResponseContent(id, userId, payload, files = [], section = 'initial') {
        const now = new Date();
        const existingResponse = await qmqaRepository.findResponseByQmqaId(id);
        return qmqaRepository.executeTransaction(async (trx) => {
            let responseId = existingResponse?.qmqa_response_id || uuidv4();
            if (existingResponse) {
                await trx.updateTable('QMQA_RESPONSE')
                    .set({
                    skip_initial: payload.skip_initial !== undefined
                        ? (payload.skip_initial ? 1 : 0)
                        : existingResponse.skip_initial,
                    initial_report_date: section === 'initial' ? now : existingResponse.initial_report_date,
                    initial_remarks: section === 'initial'
                        ? (payload.initial_remarks ?? existingResponse.initial_remarks ?? null)
                        : existingResponse.initial_remarks,
                    final_report_date: section === 'final' ? now : existingResponse.final_report_date,
                    final_remarks: section === 'final'
                        ? (payload.final_remarks ?? existingResponse.final_remarks ?? null)
                        : existingResponse.final_remarks,
                    last_update: now,
                    updateby: userId,
                })
                    .where('qmqa_response_id', '=', responseId)
                    .execute();
            }
            else {
                await trx.insertInto('QMQA_RESPONSE').values({
                    qmqa_response_id: responseId,
                    qmqa_id: id,
                    skip_initial: payload.skip_initial ? 1 : 0,
                    initial_report_date: section === 'initial' ? now : null,
                    final_report_date: section === 'final' ? now : null,
                    initial_remarks: section === 'initial' ? payload.initial_remarks || null : null,
                    final_remarks: section === 'final' ? payload.final_remarks || null : null,
                    issuer_remarks: null,
                    issuer_date: null,
                    checker_id: null,
                    checker_remarks: null,
                    checker_date: null,
                    approver_id: null,
                    approver_remarks: null,
                    approver_date: null,
                    last_update: now,
                    updateby: userId,
                    accept_date: null,
                    remarks: null,
                    verification_remarks: null,
                }).execute();
            }
            const attachmentTable = section === 'initial'
                ? 'QMQA_RESPONSE_INITIAL'
                : 'QMQA_RESPONSE_FINAL';
            const attachmentIdColumn = section === 'initial'
                ? 'qmqa_response_initial_attachment_id'
                : 'qmqa_response_final_attachment_id';
            for (const file of files) {
                await trx.insertInto(attachmentTable).values({
                    [attachmentIdColumn]: uuidv4(),
                    qmqa_response_id: responseId,
                    file_name: file.filename || file.originalname,
                    file_extension: (file.filename || file.originalname || '').split('.').pop() || 'unknown',
                    remarks: null,
                    last_update: now,
                    updateby: userId,
                }).execute();
            }
            await trx.updateTable('QMQA')
                .set({
                last_update: now,
                updateby: userId,
            })
                .where('qmqa_id', '=', id)
                .execute();
            return {
                success: true,
                data: {
                    id,
                    responseId,
                },
                message: 'QMQA supplier response saved',
            };
        });
    }
    async saveResponseReviewContent(id, userId, payload) {
        const now = new Date();
        const existingResponse = await qmqaRepository.findResponseByQmqaId(id);
        // Sanitize empty strings to null for UUID fields
        const cleanCheckerId = sanitizeUUID(payload.cycle2_checker_id);
        const cleanApproverId = sanitizeUUID(payload.cycle2_approver_id);
        return qmqaRepository.executeTransaction(async (trx) => {
            let responseId = existingResponse?.qmqa_response_id || uuidv4();
            if (existingResponse) {
                await trx.updateTable('QMQA_RESPONSE')
                    .set({
                    issuer_date: now,
                    issuer_remarks: payload.issuer_remarks
                        ?? payload.verification_remarks
                        ?? existingResponse.issuer_remarks
                        ?? null,
                    checker_id: cleanCheckerId ?? existingResponse.checker_id ?? null,
                    checker_remarks: payload.cycle2_checker_remarks ?? existingResponse.checker_remarks ?? null,
                    approver_id: cleanApproverId ?? existingResponse.approver_id ?? null,
                    approver_remarks: payload.cycle2_approver_remarks ?? existingResponse.approver_remarks ?? null,
                    verification_remarks: payload.verification_remarks ?? existingResponse.verification_remarks ?? null,
                    last_update: now,
                    updateby: userId,
                })
                    .where('qmqa_response_id', '=', responseId)
                    .execute();
            }
            else {
                await trx.insertInto('QMQA_RESPONSE').values({
                    qmqa_response_id: responseId,
                    qmqa_id: id,
                    skip_initial: 0,
                    initial_report_date: null,
                    final_report_date: null,
                    initial_remarks: null,
                    final_remarks: null,
                    issuer_remarks: payload.issuer_remarks || payload.verification_remarks || null,
                    issuer_date: now,
                    checker_id: cleanCheckerId || null,
                    checker_remarks: payload.cycle2_checker_remarks || null,
                    checker_date: null,
                    approver_id: cleanApproverId || null,
                    approver_remarks: payload.cycle2_approver_remarks || null,
                    approver_date: null,
                    last_update: now,
                    updateby: userId,
                    accept_date: null,
                    remarks: null,
                    verification_remarks: payload.verification_remarks || null,
                }).execute();
            }
            await trx.updateTable('QMQA')
                .set({
                last_update: now,
                updateby: userId,
            })
                .where('qmqa_id', '=', id)
                .execute();
            return {
                success: true,
                data: {
                    id,
                    responseId,
                },
                message: 'QMQA response review saved',
            };
        });
    }
    async deleteSchedule(id) {
        const existing = await qmqaRepository.findScheduleById(id);
        if (!existing) {
            throw new NotFoundError('Schedule not found');
        }
        return qmqaRepository.executeTransaction(async (trx) => {
            await trx.deleteFrom('QMQA_AUDIT_PLAN')
                .where('qmqa_audit_plan_id', '=', id)
                .execute();
            return { success: true, message: 'Schedule deleted successfully' };
        });
    }
    async deleteRecord(id, actor) {
        const existing = await qmqaRepository.findRecordByIdDetailed(id);
        if (!existing) {
            throw new NotFoundError('QMQA Record not found');
        }
        const actorContext = await this.resolveActorContextWithRole(actor?.userId, actor?.roleName);
        assertWorkflowRecordAccess({
            allowed: this.canMutateMainRecord(existing, actorContext),
            action: 'delete',
            moduleName: 'QMQA',
        });
        return qmqaRepository.executeTransaction(async (trx) => {
            const response = await qmqaRepository.findResponseByQmqaId(id);
            if (response) {
                await trx.deleteFrom('QMQA_RESPONSE_INITIAL')
                    .where('qmqa_response_id', '=', response.qmqa_response_id)
                    .execute();
                await trx.deleteFrom('QMQA_RESPONSE_FINAL')
                    .where('qmqa_response_id', '=', response.qmqa_response_id)
                    .execute();
                await trx.deleteFrom('QMQA_RESPONSE_VERIFICATION')
                    .where('qmqa_response_id', '=', response.qmqa_response_id)
                    .execute();
                await trx.deleteFrom('QMQA_RESPONSE')
                    .where('qmqa_id', '=', id)
                    .execute();
            }
            await trx.deleteFrom('QMQA_PLAN_ATTACHMENT').where('qmqa_id', '=', id).execute();
            await trx.deleteFrom('QMQA_CC').where('qmqa_id', '=', id).execute();
            await trx.deleteFrom('QMQA_ATTACHMENT').where('qmqa_id', '=', id).execute();
            await trx.deleteFrom('QMQA_NC').where('qmqa_id', '=', id).execute();
            await trx.deleteFrom('QMQA_SCORE').where('qmqa_id', '=', id).execute();
            await trx.deleteFrom('QMQA').where('qmqa_id', '=', id).execute();
            return { success: true, message: 'QMQA Record deleted successfully' };
        });
    }
}
export const qmqaService = new QmqaService();
