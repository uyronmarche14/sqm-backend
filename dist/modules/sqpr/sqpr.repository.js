import { db } from '../../shared/infrastructure/db.js';
import { sql } from 'kysely';
import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';
export class SqprRepository extends BaseRepository {
    constructor() {
        super('SQPR');
    }
    async findSiteCode(siteId) {
        const row = await db
            .selectFrom('MFG_SITES as site')
            .select([
            'site.site_id',
            'site.site_name',
            sql `COALESCE(site.site_code, site.site_name)`.as('site_code'),
        ])
            .where('site.site_id', '=', siteId)
            .executeTakeFirst();
        return row || null;
    }
    /**
     * Fetches all SQPR records with human-readable joined names.
     */
    async findAllDetailed() {
        return await db.selectFrom('SQPR as s')
            .leftJoin('MFG_SITES as site', 's.site_id', 'site.site_id')
            .leftJoin('SUPPLIERS as sup', 's.supplier_id', 'sup.supplier_id')
            .leftJoin('USERS as inch', 's.incharge_id', 'inch.user_id')
            .leftJoin('USERS as attn', 's.attention_id', 'attn.user_id')
            .leftJoin('USERS as chk', 's.checker_id', 'chk.user_id')
            .leftJoin('USERS as apr', 's.approver_id', 'apr.user_id')
            .selectAll('s')
            .select([
            'site.site_name as site_name',
            sql `COALESCE(site.site_code, site.site_name)`.as('site_code'),
            'sup.supplier_name as supplier_name',
            sql `COALESCE(inch.full_name, s.incharge_id)`.as('incharge_name'),
            'attn.full_name as attention_name',
            'chk.full_name as checker_name',
            'apr.full_name as approver_name'
        ])
            .orderBy('s.date_created', 'desc')
            .execute();
    }
    /**
     * Fetches a single SQPR record and all its nested sub-tables.
     */
    async findByIdDetailed(idOrControlNo) {
        const record = await db.selectFrom('SQPR as s')
            .leftJoin('MFG_SITES as site', 's.site_id', 'site.site_id')
            .leftJoin('SUPPLIERS as sup', 's.supplier_id', 'sup.supplier_id')
            .leftJoin('USERS as inch', 's.incharge_id', 'inch.user_id')
            .leftJoin('USERS as attn', 's.attention_id', 'attn.user_id')
            .leftJoin('USERS as chk', 's.checker_id', 'chk.user_id')
            .leftJoin('USERS as apr', 's.approver_id', 'apr.user_id')
            .selectAll('s')
            .select([
            'site.site_name as site_name',
            sql `COALESCE(site.site_code, site.site_name)`.as('site_code'),
            'sup.supplier_name as supplier_name',
            sql `COALESCE(inch.full_name, s.incharge_id)`.as('incharge_name'),
            'attn.full_name as attention_name',
            'chk.full_name as checker_name',
            'apr.full_name as approver_name'
        ])
            .where((eb) => eb.or([
            eb('s.sqpr_id', '=', idOrControlNo),
            eb('s.control_no', '=', idOrControlNo)
        ]))
            .executeTakeFirst();
        if (!record)
            return null;
        // Fetch Subtables
        const attachments = await db.selectFrom('SQPR_ATTACHMENT')
            .selectAll()
            .where('sqpr_id', '=', record.sqpr_id)
            .execute();
        const ccList = await db.selectFrom('SQPR_CC as cc')
            .leftJoin('USERS as u', 'cc.user_id', 'u.user_id')
            .select([
            'cc.sqpr_cc_id',
            'cc.sqpr_id',
            'cc.user_id',
            'cc.last_update',
            'cc.updateby',
            'u.full_name as user_name',
            'u.email as user_email'
        ])
            .where('cc.sqpr_id', '=', record.sqpr_id)
            .execute();
        return { record, attachments, ccList };
    }
    async findAttachmentOwner(attachmentId) {
        const attachment = await db
            .selectFrom('SQPR_ATTACHMENT')
            .select(['sqpr_id'])
            .where('sqpr_attachment_id', '=', attachmentId)
            .executeTakeFirst();
        return attachment || null;
    }
    async findUserContactById(userId) {
        if (!userId)
            return null;
        const user = await db
            .selectFrom('USERS as u')
            .select([
            'u.user_id as userId',
            'u.email as email',
            'u.full_name as name',
        ])
            .where('u.user_id', '=', userId)
            .executeTakeFirst();
        if (!user) {
            return null;
        }
        return {
            userId: user.userId,
            email: user.email,
            name: user.name,
        };
    }
    async findNotificationContextById(id) {
        const row = await db
            .selectFrom('SQPR as s')
            .leftJoin('SUPPLIERS as sup', 's.supplier_id', 'sup.supplier_id')
            .leftJoin('USERS as incharge_user', 's.incharge_id', 'incharge_user.user_id')
            .leftJoin('USERS as checker_user', 's.checker_id', 'checker_user.user_id')
            .leftJoin('USERS as approver_user', 's.approver_id', 'approver_user.user_id')
            .select([
            's.sqpr_id as recordId',
            's.control_no as controlNo',
            sql `COALESCE(${sql.ref('sup.supplier_name')}, '')`.as('supplierName'),
            sql `${sql.ref('s.report_type')}`.as('reportType'),
            sql `${sql.ref('s.month')}`.as('month'),
            sql `${sql.ref('s.fiscal_year')}`.as('fiscalYear'),
            sql `${sql.ref('s.incharge_id')}`.as('inchargeId'),
            sql `${sql.ref('incharge_user.email')}`.as('inchargeEmail'),
            sql `COALESCE(${sql.ref('incharge_user.full_name')}, ${sql.ref('s.incharge_id')})`.as('inchargeName'),
            sql `${sql.ref('s.checker_id')}`.as('checkerId'),
            sql `${sql.ref('checker_user.email')}`.as('checkerEmail'),
            sql `COALESCE(${sql.ref('checker_user.full_name')}, ${sql.ref('s.checker_id')})`.as('checkerName'),
            sql `${sql.ref('s.approver_id')}`.as('approverId'),
            sql `${sql.ref('approver_user.email')}`.as('approverEmail'),
            sql `COALESCE(${sql.ref('approver_user.full_name')}, ${sql.ref('s.approver_id')})`.as('approverName'),
        ])
            .where('s.sqpr_id', '=', id)
            .executeTakeFirst();
        if (!row) {
            return null;
        }
        const ccRows = await db
            .selectFrom('SQPR_CC as cc')
            .leftJoin('USERS as u', 'cc.user_id', 'u.user_id')
            .select([
            'cc.user_id as userId',
            'u.email as email',
            sql `COALESCE(${sql.ref('u.full_name')}, ${sql.ref('cc.user_id')})`.as('name'),
        ])
            .where('cc.sqpr_id', '=', id)
            .execute();
        return {
            recordId: row.recordId,
            controlNo: row.controlNo,
            supplierName: row.supplierName,
            reportType: row.reportType,
            month: row.month,
            fiscalYear: row.fiscalYear,
            incharge: row.inchargeId
                ? {
                    userId: row.inchargeId,
                    email: row.inchargeEmail,
                    name: row.inchargeName,
                }
                : null,
            checker: row.checkerId
                ? {
                    userId: row.checkerId,
                    email: row.checkerEmail,
                    name: row.checkerName,
                }
                : null,
            approver: row.approverId
                ? {
                    userId: row.approverId,
                    email: row.approverEmail,
                    name: row.approverName,
                }
                : null,
            cc: ccRows.map((cc) => ({
                userId: cc.userId,
                email: cc.email,
                name: cc.name,
            })),
        };
    }
    /**
     * Wraps operations in an atomic transaction
     */
    async executeTransaction(callback) {
        return await db.transaction().execute(async (trx) => {
            // @ts-ignore: We need to pass the strongly typed Transactor
            return await callback(trx);
        });
    }
}
export const sqprRepository = new SqprRepository();
