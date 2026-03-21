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
    ISSUED: [SQMP_STAGE_CODE.SUPPLIER, '13', '14'],
    RESPONSE_AWAITING: [SQMP_STAGE_CODE.SUPPLIER, '13', '14'],
    RESPONSE_SUBMITTED: [SQMP_STAGE_CODE.ISSUER_2ND],
    RESPONSE_AWAITING_CHECKED: [SQMP_STAGE_CODE.CHECKER_2ND],
    RESPONSE_AWAITING_APPROVAL: [SQMP_STAGE_CODE.APPROVER_2ND, SQMP_STAGE_CODE.ISSUER_3RD],
    RESPONSE_REJECTED: [
        '20',
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
        // Suppliers remain constrained at the query level. Internal user visibility is
        // normalized in the service layer so list/detail scope and viewList behave
        // consistently across all SQM Plan queues.
        if (userId && userRole) {
            const isSupplier = userRole.toUpperCase().includes('SUPPLIER');
            if (isSupplier) {
                query = query.where((eb) => eb.or([
                    eb('s.attention_id', '=', userId),
                    eb('s.supplier_id', 'in', eb.selectFrom('SUPPLIERSUSER as su')
                        .select('su.supplier_id')
                        .where('su.user_id', '=', userId)),
                ]));
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
            s.issuer_id as issuer_id,
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
        // Suppliers remain constrained at the query level. Internal user visibility is
        // normalized in the service layer so detail access matches list access.
        if (userId && userRole) {
            const isSupplier = userRole.toUpperCase().includes('SUPPLIER');
            if (isSupplier) {
                query = query.where((eb) => eb.or([
                    eb('s.attention_id', '=', userId),
                    eb('s.supplier_id', 'in', eb.selectFrom('SUPPLIERSUSER as su')
                        .select('su.supplier_id')
                        .where('su.user_id', '=', userId)),
                ]));
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
            .where('r.sqmp_id', '=', sqmpId)
            .orderBy('r.response_date', 'desc')
            .executeTakeFirst();
    }
    async findLatestResponsesBySqmpIds(sqmpIds) {
        if (!sqmpIds.length) {
            return [];
        }
        return await db.selectFrom('SQMP_RESPONSE as r')
            .innerJoin(db.selectFrom('SQMP_RESPONSE as latest_r')
            .select('latest_r.sqmp_id')
            .select((eb) => eb.fn.max('latest_r.response_date').as('max_response_date'))
            .where('latest_r.sqmp_id', 'in', sqmpIds)
            .groupBy('latest_r.sqmp_id')
            .as('latest'), (join) => join
            .onRef('latest.sqmp_id', '=', 'r.sqmp_id')
            .onRef('latest.max_response_date', '=', 'r.response_date'))
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
            .execute();
    }
    async findMainAttachmentOwner(attachmentId) {
        const documentOwner = await db.selectFrom('SQMP_DOCUMENT')
            .select(['sqmp_id'])
            .where('sqmp_document_id', '=', attachmentId)
            .executeTakeFirst();
        if (documentOwner?.sqmp_id) {
            return {
                sqmp_id: documentOwner.sqmp_id,
                moduleType: 'sqmp-document',
            };
        }
        const appendixOwner = await db.selectFrom('SQMP_APPENDIX')
            .select(['sqmp_id'])
            .where('sqmp_appendix_id', '=', attachmentId)
            .executeTakeFirst();
        if (appendixOwner?.sqmp_id) {
            return {
                sqmp_id: appendixOwner.sqmp_id,
                moduleType: 'sqmp-appendix',
            };
        }
        return null;
    }
    async findResponseAttachmentOwner(attachmentId) {
        const documentOwner = await db.selectFrom('SQMP_RESPONSE_DOCUMENT as d')
            .innerJoin('SQMP_RESPONSE as r', 'd.sqmp_response_id', 'r.sqmp_response_id')
            .select(['r.sqmp_id as sqmp_id'])
            .where('d.sqmp_response_document_id', '=', attachmentId)
            .executeTakeFirst();
        if (documentOwner?.sqmp_id) {
            return {
                sqmp_id: documentOwner.sqmp_id,
                moduleType: 'sqmp-response-document',
            };
        }
        const appendixOwner = await db.selectFrom('SQMP_RESPONSE_APPENDIX as a')
            .innerJoin('SQMP_RESPONSE as r', 'a.sqmp_response_id', 'r.sqmp_response_id')
            .select(['r.sqmp_id as sqmp_id'])
            .where('a.sqmp_response_appendix_id', '=', attachmentId)
            .executeTakeFirst();
        if (appendixOwner?.sqmp_id) {
            return {
                sqmp_id: appendixOwner.sqmp_id,
                moduleType: 'sqmp-response-appendix',
            };
        }
        const closureOwner = await db.selectFrom('SQMP_RESPONSE_CLOSURE as c')
            .innerJoin('SQMP_RESPONSE as r', 'c.sqmp_response_id', 'r.sqmp_response_id')
            .select(['r.sqmp_id as sqmp_id'])
            .where('c.sqmp_response_closure_id', '=', attachmentId)
            .executeTakeFirst();
        if (closureOwner?.sqmp_id) {
            return {
                sqmp_id: closureOwner.sqmp_id,
                moduleType: 'sqmp-response-closure',
            };
        }
        return null;
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
