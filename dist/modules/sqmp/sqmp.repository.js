// @ts-ignore
import { db } from '../../shared/infrastructure/db.js';
import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';
import { SQMP_STAGE_CODE } from './workflow/workflow.constants.js';
const SQMP_STATUS_FILTERS = {
    DRAFT: [SQMP_STAGE_CODE.DRAFT],
    AWAITING_CHECKED: [SQMP_STAGE_CODE.CHECKER],
    SUBMITTED: [SQMP_STAGE_CODE.CHECKER],
    AWAITING_APPROVAL: [SQMP_STAGE_CODE.APPROVER],
    APPROVED: [SQMP_STAGE_CODE.ISSUER],
    REJECTED: [SQMP_STAGE_CODE.REJECTED_BY_CHECKER, SQMP_STAGE_CODE.REJECTED_BY_APPROVER],
    ISSUED: [SQMP_STAGE_CODE.SUPPLIER],
    RESPONSE_AWAITING: [SQMP_STAGE_CODE.SUPPLIER],
    RESPONSE_SUBMITTED: [SQMP_STAGE_CODE.ISSUER_2ND],
    RESPONSE_AWAITING_CHECKED: [SQMP_STAGE_CODE.CHECKER_2ND],
    RESPONSE_AWAITING_APPROVAL: [SQMP_STAGE_CODE.APPROVER_2ND, SQMP_STAGE_CODE.ISSUER_3RD],
    RESPONSE_REJECTED: [
        SQMP_STAGE_CODE.REJECTED_BY_CHECKER_2ND,
        SQMP_STAGE_CODE.REJECTED_BY_APPROVER_2ND,
        SQMP_STAGE_CODE.NOT_ACCEPTED_BY_ISSUER,
    ],
    CANCELLED: [SQMP_STAGE_CODE.CANCELLED],
    CLOSED: [SQMP_STAGE_CODE.CLOSED],
};
export class SqmpRepository extends BaseRepository {
    constructor() {
        super('SQMP');
    }
    async findAllDetailed(status, userId, userRole) {
        let query = db.selectFrom('SQMP as s')
            .leftJoin('MFG_SITES as site', 's.site_id', 'site.site_id')
            .leftJoin('SUPPLIERS as supp', 's.supplier_id', 'supp.supplier_id')
            .leftJoin('MODELS as model', 's.model_id', 'model.model_id')
            .leftJoin('USERS as enc', 's.encoder_id', 'enc.user_id')
            .leftJoin('USERS as att', 's.attention_id', 'att.user_id')
            .leftJoin('USERS as iss', 's.issuer_id', 'iss.user_id')
            .leftJoin('USERS as chk', 's.checker_id', 'chk.user_id')
            .leftJoin('USERS as apr', 's.approver_id', 'apr.user_id')
            .selectAll('s')
            .select([
            's.sqmp_id as id',
            'site.site_name as site_name',
            'supp.supplier_name as supplier_name',
            'model.model_name as model_name',
            'enc.full_name as encoder_name',
            'att.full_name as attention_name',
            'iss.full_name as issuer_name',
            'chk.full_name as checker_name',
            'apr.full_name as approver_name'
        ])
            .orderBy('s.registration_date', 'desc');
        // 1. Horizontal Security Guards (IDOR Context)
        if (userId && userRole) {
            const isSupplier = userRole.toUpperCase().includes('SUPPLIER');
            if (isSupplier) {
                query = query.where('s.supplier_id', 'in', (eb) => eb.selectFrom('SUPPLIERSUSER as su')
                    .select('su.supplier_id')
                    .where('su.user_id', '=', userId));
            }
            else {
                // Internal users: Check if they are restricted by site
                // Fetch user site first or join? Joining USERS for the current user is heavy
                // We'll perform a subquery or assume the service passes the context if available.
                // For baseline, we filter by the user's assigned site if they aren't admin.
                const isGlobalRole = ['ADMIN', 'MPD'].some(r => userRole.toUpperCase().includes(r));
                if (!isGlobalRole) {
                    query = query.innerJoin('USERS as curr_user', (join) => join.on('curr_user.user_id', '=', userId)).whereRef('s.site_id', '=', 'curr_user.site_id');
                }
            }
        }
        if (status) {
            const normalizedStatus = status.toUpperCase();
            if (normalizedStatus.includes(',')) {
                const statuses = normalizedStatus
                    .split(',')
                    .flatMap((value) => SQMP_STATUS_FILTERS[value.trim()] || []);
                query = query.where('s.request_status', 'in', statuses);
            }
            else if (normalizedStatus === 'ACTIVE') {
                query = query.where('s.request_status', 'not in', [SQMP_STAGE_CODE.CLOSED, SQMP_STAGE_CODE.CANCELLED]);
            }
            else if (normalizedStatus === 'RESPONSE') {
                query = query.where('s.request_status', 'in', [
                    SQMP_STAGE_CODE.SUPPLIER,
                    SQMP_STAGE_CODE.ISSUER_2ND,
                    SQMP_STAGE_CODE.CHECKER_2ND,
                    SQMP_STAGE_CODE.APPROVER_2ND,
                    SQMP_STAGE_CODE.ISSUER_3RD,
                    SQMP_STAGE_CODE.REJECTED_BY_CHECKER_2ND,
                    SQMP_STAGE_CODE.REJECTED_BY_APPROVER_2ND,
                    SQMP_STAGE_CODE.NOT_ACCEPTED_BY_ISSUER,
                ]);
            }
            else if (normalizedStatus === 'A_APPROVAL' || normalizedStatus === 'AWAITING_APPROVAL') {
                query = query.where('s.request_status', 'in', [SQMP_STAGE_CODE.CHECKER, SQMP_STAGE_CODE.APPROVER]);
            }
            else if (normalizedStatus === 'RESPONSE_APPROVAL' || normalizedStatus === 'RESPONSE_AWAITING_APPROVAL') {
                query = query.where('s.request_status', 'in', [
                    SQMP_STAGE_CODE.CHECKER_2ND,
                    SQMP_STAGE_CODE.APPROVER_2ND,
                    SQMP_STAGE_CODE.ISSUER_3RD,
                ]);
            }
            else {
                const mapped = SQMP_STATUS_FILTERS[normalizedStatus] || [normalizedStatus];
                query = query.where('s.request_status', 'in', mapped);
            }
        }
        return await query.execute();
    }
    async findByIdDetailed(idOrControlNo, userId, userRole) {
        const { sql } = await import('kysely');
        let query = db.selectFrom('SQMP as s')
            .leftJoin('MFG_SITES as site', 's.site_id', 'site.site_id')
            .leftJoin('SUPPLIERS as supp', 's.supplier_id', 'supp.supplier_id')
            .leftJoin('MODELS as model', 's.model_id', 'model.model_id')
            .leftJoin('USERS as enc', 's.encoder_id', 'enc.user_id')
            .leftJoin('USERS as att', 's.attention_id', 'att.user_id')
            .leftJoin('USERS as iss', 's.issuer_id', 'iss.user_id')
            .leftJoin('USERS as chk', 's.checker_id', 'chk.user_id')
            .leftJoin('USERS as apr', 's.approver_id', 'apr.user_id')
            .selectAll('s')
            .select([
            's.sqmp_id as id',
            'site.site_name as site_name',
            'supp.supplier_name as supplier_name',
            'model.model_name as model_name',
            'enc.full_name as encoder_name',
            'att.full_name as attention_name',
            'att.email as attention_email',
            'iss.full_name as issuer_name',
            'chk.full_name as checker_name',
            'apr.full_name as approver_name',
            // Aggregate Main Documents
            sql `(
          SELECT * FROM SQMP_DOCUMENT 
          WHERE sqmp_id = s.sqmp_id 
          FOR JSON PATH
        )`.as('mainDocumentsJson'),
            // Aggregate Appendix Sheets
            sql `(
          SELECT * FROM SQMP_APPENDIX 
          WHERE sqmp_id = s.sqmp_id 
          FOR JSON PATH
        )`.as('appendixDocumentsJson'),
            // Aggregate CC List
            sql `(
          SELECT cc.*, u.full_name as user_name, u.email as user_email
          FROM SQMP_CC cc
          LEFT JOIN USERS u ON cc.user_id = u.user_id
          WHERE cc.sqmp_id = s.sqmp_id 
          FOR JSON PATH
        )`.as('ccListJson'),
            // Aggregate Responses (with sub-aggregated documents/appendixes/closures)
            sql `(
          SELECT 
            r.*,
            iss_resp.full_name as issuer_name,
            chk_resp.full_name as checker_name,
            apr_resp.full_name as approver_name,
            (SELECT * FROM SQMP_RESPONSE_DOCUMENT WHERE sqmp_response_id = r.sqmp_response_id FOR JSON PATH) as documents,
            (SELECT * FROM SQMP_RESPONSE_APPENDIX WHERE sqmp_response_id = r.sqmp_response_id FOR JSON PATH) as appendixes,
            (SELECT * FROM SQMP_RESPONSE_CLOSURE WHERE sqmp_response_id = r.sqmp_response_id FOR JSON PATH) as closures
          FROM SQMP_RESPONSE r
          LEFT JOIN USERS iss_resp ON s.issuer_id = iss_resp.user_id
          LEFT JOIN USERS chk_resp ON r.checker_id = chk_resp.user_id
          LEFT JOIN USERS apr_resp ON r.approver_id = apr_resp.user_id
          WHERE r.sqmp_id = s.sqmp_id 
          ORDER BY r.response_date ASC
          FOR JSON PATH
        )`.as('responsesJson'),
            // Aggregate Status Remarks
            sql `(
          SELECT sr.*, u.full_name as remarks_by_name
          FROM SQMP_STATUS_REMARKS sr
          LEFT JOIN USERS u ON sr.remarks_by_id = u.user_id
          WHERE sr.sqmp_id = s.sqmp_id 
          ORDER BY sr.remarks_date DESC
          FOR JSON PATH
        )`.as('statusRemarksJson')
        ])
            .where((eb) => eb.or([
            eb('s.sqmp_id', '=', idOrControlNo),
            eb('s.control_no', '=', idOrControlNo)
        ]));
        // 1. Horizontal Security Guards (IDOR Context)
        if (userId && userRole) {
            const isSupplier = userRole.toUpperCase().includes('SUPPLIER');
            if (isSupplier) {
                query = query.where('s.supplier_id', 'in', (eb) => eb.selectFrom('SUPPLIERSUSER as su')
                    .select('su.supplier_id')
                    .where('su.user_id', '=', userId));
            }
            else {
                const isGlobalRole = ['ADMIN', 'MPD'].some(r => userRole.toUpperCase().includes(r));
                if (!isGlobalRole) {
                    query = query.innerJoin('USERS as curr_user', (join) => join.on('curr_user.user_id', '=', userId)).whereRef('s.site_id', '=', 'curr_user.site_id');
                }
            }
        }
        const result = await query.executeTakeFirst();
        if (!result)
            return null;
        // Helper to parse JSON if string, otherwise return as-is
        const parse = (val) => {
            if (!val)
                return [];
            if (typeof val === 'string') {
                try {
                    return JSON.parse(val);
                }
                catch (e) {
                    return [];
                }
            }
            return val;
        };
        return {
            record: result,
            mainDocuments: parse(result.mainDocumentsJson),
            appendixDocuments: parse(result.appendixDocumentsJson),
            ccList: parse(result.ccListJson),
            responses: parse(result.responsesJson).map((resp) => ({
                ...resp,
                documents: parse(resp.documents),
                appendixes: parse(resp.appendixes),
                closures: parse(resp.closures)
            })),
            statusRemarks: parse(result.statusRemarksJson)
        };
    }
    async findLatestResponse(sqmpId) {
        return await db.selectFrom('SQMP_RESPONSE as r')
            .leftJoin('SQMP as s', 'r.sqmp_id', 's.sqmp_id')
            .leftJoin('USERS as iss', 's.issuer_id', 'iss.user_id')
            .leftJoin('USERS as chk', 'r.checker_id', 'chk.user_id')
            .leftJoin('USERS as apr', 'r.approver_id', 'apr.user_id')
            .selectAll('r')
            .select([
            'iss.full_name as issuer_name',
            'chk.full_name as checker_name',
            'apr.full_name as approver_name',
        ])
            .where('sqmp_id', '=', sqmpId)
            .orderBy('response_date', 'desc')
            .executeTakeFirst();
    }
    async findSupplierIdsByUserId(userId) {
        const rows = await db.selectFrom('SUPPLIERSUSER as su')
            .select('su.supplier_id')
            .where('su.user_id', '=', userId)
            .execute();
        return rows.map((row) => row.supplier_id);
    }
    async executeTransaction(callback) {
        return await db.transaction().execute(async (trx) => {
            // @ts-ignore
            return await callback(trx);
        });
    }
}
export const sqmpRepository = new SqmpRepository();
