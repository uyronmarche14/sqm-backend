import { v4 as uuidv4 } from 'uuid';
import { qmqaRepository } from './qmqa.repository.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { mapStatusFromDB, mapStatusToDB } from '../../shared/utils/status-mapper.js';
import { db } from '../../shared/infrastructure/db.js';
// Helper to treat empty strings or undefined as null for pure UUID columns
const sanitizeUUID = (val) => {
    return val && val.trim() !== '' ? val : null;
};
export class QmqaService {
    // ==========================================
    // SCHEDULES (Audit Plan)
    // ==========================================
    async generateControlNo(year, isSchedule = false) {
        const prefix = isSchedule ? `P-${year}-` : `A-${year}-`;
        const lastSeq = await qmqaRepository.getNextSequence(prefix);
        let nextNum = 1;
        if (lastSeq) {
            const parts = lastSeq.split('-');
            const numPart = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(numPart)) {
                nextNum = numPart + 1;
            }
        }
        return `${prefix}${nextNum.toString().padStart(4, '0')}`;
    }
    async getAllSchedules() {
        const schedules = await qmqaRepository.findAllSchedules();
        return schedules.map((s) => ({
            ...s,
            status: mapStatusFromDB(s.request_status),
            recordId: s.record_id || null,
            recordStatus: s.record_status ? mapStatusFromDB(s.record_status) : null,
            created_at: s.created_date,
        }));
    }
    async getScheduleById(id) {
        const s = await qmqaRepository.findScheduleById(id);
        if (!s)
            throw new NotFoundError('Schedule not found');
        return {
            ...s,
            status: mapStatusFromDB(s.request_status),
            recordId: s.record_id || null,
            recordStatus: s.record_status ? mapStatusFromDB(s.record_status) : null,
            created_at: s.created_date,
        };
    }
    async createSchedule(payload, userId) {
        const id = uuidv4();
        const now = new Date();
        const effectiveUserId = userId || 'SYSTEM';
        const year = new Date(payload.audit_plan_date).getFullYear();
        const controlNo = await this.generateControlNo(year, true);
        const dbPayload = {
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
            updateby: effectiveUserId
        };
        return await qmqaRepository.executeTransaction(async (trx) => {
            await trx.insertInto('QMQA_AUDIT_PLAN').values(dbPayload).execute();
            return { success: true, id, controlNo, message: 'Schedule created' };
        });
    }
    async updateSchedule(id, payload, userId) {
        const existing = await qmqaRepository.findScheduleById(id);
        if (!existing)
            throw new NotFoundError('Schedule not found');
        const effectiveUserId = userId || 'SYSTEM';
        const dbUpdates = {
            last_update: new Date(),
            updateby: effectiveUserId
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
        return await qmqaRepository.executeTransaction(async (trx) => {
            await trx.updateTable('QMQA_AUDIT_PLAN')
                .set(dbUpdates)
                .where('qmqa_audit_plan_id', '=', id)
                .execute();
            return { success: true, message: 'Schedule updated' };
        });
    }
    // ==========================================
    // RECORDS (Audit Execution)
    // ==========================================
    async getAllRecords(filters) {
        let mappedStatus;
        if (filters?.status) {
            if (filters.status.includes(',')) {
                mappedStatus = filters.status.split(',').map(s => mapStatusToDB(s.trim()));
            }
            else if (filters.status.toUpperCase() === 'AWAITING_APPROVAL') {
                mappedStatus = ['AA', 'CK']; // Awaiting Approval tab shows both unchecked and checked (pending final approval)
            }
            else {
                mappedStatus = mapStatusToDB(filters.status);
            }
        }
        const records = await qmqaRepository.findAllRecordsDetailed({ mappedStatus });
        return records.map((r) => ({
            ...r,
            status: mapStatusFromDB(r.request_status),
            created_at: r.created_date,
        }));
    }
    async getRecordById(id) {
        const data = await qmqaRepository.findRecordByIdDetailed(id);
        if (!data)
            throw new NotFoundError('QMQA Record not found');
        const qmqaId = data.qmqa_id;
        // Fetch child arrays
        const planAttachments = await qmqaRepository.findPlanAttachments(qmqaId);
        const attachments = await qmqaRepository.findAttachments(qmqaId);
        const ccList = await qmqaRepository.findCcList(qmqaId);
        // Fetch response data + its child attachments
        const response = await qmqaRepository.findResponseByQmqaId(qmqaId);
        let responseInitialAttachments = [];
        let responseFinalAttachments = [];
        let responseVerificationAttachments = [];
        if (response) {
            responseInitialAttachments = await qmqaRepository.findResponseInitialAttachments(response.qmqa_response_id);
            responseFinalAttachments = await qmqaRepository.findResponseFinalAttachments(response.qmqa_response_id);
            responseVerificationAttachments = await qmqaRepository.findResponseVerificationAttachments(response.qmqa_response_id);
        }
        return {
            ...data,
            status: mapStatusFromDB(data.request_status),
            created_at: data.created_date,
            // Child arrays
            audit_plan_attachments: planAttachments,
            attachments,
            cc_list: ccList,
            // Response section
            response: response || null,
            response_initial_attachments: responseInitialAttachments,
            response_final_attachments: responseFinalAttachments,
            response_verification_attachments: responseVerificationAttachments,
        };
    }
    async createRecord(payload, userId, files = []) {
        const now = new Date();
        const effectiveUserId = userId || 'SYSTEM';
        const qmqaId = uuidv4();
        return await qmqaRepository.executeTransaction(async (trx) => {
            let apid = payload.schedule_id;
            // Ensure Audit Plan exists
            if (!payload.from_schedule || !apid) {
                apid = uuidv4();
                const year = new Date(payload.audit_date).getFullYear();
                const controlNo = await this.generateControlNo(year, false);
                await trx.insertInto('QMQA_AUDIT_PLAN').values({
                    qmqa_audit_plan_id: apid,
                    control_no: controlNo,
                    created_date: now,
                    site_id: payload.site_id,
                    supplier_id: payload.supplier_id,
                    audit_category_id: payload.audit_category_id,
                    audit_plan_date: payload.audit_plan_date || now,
                    sqe_pic_id: payload.sqe_pic_id,
                    remarks: null,
                    request_status: 'CO', // Completed since it bypasses planning
                    last_update: now,
                    updateby: effectiveUserId
                }).execute();
            }
            else {
                // Update schedule to COMPLETED
                await trx.updateTable('QMQA_AUDIT_PLAN')
                    .set({ request_status: 'CO', last_update: now, updateby: effectiveUserId })
                    .where('qmqa_audit_plan_id', '=', apid)
                    .execute();
            }
            // Sanitize user FK fields — empty strings must be null, not ''
            const sanitizeUUID = (val) => {
                if (!val || val.trim() === '')
                    return null;
                return val;
            };
            const cleanAttentionId = sanitizeUUID(payload.attention_id);
            const cleanPicAuditorId = sanitizeUUID(payload.pic_auditor_id);
            const cleanCheckerId = sanitizeUUID(payload.checker_id);
            const cleanApproverId = sanitizeUUID(payload.approver_id);
            // Resolve attention_id: Frontend sends SUPPLIERSUSER.Id (junction table PK),
            // but QMQA.attention_id FK expects USERS.user_id.
            let resolvedAttentionId = cleanAttentionId;
            if (cleanAttentionId) {
                const supplierUser = await trx.selectFrom('SUPPLIERSUSER')
                    .select('user_id')
                    .where('Id', '=', cleanAttentionId)
                    .executeTakeFirst();
                if (supplierUser) {
                    resolvedAttentionId = supplierUser.user_id;
                    console.log(`[QMQA] Resolved attention_id: SUPPLIERSUSER(${cleanAttentionId}) → USERS(${resolvedAttentionId})`);
                }
                else {
                    // Maybe it's already a user_id, try using it directly
                    console.log(`[QMQA] attention_id "${cleanAttentionId}" not found in SUPPLIERSUSER, using as-is`);
                }
            }
            await trx.insertInto('QMQA').values({
                qmqa_id: qmqaId,
                qmqa_audit_plan_id: apid,
                created_date: now,
                audit_type_id: payload.audit_type_id,
                attention_id: resolvedAttentionId,
                pic_auditor_id: cleanPicAuditorId,
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
                checker_id: cleanCheckerId,
                checker_remarks: null,
                checker_date: null,
                approver_id: cleanApproverId,
                approver_remarks: null,
                approver_date: null,
                request_status: 'DR',
                last_update: now,
                updateby: effectiveUserId
            }).execute();
            // CC List
            if (payload.cc_list && payload.cc_list.length > 0) {
                for (const cc of payload.cc_list) {
                    await trx.insertInto('QMQA_CC').values({
                        qmqa_cc_id: uuidv4(),
                        qmqa_id: qmqaId,
                        user_id: cc.user_id,
                        last_update: now,
                        updateby: effectiveUserId
                    }).execute();
                }
            }
            // Attachments
            if (payload.attachments && payload.attachments.length > 0) {
                for (const att of payload.attachments) {
                    const originalName = att.file_name || att.fileName;
                    if (!originalName)
                        continue;
                    const uploadedFile = files.find(f => f.originalname === originalName);
                    const diskFileName = uploadedFile ? uploadedFile.filename : originalName;
                    await trx.insertInto('QMQA_ATTACHMENT').values({
                        qmqa_attachment_id: att.id || uuidv4(),
                        qmqa_id: qmqaId,
                        file_name: diskFileName || 'Unknown',
                        file_extension: diskFileName ? diskFileName.split('.').pop() : 'unknown',
                        remarks: att.remarks || null,
                        last_update: now,
                        updateby: effectiveUserId
                    }).execute();
                }
            }
            // Plan Attachments (uploaded via multer files)
            // Files uploaded with fieldname 'planAttachment' or similar go to QMQA_PLAN_ATTACHMENT
            if (files && files.length > 0) {
                for (const file of files) {
                    await trx.insertInto('QMQA_PLAN_ATTACHMENT').values({
                        qmqa_plan_attachment_id: uuidv4(),
                        qmqa_id: qmqaId,
                        file_name: file.filename || file.originalname,
                        file_extension: (file.originalname || '').split('.').pop() || 'unknown',
                        remarks: `(Original: ${file.originalname})`,
                        last_update: now,
                        updateby: effectiveUserId
                    }).execute();
                }
            }
            return { success: true, id: qmqaId, apid };
        });
    }
    async updateRecord(id, payload, userId) {
        const effectiveUserId = userId || 'SYSTEM';
        const now = new Date();
        const currentRecord = await qmqaRepository.findRecordByIdDetailed(id);
        if (!currentRecord)
            throw new NotFoundError('QMQA Record not found');
        const apid = currentRecord.qmqa_audit_plan_id;
        // Resolve attention_id if provided
        let resolvedAttentionId = undefined;
        if (payload.attention_id !== undefined) {
            if (payload.attention_id) {
                const cleanAttentionId = sanitizeUUID(payload.attention_id);
                const supplierUser = await db.selectFrom('SUPPLIERSUSER')
                    .select('user_id')
                    .where('Id', '=', cleanAttentionId || '')
                    .executeTakeFirst();
                resolvedAttentionId = supplierUser ? supplierUser.user_id : cleanAttentionId;
            }
            else {
                resolvedAttentionId = null;
            }
        }
        const qmqaUpdates = {
            last_update: now,
            updateby: effectiveUserId
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
        if (payload.audit_rating !== undefined)
            qmqaUpdates.audit_rating = payload.audit_rating ?? null;
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
            updateby: effectiveUserId
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
        return await qmqaRepository.executeTransaction(async (trx) => {
            // 1. Update QMQA Record
            if (Object.keys(qmqaUpdates).length > 2) {
                await trx.updateTable('QMQA')
                    .set(qmqaUpdates)
                    .where('qmqa_id', '=', id)
                    .execute();
            }
            // 2. Update QMQA Audit Plan
            if (Object.keys(planUpdates).length > 2 && apid) {
                await trx.updateTable('QMQA_AUDIT_PLAN')
                    .set(planUpdates)
                    .where('qmqa_audit_plan_id', '=', apid)
                    .execute();
            }
            // Arrays (cc_list and attachments) could be synchronized here if needed,
            // but typically we might just append attachments or leave it for a separate sync block.
            // For now we just implement the main record updates to fix the bug.
            return { success: true, message: 'QMQA Record updated successfully' };
        });
    }
    // ==========================================
    // WORKFLOW ACTIONS
    // ==========================================
    /** Smart Submit: DRAFT → AA, WITH_INITIAL_REPORT → WITH_FINAL_REPORT, WITH_FINAL_REPORT → RA */
    async submit(id, userId) {
        const record = await qmqaRepository.findRecordByIdDetailed(id);
        if (!record)
            throw new NotFoundError('QMQA Record not found');
        const currentStatus = mapStatusFromDB(record.request_status);
        const validStatuses = ['DRAFT', 'REJECTED', 'ISSUED', 'WITH_INITIAL_REPORT', 'WITH_FINAL_REPORT'];
        if (!validStatuses.includes(currentStatus)) {
            throw new Error(`Cannot submit: record is in ${currentStatus}, expected one of ${validStatuses.join(', ')}`);
        }
        const now = new Date();
        return await qmqaRepository.executeTransaction(async (trx) => {
            let nextStatus = 'AAPPROVAL';
            if (currentStatus === 'ISSUED') {
                nextStatus = 'WITH_INITIAL_REPORT';
            }
            else if (currentStatus === 'WITH_INITIAL_REPORT') {
                nextStatus = 'WITH_FINAL_REPORT';
            }
            else if (currentStatus === 'WITH_FINAL_REPORT') {
                nextStatus = 'RESPONSE_AWAIT_APPROVAL';
            }
            await trx.updateTable('QMQA')
                .set({
                request_status: mapStatusToDB(nextStatus),
                last_update: now,
                updateby: userId
            })
                .where('qmqa_id', '=', id)
                .execute();
            return { success: true, message: `Record submitted successfully to ${nextStatus}` };
        });
    }
    /** AWAITING_APPROVAL → AWAITING_APPROVAL (Check step) OR RESPONSE_AWAIT_APPROVAL (Cycle 2 check) */
    async check(id, userId, remarks) {
        const record = await qmqaRepository.findRecordByIdDetailed(id);
        if (!record)
            throw new NotFoundError('QMQA Record not found');
        const currentStatus = mapStatusFromDB(record.request_status);
        if (currentStatus !== 'AAPPROVAL' && currentStatus !== 'AWAITING_APPROVAL' && currentStatus !== 'RESPONSE_AWAIT_APPROVAL') {
            throw new Error(`Cannot check: record is in ${currentStatus}, expected AWAITING_APPROVAL or RESPONSE_AWAIT_APPROVAL`);
        }
        const now = new Date();
        return await qmqaRepository.executeTransaction(async (trx) => {
            if (currentStatus === 'AAPPROVAL' || currentStatus === 'AWAITING_APPROVAL') {
                // Cycle 1 Check
                await trx.updateTable('QMQA')
                    .set({
                    request_status: mapStatusToDB('CHECKED'),
                    checker_id: userId,
                    checker_remarks: remarks || null,
                    checker_date: now,
                    last_update: now,
                    updateby: userId
                })
                    .where('qmqa_id', '=', id)
                    .execute();
            }
            else if (currentStatus === 'RESPONSE_AWAIT_APPROVAL') {
                // Cycle 2 Check: Update QMQA_RESPONSE table, keep status as RESPONSE_AWAIT_APPROVAL
                const response = await qmqaRepository.findResponseByQmqaId(id);
                if (response) {
                    await trx.updateTable('QMQA_RESPONSE')
                        .set({
                        checker_id: userId,
                        checker_remarks: remarks || null,
                        checker_date: now,
                        last_update: now,
                        updateby: userId
                    })
                        .where('qmqa_response_id', '=', response.qmqa_response_id)
                        .execute();
                }
                await trx.updateTable('QMQA')
                    .set({
                    last_update: now,
                    updateby: userId
                })
                    .where('qmqa_id', '=', id)
                    .execute();
            }
            return { success: true, message: 'Record checked' };
        });
    }
    /** AWAITING_APPROVAL → APPROVED (AP) OR RESPONSE_AWAIT_APPROVAL → CLOSED */
    async approve(id, userId, remarks) {
        const record = await qmqaRepository.findRecordByIdDetailed(id);
        if (!record)
            throw new NotFoundError('QMQA Record not found');
        const currentStatus = mapStatusFromDB(record.request_status);
        if (currentStatus !== 'AAPPROVAL' && currentStatus !== 'AWAITING_APPROVAL' && currentStatus !== 'CHECKED' && currentStatus !== 'RESPONSE_AWAIT_APPROVAL') {
            throw new Error(`Cannot approve: record is in ${currentStatus}, expected AWAITING_APPROVAL, CHECKED, or RESPONSE_AWAIT_APPROVAL`);
        }
        const now = new Date();
        return await qmqaRepository.executeTransaction(async (trx) => {
            if (currentStatus === 'RESPONSE_AWAIT_APPROVAL') {
                // Cycle 2 Approve -> CLOSED
                const response = await qmqaRepository.findResponseByQmqaId(id);
                if (response) {
                    await trx.updateTable('QMQA_RESPONSE')
                        .set({
                        approver_id: userId,
                        approver_remarks: remarks || null,
                        approver_date: now,
                        last_update: now,
                        updateby: userId
                    })
                        .where('qmqa_response_id', '=', response.qmqa_response_id)
                        .execute();
                }
                await trx.updateTable('QMQA')
                    .set({
                    request_status: mapStatusToDB('CLOSED'),
                    last_update: now,
                    updateby: userId
                })
                    .where('qmqa_id', '=', id)
                    .execute();
                return { success: true, message: 'Response approved, record CLOSED' };
            }
            // Cycle 1 Approve -> APPROVED
            await trx.updateTable('QMQA')
                .set({
                request_status: mapStatusToDB('APPROVED'),
                approver_id: userId,
                approver_remarks: remarks || null,
                approver_date: now,
                last_update: now,
                updateby: userId
            })
                .where('qmqa_id', '=', id)
                .execute();
            return { success: true, message: 'Record approved' };
        });
    }
    /** AWAITING_APPROVAL → DRAFT OR RESPONSE_AWAIT_APPROVAL → RESPONSE_REJECTED */
    async reject(id, userId, remarks) {
        const record = await qmqaRepository.findRecordByIdDetailed(id);
        if (!record)
            throw new NotFoundError('QMQA Record not found');
        const currentStatus = mapStatusFromDB(record.request_status);
        if (currentStatus !== 'AAPPROVAL' && currentStatus !== 'AWAITING_APPROVAL' && currentStatus !== 'CHECKED' && currentStatus !== 'RESPONSE_AWAIT_APPROVAL') {
            throw new Error(`Cannot reject: record is in ${currentStatus}, expected AWAITING_APPROVAL, CHECKED, or RESPONSE_AWAIT_APPROVAL`);
        }
        const now = new Date();
        return await qmqaRepository.executeTransaction(async (trx) => {
            if (currentStatus === 'RESPONSE_AWAIT_APPROVAL') {
                const response = await qmqaRepository.findResponseByQmqaId(id);
                if (response) {
                    await trx.updateTable('QMQA_RESPONSE')
                        .set({
                        checker_remarks: remarks || response.checker_remarks, // store rejection reason
                        last_update: now,
                        updateby: userId
                    })
                        .where('qmqa_response_id', '=', response.qmqa_response_id)
                        .execute();
                }
                await trx.updateTable('QMQA')
                    .set({
                    request_status: mapStatusToDB('RESPONSE_REJECTED'),
                    last_update: now,
                    updateby: userId
                })
                    .where('qmqa_id', '=', id)
                    .execute();
                return { success: true, message: 'Response rejected and returned to supplier' };
            }
            // Cycle 1 Reject
            await trx.updateTable('QMQA')
                .set({
                request_status: mapStatusToDB('DRAFT'),
                checker_remarks: remarks || null,
                last_update: now,
                updateby: userId
            })
                .where('qmqa_id', '=', id)
                .execute();
            return { success: true, message: 'Record rejected and returned to draft' };
        });
    }
    /** APPROVED → ISSUED (IS) */
    async issue(id, userId) {
        const record = await qmqaRepository.findRecordByIdDetailed(id);
        if (!record)
            throw new NotFoundError('QMQA Record not found');
        const currentStatus = mapStatusFromDB(record.request_status);
        if (currentStatus !== 'APPROVED') {
            throw new Error(`Cannot issue: record is in ${currentStatus}, expected APPROVED`);
        }
        const now = new Date();
        return await qmqaRepository.executeTransaction(async (trx) => {
            await trx.updateTable('QMQA')
                .set({
                request_status: mapStatusToDB('ISSUED'),
                issuer_id: userId,
                issuer_date: now,
                issued_date: now,
                last_update: now,
                updateby: userId
            })
                .where('qmqa_id', '=', id)
                .execute();
            return { success: true, message: 'Record issued successfully' };
        });
    }
    /** ISSUED → CANCELLED (CA) */
    async cancel(id, userId) {
        const record = await qmqaRepository.findRecordByIdDetailed(id);
        if (!record)
            throw new NotFoundError('QMQA Record not found');
        const currentStatus = mapStatusFromDB(record.request_status);
        if (currentStatus !== 'ISSUED') {
            throw new Error(`Cannot cancel: record is in ${currentStatus}, expected ISSUED`);
        }
        return await qmqaRepository.executeTransaction(async (trx) => {
            await trx.updateTable('QMQA')
                .set({
                request_status: mapStatusToDB('CANCEL'),
                last_update: new Date(),
                updateby: userId
            })
                .where('qmqa_id', '=', id)
                .execute();
            return { success: true, message: 'Record cancelled' };
        });
    }
    /**
     * Delete a schedule (Audit Plan)
     */
    async deleteSchedule(id) {
        const existing = await qmqaRepository.findScheduleById(id);
        if (!existing)
            throw new NotFoundError('Schedule not found');
        return await qmqaRepository.executeTransaction(async (trx) => {
            await trx.deleteFrom('QMQA_AUDIT_PLAN')
                .where('qmqa_audit_plan_id', '=', id)
                .execute();
            return { success: true, message: 'Schedule deleted successfully' };
        });
    }
    /**
     * Delete a QMQA record and all child data
     */
    async deleteRecord(id) {
        const existing = await qmqaRepository.findRecordByIdDetailed(id);
        if (!existing)
            throw new NotFoundError('QMQA Record not found');
        return await qmqaRepository.executeTransaction(async (trx) => {
            // Delete response child data first
            const response = await qmqaRepository.findResponseByQmqaId(id);
            if (response) {
                await trx.deleteFrom('QMQA_RESPONSE_INITIAL').where('qmqa_response_id', '=', response.qmqa_response_id).execute();
                await trx.deleteFrom('QMQA_RESPONSE_FINAL').where('qmqa_response_id', '=', response.qmqa_response_id).execute();
                await trx.deleteFrom('QMQA_RESPONSE_VERIFICATION').where('qmqa_response_id', '=', response.qmqa_response_id).execute();
                await trx.deleteFrom('QMQA_RESPONSE').where('qmqa_id', '=', id).execute();
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
    // ==========================================
    // SUPPLIER RESPONSE (Initial & Final Reports)
    // ==========================================
    /**
     * Save Initial Report or Skip Initial
     * ISSUED (IS) → WITH_INITIAL_REPORT (WI)
     */
    async saveInitialReport(id, userId, payload, files = []) {
        const record = await qmqaRepository.findRecordByIdDetailed(id);
        if (!record)
            throw new NotFoundError('QMQA Record not found');
        const currentStatus = mapStatusFromDB(record.request_status);
        if (currentStatus !== 'ISSUED') {
            throw new Error(`Cannot save initial report: record is in ${currentStatus}, expected ISSUED`);
        }
        const now = new Date();
        return await qmqaRepository.executeTransaction(async (trx) => {
            // Upsert QMQA_RESPONSE row
            const existingResponse = await qmqaRepository.findResponseByQmqaId(id);
            let responseId;
            if (existingResponse) {
                responseId = existingResponse.qmqa_response_id;
                await trx.updateTable('QMQA_RESPONSE')
                    .set({
                    skip_initial: payload.skip_initial ? 1 : 0,
                    initial_report_date: now,
                    initial_remarks: payload.initial_remarks || null,
                    last_update: now,
                    updateby: userId
                })
                    .where('qmqa_response_id', '=', responseId)
                    .execute();
            }
            else {
                responseId = uuidv4();
                await trx.insertInto('QMQA_RESPONSE').values({
                    qmqa_response_id: responseId,
                    qmqa_id: id,
                    skip_initial: payload.skip_initial ? 1 : 0,
                    initial_report_date: now,
                    initial_remarks: payload.initial_remarks || null,
                    final_report_date: null,
                    final_remarks: null,
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
                    verification_remarks: null
                }).execute();
            }
            // Save initial report attachment files
            for (const file of files) {
                await trx.insertInto('QMQA_RESPONSE_INITIAL').values({
                    qmqa_response_initial_attachment_id: uuidv4(),
                    qmqa_response_id: responseId,
                    file_name: file.filename || file.originalname,
                    file_extension: (file.filename || file.originalname || '').split('.').pop() || 'unknown',
                    remarks: null,
                    last_update: now,
                    updateby: userId
                }).execute();
            }
            // Transition status ONLY if is_submit is true
            if (payload.is_submit) {
                await trx.updateTable('QMQA')
                    .set({
                    request_status: mapStatusToDB('WITH_INITIAL_REPORT'),
                    last_update: now,
                    updateby: userId
                })
                    .where('qmqa_id', '=', id)
                    .execute();
            }
            else {
                await trx.updateTable('QMQA')
                    .set({
                    last_update: now,
                    updateby: userId
                })
                    .where('qmqa_id', '=', id)
                    .execute();
            }
            return { success: true, message: payload.is_submit ? 'Initial report submitted successfully' : 'Initial report saved successfully' };
        });
    }
    /**
     * Submit Final Report
     * WITH_INITIAL_REPORT (WI) or ISSUED (IS, if skip initial) → WITH_FINAL_REPORT (WF)
     */
    async submitFinalReport(id, userId, payload, files = []) {
        const record = await qmqaRepository.findRecordByIdDetailed(id);
        if (!record)
            throw new NotFoundError('QMQA Record not found');
        const currentStatus = mapStatusFromDB(record.request_status);
        const validStatuses = ['WITH_INITIAL_REPORT', 'ISSUED'];
        if (!validStatuses.includes(currentStatus)) {
            throw new Error(`Cannot submit final report: record is in ${currentStatus}, expected WITH_INITIAL_REPORT or ISSUED`);
        }
        const now = new Date();
        return await qmqaRepository.executeTransaction(async (trx) => {
            // Ensure QMQA_RESPONSE row exists
            const existingResponse = await qmqaRepository.findResponseByQmqaId(id);
            let responseId;
            if (existingResponse) {
                responseId = existingResponse.qmqa_response_id;
                await trx.updateTable('QMQA_RESPONSE')
                    .set({
                    final_report_date: now,
                    final_remarks: payload.final_remarks || null,
                    last_update: now,
                    updateby: userId
                })
                    .where('qmqa_response_id', '=', responseId)
                    .execute();
            }
            else {
                // Edge case: supplier skipped initial and goes straight to final
                responseId = uuidv4();
                await trx.insertInto('QMQA_RESPONSE').values({
                    qmqa_response_id: responseId,
                    qmqa_id: id,
                    skip_initial: 1,
                    initial_report_date: null,
                    initial_remarks: null,
                    final_report_date: now,
                    final_remarks: payload.final_remarks || null,
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
                    verification_remarks: null
                }).execute();
            }
            // Save final report attachment files
            for (const file of files) {
                await trx.insertInto('QMQA_RESPONSE_FINAL').values({
                    qmqa_response_final_attachment_id: uuidv4(),
                    qmqa_response_id: responseId,
                    file_name: file.filename || file.originalname,
                    file_extension: (file.filename || file.originalname || '').split('.').pop() || 'unknown',
                    remarks: null,
                    last_update: now,
                    updateby: userId
                }).execute();
            }
            // Transition status: → WITH_FINAL_REPORT ONLY if is_submit is true
            if (payload.is_submit) {
                await trx.updateTable('QMQA')
                    .set({
                    request_status: mapStatusToDB('WITH_FINAL_REPORT'),
                    last_update: now,
                    updateby: userId
                })
                    .where('qmqa_id', '=', id)
                    .execute();
            }
            else {
                await trx.updateTable('QMQA')
                    .set({
                    last_update: now,
                    updateby: userId
                })
                    .where('qmqa_id', '=', id)
                    .execute();
            }
            return { success: true, message: payload.is_submit ? 'Final report submitted successfully' : 'Final report saved successfully' };
        });
    }
    /**
     * Verification endpoint with Cycle 2 approval fields
     */
    async verify(id, userId, payload) {
        const record = await qmqaRepository.findRecordByIdDetailed(id);
        if (!record)
            throw new NotFoundError('QMQA Record not found');
        const now = new Date();
        return await qmqaRepository.executeTransaction(async (trx) => {
            await trx.updateTable('QMQA')
                .set({
                request_status: mapStatusToDB('RESPONSE_AWAIT_APPROVAL'),
                verification_remarks: payload.verification_remarks || null,
                last_update: now,
                updateby: userId
            })
                .where('qmqa_id', '=', id)
                .execute();
            // Update QMQA_RESPONSE with Cycle 2 approval info
            await trx.updateTable('QMQA_RESPONSE')
                .set({
                verification_remarks: payload.verification_remarks || null,
                checker_id: payload.cycle2_checker_id || null,
                checker_remarks: payload.cycle2_checker_remarks || null,
                approver_id: payload.cycle2_approver_id || null,
                approver_remarks: payload.cycle2_approver_remarks || null,
                last_update: now,
                updateby: userId
            })
                .where('qmqa_id', '=', id)
                .execute();
            return { success: true, message: 'Record verified with Cycle 2 approval' };
        });
    }
}
export const qmqaService = new QmqaService();
