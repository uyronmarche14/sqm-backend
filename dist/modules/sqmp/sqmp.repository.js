// @ts-ignore
import { db } from '../../shared/infrastructure/db.js';
import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';
import { mapStatusToDB } from '../../shared/utils/status-mapper.js';
export class SqmpRepository extends BaseRepository {
    constructor() {
        super('SQMP');
    }
    async findAllDetailed(status) {
        let query = db.selectFrom('SQMP as s')
            .leftJoin('MFG_SITES as site', 's.site_id', 'site.site_id')
            .leftJoin('SUPPLIERS as supp', 's.supplier_id', 'supp.supplier_id')
            .leftJoin('MODELS as model', 's.model_id', 'model.model_id')
            .leftJoin('USERS as enc', 's.encoder_id', 'enc.user_id')
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
            'iss.full_name as issuer_name',
            'chk.full_name as checker_name',
            'apr.full_name as approver_name'
        ])
            .orderBy('s.registration_date', 'desc');
        if (status) {
            const normalizedStatus = status.toUpperCase();
            if (normalizedStatus === 'ACTIVE') {
                query = query.where('s.request_status', 'not in', ['CL', 'CA', 'RE']);
            }
            else if (normalizedStatus === 'RESPONSE') {
                query = query.where('s.request_status', '=', 'RS');
            }
            else if (normalizedStatus === 'A_APPROVAL' || normalizedStatus === 'AWAITING_APPROVAL') {
                query = query.where('s.request_status', 'in', ['SU', 'AA', 'CK']);
            }
            else if (normalizedStatus === 'RESPONSE_APPROVAL' || normalizedStatus === 'RESPONSE_AWAITING_APPROVAL') {
                query = query.where('s.request_status', 'in', ['RA', 'RC']);
            }
            else {
                query = query.where('s.request_status', '=', mapStatusToDB(normalizedStatus));
            }
        }
        return await query.execute();
    }
    async findByIdDetailed(idOrControlNo) {
        const record = await db.selectFrom('SQMP as s')
            .leftJoin('MFG_SITES as site', 's.site_id', 'site.site_id')
            .leftJoin('SUPPLIERS as supp', 's.supplier_id', 'supp.supplier_id')
            .leftJoin('MODELS as model', 's.model_id', 'model.model_id')
            .leftJoin('USERS as enc', 's.encoder_id', 'enc.user_id')
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
            'iss.full_name as issuer_name',
            'chk.full_name as checker_name',
            'apr.full_name as approver_name'
        ])
            .where((eb) => eb.or([
            eb('s.sqmp_id', '=', idOrControlNo),
            eb('s.control_no', '=', idOrControlNo)
        ]))
            .executeTakeFirst();
        if (!record)
            return null;
        // Subtables
        const mainDocuments = await db.selectFrom('SQMP_DOCUMENT')
            .selectAll()
            .where('sqmp_id', '=', record.sqmp_id)
            .execute();
        const appendixDocuments = await db.selectFrom('SQMP_APPENDIX')
            .selectAll()
            .where('sqmp_id', '=', record.sqmp_id)
            .execute();
        const ccList = await db.selectFrom('SQMP_CC as cc')
            .leftJoin('USERS as u', 'cc.user_id', 'u.user_id')
            .select([
            'cc.sqmp_cc_id',
            'cc.sqmp_id',
            'cc.user_id',
            'cc.last_update',
            'cc.updateby',
            'u.full_name as user_name',
            'u.email as user_email'
        ])
            .where('cc.sqmp_id', '=', record.sqmp_id)
            .execute();
        // Fetch Responses
        const responses = await db.selectFrom('SQMP_RESPONSE')
            .selectAll()
            .where('sqmp_id', '=', record.sqmp_id)
            .orderBy('response_date', 'asc')
            .execute();
        const detailedResponses = [];
        for (const resp of responses) {
            const docs = await db.selectFrom('SQMP_RESPONSE_DOCUMENT')
                .selectAll()
                .where('sqmp_response_id', '=', resp.sqmp_response_id)
                .execute();
            const apps = await db.selectFrom('SQMP_RESPONSE_APPENDIX')
                .selectAll()
                .where('sqmp_response_id', '=', resp.sqmp_response_id)
                .execute();
            const closures = await db.selectFrom('SQMP_RESPONSE_CLOSURE')
                .selectAll()
                .where('sqmp_response_id', '=', resp.sqmp_response_id)
                .execute();
            detailedResponses.push({
                ...resp,
                documents: docs,
                appendixes: apps,
                closures: closures
            });
        }
        const statusRemarks = await db.selectFrom('SQMP_STATUS_REMARKS as sr')
            .leftJoin('USERS as u', 'sr.remarks_by_id', 'u.user_id')
            .selectAll('sr')
            .select([
            'u.full_name as remarks_by_name'
        ])
            .where('sqmp_id', '=', record.sqmp_id)
            .orderBy('remarks_date', 'desc')
            .execute();
        return {
            record,
            mainDocuments,
            appendixDocuments,
            ccList,
            responses: detailedResponses,
            statusRemarks
        };
    }
    async executeTransaction(callback) {
        return await db.transaction().execute(async (trx) => {
            // @ts-ignore
            return await callback(trx);
        });
    }
}
export const sqmpRepository = new SqmpRepository();
