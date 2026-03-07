// @ts-ignore
import { db } from '../../shared/infrastructure/db.js';
import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';
export class QmqaRepository extends BaseRepository {
    constructor() {
        super('QMQA');
    }
    // ==========================================
    // 1. SCHEDULES (Audit Plan)
    // ==========================================
    async findAllSchedules() {
        return await db.selectFrom('QMQA_AUDIT_PLAN as ap')
            .leftJoin('MFG_SITES as site', 'ap.site_id', 'site.site_id')
            .leftJoin('SUPPLIERS as supp', 'ap.supplier_id', 'supp.supplier_id')
            .leftJoin('AUDITCATEGORY as cat', 'ap.audit_category_id', 'cat.audit_category_id')
            .leftJoin('USERS as sqe', 'ap.sqe_pic_id', 'sqe.user_id')
            .leftJoin('QMQA as q', 'ap.qmqa_audit_plan_id', 'q.qmqa_audit_plan_id')
            .selectAll('ap')
            .select([
            'site.site_name',
            'supp.supplier_name',
            'cat.audit_category_name as category_name',
            'sqe.full_name as sqe_pic_name',
            'q.qmqa_id as record_id',
            'q.request_status as record_status'
        ])
            .orderBy('ap.audit_plan_date', 'desc')
            .orderBy('ap.created_date', 'desc')
            .execute();
    }
    async findScheduleById(id) {
        return await db.selectFrom('QMQA_AUDIT_PLAN as ap')
            .leftJoin('MFG_SITES as site', 'ap.site_id', 'site.site_id')
            .leftJoin('SUPPLIERS as supp', 'ap.supplier_id', 'supp.supplier_id')
            .leftJoin('AUDITCATEGORY as cat', 'ap.audit_category_id', 'cat.audit_category_id')
            .leftJoin('USERS as sqe', 'ap.sqe_pic_id', 'sqe.user_id')
            .leftJoin('QMQA as q', 'ap.qmqa_audit_plan_id', 'q.qmqa_audit_plan_id')
            .selectAll('ap')
            .select([
            'site.site_name',
            'supp.supplier_name',
            'cat.audit_category_name as category_name',
            'sqe.full_name as sqe_pic_name',
            'q.qmqa_id as record_id',
            'q.request_status as record_status'
        ])
            .where('ap.qmqa_audit_plan_id', '=', id)
            .executeTakeFirst();
    }
    // ==========================================
    // 2. RECORDS (Audit Execution)
    // ==========================================
    async findAllRecordsDetailed(filters) {
        let query = db.selectFrom('QMQA as q')
            .innerJoin('QMQA_AUDIT_PLAN as ap', 'q.qmqa_audit_plan_id', 'ap.qmqa_audit_plan_id')
            .leftJoin('MFG_SITES as site', 'ap.site_id', 'site.site_id')
            .leftJoin('SUPPLIERS as supp', 'ap.supplier_id', 'supp.supplier_id')
            .leftJoin('AUDITCATEGORY as cat', 'ap.audit_category_id', 'cat.audit_category_id')
            .leftJoin('USERS as sqe', 'ap.sqe_pic_id', 'sqe.user_id')
            .leftJoin('AUDITTYPE as at', 'q.audit_type_id', 'at.audit_type_id')
            .leftJoin('USERS as enc', 'q.encoder_id', 'enc.user_id')
            .leftJoin('USERS as iss', 'q.issuer_id', 'iss.user_id')
            .leftJoin('USERS as chk', 'q.checker_id', 'chk.user_id')
            .leftJoin('USERS as app', 'q.approver_id', 'app.user_id')
            .select([
            'q.qmqa_id',
            'q.created_date',
            'q.audit_date',
            'q.issued_date',
            'q.due_date',
            'q.audit_rating',
            'q.request_status',
            'q.last_update',
            'ap.qmqa_audit_plan_id',
            'ap.control_no',
            'ap.audit_plan_date',
            'ap.site_id',
            'site.site_name',
            'ap.supplier_id',
            'supp.supplier_name',
            'ap.audit_category_id',
            'cat.audit_category_name as category_name',
            'ap.sqe_pic_id',
            'sqe.full_name as sqe_pic_name',
            'q.audit_type_id',
            'at.audit_type_name',
            'q.encoder_id',
            'enc.full_name as encoder_name',
            'q.issuer_id',
            'iss.full_name as issuer_name',
            'q.checker_id',
            'chk.full_name as checker_name',
            'q.approver_id',
            'app.full_name as approver_name'
        ]);
        if (filters?.mappedStatus) {
            if (Array.isArray(filters.mappedStatus)) {
                query = query.where('q.request_status', 'in', filters.mappedStatus);
            }
            else {
                query = query.where('q.request_status', '=', filters.mappedStatus);
            }
        }
        return await query
            .orderBy('q.created_date', 'desc')
            .orderBy('ap.audit_plan_date', 'desc')
            .execute();
    }
    async findRecordByIdDetailed(idOrControlNo) {
        return await db.selectFrom('QMQA as q')
            .innerJoin('QMQA_AUDIT_PLAN as ap', 'q.qmqa_audit_plan_id', 'ap.qmqa_audit_plan_id')
            .leftJoin('MFG_SITES as site', 'ap.site_id', 'site.site_id')
            .leftJoin('SUPPLIERS as supp', 'ap.supplier_id', 'supp.supplier_id')
            .leftJoin('AUDITCATEGORY as cat', 'ap.audit_category_id', 'cat.audit_category_id')
            .leftJoin('USERS as sqe', 'ap.sqe_pic_id', 'sqe.user_id')
            .leftJoin('AUDITTYPE as at', 'q.audit_type_id', 'at.audit_type_id')
            // Attention ID maps to SUPPLIERSUSER which maps to USERS
            // For simplicity if standard, joining directly for now 
            // Assuming attention_id might directly relate to user_id or requires a double join.
            // We will perform basic fetch for now.
            .leftJoin('USERS as att', 'q.attention_id', 'att.user_id')
            .leftJoin('USERS as pic', 'q.pic_auditor_id', 'pic.user_id')
            .leftJoin('USERS as enc', 'q.encoder_id', 'enc.user_id')
            .leftJoin('USERS as iss', 'q.issuer_id', 'iss.user_id')
            .leftJoin('USERS as chk', 'q.checker_id', 'chk.user_id')
            .leftJoin('USERS as app', 'q.approver_id', 'app.user_id')
            .selectAll('q')
            .select([
            'ap.qmqa_audit_plan_id',
            'ap.control_no',
            'ap.created_date as plan_created_date',
            'ap.audit_plan_date',
            'ap.remarks as plan_remarks',
            'ap.site_id',
            'site.site_name',
            'ap.supplier_id',
            'supp.supplier_name',
            'ap.audit_category_id',
            'cat.audit_category_name as category_name',
            'ap.sqe_pic_id',
            'sqe.full_name as sqe_pic_name',
            'q.audit_type_id',
            'at.audit_type_name',
            'q.attention_id',
            'att.full_name as attention_name',
            'q.pic_auditor_id',
            'pic.full_name as pic_auditor_name',
            'enc.full_name as encoder_name',
            'iss.full_name as issuer_name',
            'chk.full_name as checker_name',
            'app.full_name as approver_name'
        ])
            .where((eb) => eb.or([
            eb('q.qmqa_id', '=', idOrControlNo),
            eb('ap.control_no', '=', idOrControlNo)
        ]))
            .executeTakeFirst();
    }
    // ==========================================
    // 3. RESPONSE & CHILD ATTACHMENT DATA
    // ==========================================
    async findResponseByQmqaId(qmqaId) {
        return await db.selectFrom('QMQA_RESPONSE')
            .selectAll()
            .where('qmqa_id', '=', qmqaId)
            .executeTakeFirst();
    }
    async findResponseInitialAttachments(responseId) {
        return await db.selectFrom('QMQA_RESPONSE_INITIAL')
            .selectAll()
            .where('qmqa_response_id', '=', responseId)
            .execute();
    }
    async findResponseFinalAttachments(responseId) {
        return await db.selectFrom('QMQA_RESPONSE_FINAL')
            .selectAll()
            .where('qmqa_response_id', '=', responseId)
            .execute();
    }
    async findResponseVerificationAttachments(responseId) {
        return await db.selectFrom('QMQA_RESPONSE_VERIFICATION')
            .selectAll()
            .where('qmqa_response_id', '=', responseId)
            .execute();
    }
    async findPlanAttachments(qmqaId) {
        return await db.selectFrom('QMQA_PLAN_ATTACHMENT')
            .selectAll()
            .where('qmqa_id', '=', qmqaId)
            .execute();
    }
    async findAttachments(qmqaId) {
        return await db.selectFrom('QMQA_ATTACHMENT')
            .selectAll()
            .where('qmqa_id', '=', qmqaId)
            .execute();
    }
    async findCcList(qmqaId) {
        return await db.selectFrom('QMQA_CC as cc')
            .leftJoin('USERS as u', 'cc.user_id', 'u.user_id')
            .select([
            'cc.qmqa_cc_id',
            'cc.qmqa_id',
            'cc.user_id',
            'u.full_name as user_name',
            'u.email'
        ])
            .where('cc.qmqa_id', '=', qmqaId)
            .execute();
    }
    // ==========================================
    // Utils
    // ==========================================
    async getNextSequence(prefix) {
        const result = await db.selectFrom('QMQA_AUDIT_PLAN')
            .select('control_no')
            .where('control_no', 'like', `${prefix}%`)
            .orderBy('control_no', 'desc')
            .executeTakeFirst();
        return result?.control_no || null;
    }
    async executeTransaction(callback) {
        return await db.transaction().execute(async (trx) => {
            return await callback(trx);
        });
    }
}
export const qmqaRepository = new QmqaRepository();
