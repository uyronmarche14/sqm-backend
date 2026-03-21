// @ts-ignore
import { db } from '../../shared/infrastructure/db.js';
import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';
import { sql } from 'kysely';
export class QmqaRepository extends BaseRepository {
    constructor() {
        super('QMQA');
    }
    scheduleSurfaceStatuses = ['PL', 'CA', 'CC'];
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
            sql `${sql.ref('site.site_code')}`.as('site_code'),
            'site.site_name',
            'supp.supplier_name',
            'cat.audit_category_name as category_name',
            sql `${sql.ref('cat.audit_category_code')}`.as('audit_category_code'),
            'sqe.full_name as sqe_pic_name',
            'q.qmqa_id as record_id',
            'q.request_status as record_status'
        ])
            .where('ap.request_status', 'in', [...this.scheduleSurfaceStatuses])
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
            sql `${sql.ref('site.site_code')}`.as('site_code'),
            'site.site_name',
            'supp.supplier_name',
            'cat.audit_category_name as category_name',
            sql `${sql.ref('cat.audit_category_code')}`.as('audit_category_code'),
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
            .leftJoin('USERS as att', 'q.attention_id', 'att.user_id')
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
            'q.attention_id',
            'q.issuer_remarks',
            'q.issuer_date',
            'q.checker_remarks',
            'q.checker_date',
            'q.approver_remarks',
            'q.approver_date',
            'q.last_update',
            'ap.qmqa_audit_plan_id',
            'ap.control_no',
            'ap.audit_plan_date',
            'ap.site_id',
            sql `${sql.ref('site.site_code')}`.as('site_code'),
            'site.site_name',
            'ap.supplier_id',
            'supp.supplier_name',
            'ap.audit_category_id',
            'cat.audit_category_name as category_name',
            sql `${sql.ref('cat.audit_category_code')}`.as('audit_category_code'),
            'ap.sqe_pic_id',
            'sqe.full_name as sqe_pic_name',
            'q.audit_type_id',
            'at.audit_type_name',
            'q.encoder_id',
            'enc.full_name as encoder_name',
            'att.full_name as attention_name',
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
        if (filters?.actorContext?.supplierIds && filters.actorContext.supplierIds.length > 0) {
            const { userId, supplierIds } = filters.actorContext;
            query = query.where((eb) => eb.or([
                eb('ap.supplier_id', 'in', supplierIds),
                eb('q.attention_id', '=', userId)
            ]));
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
            sql `${sql.ref('site.site_code')}`.as('site_code'),
            'site.site_name',
            'ap.supplier_id',
            'supp.supplier_name',
            'ap.audit_category_id',
            'cat.audit_category_name as category_name',
            sql `${sql.ref('cat.audit_category_code')}`.as('audit_category_code'),
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
        return await db.selectFrom('QMQA_RESPONSE as qr')
            .leftJoin('USERS as chk', 'qr.checker_id', 'chk.user_id')
            .leftJoin('USERS as app', 'qr.approver_id', 'app.user_id')
            .selectAll('qr')
            .select([
            'chk.full_name as checker_name',
            'app.full_name as approver_name',
        ])
            .where('qr.qmqa_id', '=', qmqaId)
            .orderBy('qr.last_update', 'desc')
            .executeTakeFirst();
    }
    async findLatestResponsesByQmqaIds(qmqaIds) {
        if (qmqaIds.length === 0) {
            return [];
        }
        return await db.selectFrom('QMQA_RESPONSE as qr')
            .leftJoin('USERS as chk', 'qr.checker_id', 'chk.user_id')
            .leftJoin('USERS as app', 'qr.approver_id', 'app.user_id')
            .selectAll('qr')
            .select([
            'chk.full_name as checker_name',
            'app.full_name as approver_name',
        ])
            .where('qr.qmqa_id', 'in', qmqaIds)
            .orderBy('qr.qmqa_id', 'asc')
            .orderBy('qr.last_update', 'desc')
            .execute();
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
    async findAttachmentOwner(moduleType, attachmentId) {
        const handlers = {
            'qmqa-plan': () => db.selectFrom('QMQA_PLAN_ATTACHMENT')
                .select(['qmqa_id'])
                .where('qmqa_plan_attachment_id', '=', attachmentId)
                .executeTakeFirst(),
            'qmqa-record': () => db.selectFrom('QMQA_ATTACHMENT')
                .select(['qmqa_id'])
                .where('qmqa_attachment_id', '=', attachmentId)
                .executeTakeFirst(),
            'qmqa-response-initial': () => db.selectFrom('QMQA_RESPONSE_INITIAL as i')
                .innerJoin('QMQA_RESPONSE as r', 'i.qmqa_response_id', 'r.qmqa_response_id')
                .select(['r.qmqa_id as qmqa_id'])
                .where('i.qmqa_response_initial_attachment_id', '=', attachmentId)
                .executeTakeFirst(),
            'qmqa-response-final': () => db.selectFrom('QMQA_RESPONSE_FINAL as f')
                .innerJoin('QMQA_RESPONSE as r', 'f.qmqa_response_id', 'r.qmqa_response_id')
                .select(['r.qmqa_id as qmqa_id'])
                .where('f.qmqa_response_final_attachment_id', '=', attachmentId)
                .executeTakeFirst(),
            'qmqa-response-verification': () => db.selectFrom('QMQA_RESPONSE_VERIFICATION as v')
                .innerJoin('QMQA_RESPONSE as r', 'v.qmqa_response_id', 'r.qmqa_response_id')
                .select(['r.qmqa_id as qmqa_id'])
                .where('v.qmqa_response_verification_attachment_id', '=', attachmentId)
                .executeTakeFirst(),
        };
        const lookup = handlers[moduleType];
        if (!lookup) {
            return null;
        }
        return (await lookup()) || null;
    }
    async findAttachmentOwnerByAttachmentId(attachmentId) {
        const moduleTypes = [
            'qmqa-plan',
            'qmqa-record',
            'qmqa-response-initial',
            'qmqa-response-final',
            'qmqa-response-verification',
        ];
        for (const moduleType of moduleTypes) {
            const owner = await this.findAttachmentOwner(moduleType, attachmentId);
            if (owner) {
                return {
                    ...owner,
                    moduleType,
                };
            }
        }
        return null;
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
    async findSupplierIdsByUserId(userId) {
        const rows = await db.selectFrom('SUPPLIERSUSER')
            .select('supplier_id')
            .where('user_id', '=', userId)
            .execute();
        return rows
            .map((row) => row.supplier_id)
            .filter((supplierId) => Boolean(supplierId));
    }
    async executeTransaction(callback) {
        return await db.transaction().execute(async (trx) => {
            return await callback(trx);
        });
    }
}
export const qmqaRepository = new QmqaRepository();
