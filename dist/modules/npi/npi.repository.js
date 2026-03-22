import { db } from '../../shared/infrastructure/db.js';
import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';
import { sql } from 'kysely';
export class NpiRepository extends BaseRepository {
    constructor() {
        super('NPI_LOTS');
    }
    async findAllDetailed(filters) {
        let query = db.selectFrom('NPI_LOTS as n')
            .leftJoin('MFG_SITES as s', 'n.site_id', 's.site_id')
            .leftJoin('SUPPLIERS as sup', 'n.supplier_id', 'sup.supplier_id')
            .leftJoin('PARTS as p', 'n.part_id', 'p.part_id')
            .leftJoin('MODELS as m', 'n.model_id', 'm.model_id')
            .leftJoin('PARTTYPES as pt', 'p.parttype_id', 'pt.parttype_id')
            .leftJoin('PARTCLASS as pc', 'p.partclass_id', 'pc.partclass_id')
            .leftJoin('INSPECTIONMETHODS as im', 'n.inspectionmethod_id', 'im.inspectionmethod_id')
            .leftJoin('INSPECTIONCATEGORIES as ic', 'n.inspectioncat_id', 'ic.inspectioncat_id')
            .leftJoin('SEVERITY as sev', 'n.severity_id', 'sev.severity_id')
            .leftJoin('DISPOSITIONS as disp', 'n.disposition_id', 'disp.disposition_id')
            .leftJoin('INSPECTORS as insp', 'n.inspected_by_id', 'insp.inspector_id')
            .leftJoin('INSPECTORS as verifier', 'n.data_verified_by_id', 'verifier.inspector_id')
            .leftJoin('INSPECTORS as checker', 'n.checker_id', 'checker.inspector_id')
            .leftJoin('INSPECTORS as approver', 'n.approver_id', 'approver.inspector_id')
            .leftJoin('USERS as checker_user', 'n.checker_id', 'checker_user.user_id')
            .leftJoin('USERS as approver_user', 'n.approver_id', 'approver_user.user_id')
            .selectAll('n')
            .select([
            's.site_name',
            sql `${sql.ref('s.site_code')}`.as('site_code'),
            'sup.supplier_name',
            'p.part_name',
            'p.part_code',
            'p.partclass_id',
            'p.parttype_id',
            'm.model_name',
            'pt.parttype_name',
            'pc.partclass_name',
            'im.inspectionmethod_name',
            'ic.inspectioncat_name',
            'sev.severity_name',
            'disp.disposition_name',
            'insp.inspector_name as inspected_by_name',
            'verifier.inspector_name as data_verified_by_name',
            sql `COALESCE(${sql.ref('checker.inspector_name')}, ${sql.ref('checker_user.full_name')})`.as('checker_name'),
            sql `COALESCE(${sql.ref('approver.inspector_name')}, ${sql.ref('approver_user.full_name')})`.as('approver_name')
        ]);
        // Apply filters
        if (filters?.status) {
            const statuses = filters.status.split(',').map(s => s.trim()).filter(Boolean);
            if (statuses.length > 0) {
                query = query.where('n.request_status', 'in', statuses);
            }
        }
        if (filters?.siteId) {
            query = query.where('n.site_id', '=', filters.siteId);
        }
        if (filters?.supplierId) {
            query = query.where('n.supplier_id', '=', filters.supplierId);
        }
        if (filters?.partCode) {
            query = query.where((eb) => eb.or([
                eb('n.part_id', '=', filters.partCode),
                eb('p.part_code', '=', filters.partCode),
            ]));
        }
        if (filters?.keyword) {
            const kw = `%${filters.keyword}%`;
            query = query.where((eb) => eb.or([
                eb('n.control_no', 'like', kw),
                eb('n.lot_no', 'like', kw),
                eb('p.part_code', 'like', kw),
                eb('sup.supplier_name', 'like', kw),
            ]));
        }
        if (filters?.dateFrom) {
            const dateFrom = new Date(filters.dateFrom);
            if (!Number.isNaN(dateFrom.getTime())) {
                query = query.where('n.datecreated', '>=', dateFrom);
            }
        }
        if (filters?.dateTo) {
            const dateTo = new Date(filters.dateTo);
            if (!Number.isNaN(dateTo.getTime())) {
                query = query.where('n.datecreated', '<=', dateTo);
            }
        }
        return await query.orderBy('n.datecreated', 'desc').execute();
    }
    async findByIdDetailed(idOrControlNo) {
        const record = await db.selectFrom('NPI_LOTS as n')
            .leftJoin('MFG_SITES as s', 'n.site_id', 's.site_id')
            .leftJoin('SUPPLIERS as sup', 'n.supplier_id', 'sup.supplier_id')
            .leftJoin('PARTS as p', 'n.part_id', 'p.part_id')
            .leftJoin('MODELS as m', 'n.model_id', 'm.model_id')
            .leftJoin('PARTTYPES as pt', 'p.parttype_id', 'pt.parttype_id')
            .leftJoin('PARTCLASS as pc', 'p.partclass_id', 'pc.partclass_id')
            .leftJoin('INSPECTIONMETHODS as im', 'n.inspectionmethod_id', 'im.inspectionmethod_id')
            .leftJoin('INSPECTIONCATEGORIES as ic', 'n.inspectioncat_id', 'ic.inspectioncat_id')
            .leftJoin('SEVERITY as sev', 'n.severity_id', 'sev.severity_id')
            .leftJoin('DISPOSITIONS as disp', 'n.disposition_id', 'disp.disposition_id')
            .leftJoin('INSPECTORS as insp', 'n.inspected_by_id', 'insp.inspector_id')
            .leftJoin('INSPECTORS as verifier', 'n.data_verified_by_id', 'verifier.inspector_id')
            .leftJoin('INSPECTORS as checker', 'n.checker_id', 'checker.inspector_id')
            .leftJoin('INSPECTORS as approver', 'n.approver_id', 'approver.inspector_id')
            .leftJoin('USERS as checker_user', 'n.checker_id', 'checker_user.user_id')
            .leftJoin('USERS as approver_user', 'n.approver_id', 'approver_user.user_id')
            .selectAll('n')
            .select([
            's.site_name',
            sql `${sql.ref('s.site_code')}`.as('site_code'),
            'sup.supplier_name',
            'p.part_name',
            'p.part_code',
            'p.partclass_id',
            'p.parttype_id',
            'm.model_name',
            'pt.parttype_name',
            'pc.partclass_name',
            'im.inspectionmethod_name',
            'ic.inspectioncat_name',
            'sev.severity_name',
            'disp.disposition_name',
            'insp.inspector_name as inspected_by_name',
            'verifier.inspector_name as data_verified_by_name',
            sql `COALESCE(${sql.ref('checker.inspector_name')}, ${sql.ref('checker_user.full_name')})`.as('checker_name'),
            sql `COALESCE(${sql.ref('approver.inspector_name')}, ${sql.ref('approver_user.full_name')})`.as('approver_name')
        ])
            .where((eb) => eb.or([
            eb('n.npi_lot_id', '=', idOrControlNo),
            eb('n.control_no', '=', idOrControlNo)
        ]))
            .executeTakeFirst();
        if (!record)
            return null;
        const attachments = await db.selectFrom('NPI_ATTACHMENT')
            .selectAll()
            .where('npi_lot_id', '=', record.npi_lot_id)
            .execute();
        const visual_categories = await db.selectFrom('NPI_VISUALCAT')
            .selectAll()
            .where('npi_lot_id', '=', record.npi_lot_id)
            .execute();
        const data_categories = await db.selectFrom('NPI_DATACAT')
            .selectAll()
            .where('npi_lot_id', '=', record.npi_lot_id)
            .execute();
        const dimension_categories = await db.selectFrom('NPI_DIMENSIONCAT')
            .selectAll()
            .where('npi_lot_id', '=', record.npi_lot_id)
            .execute();
        const noise_categories = await db.selectFrom('NPI_NOISECAT')
            .selectAll()
            .where('npi_lot_id', '=', record.npi_lot_id)
            .execute();
        const material_certificates = await db.selectFrom('NPI_MATERIALCERT')
            .selectAll()
            .where('npi_lot_id', '=', record.npi_lot_id)
            .execute();
        const cc_list = await db.selectFrom('NPI_CC as cc')
            .leftJoin('INSPECTORS as i', 'cc.user_id', 'i.inspector_id')
            .select([
            'cc.npi_cc_id',
            'cc.npi_lot_id',
            'cc.user_id',
            'cc.last_update',
            'cc.updateby',
            'i.inspector_name as user_name'
        ])
            .where('cc.npi_lot_id', '=', record.npi_lot_id)
            .execute();
        return {
            record,
            attachments,
            visual_categories,
            data_categories,
            dimension_categories,
            noise_categories,
            material_certificates,
            cc_list,
        };
    }
    async findAttachmentOwner(attachmentId) {
        return await db
            .selectFrom('NPI_ATTACHMENT')
            .select(['npi_attachment_id', 'npi_lot_id'])
            .where('npi_attachment_id', '=', attachmentId)
            .executeTakeFirst();
    }
    async getNextSequence(prefix) {
        const result = await db.selectFrom('NPI_LOTS')
            .select('control_no')
            .where('control_no', 'like', `${prefix}%`)
            .orderBy('control_no', 'desc')
            .executeTakeFirst();
        return result?.control_no || null;
    }
    async findDefaultInspector() {
        const result = await db.selectFrom('INSPECTORS')
            .select('inspector_id')
            .where('active_flag', '=', 1)
            .executeTakeFirst();
        return result?.inspector_id || null;
    }
    async findUserContactById(userId) {
        if (!userId)
            return null;
        const userRow = await db
            .selectFrom('USERS as u')
            .select([
            'u.user_id as userId',
            'u.email as email',
            sql `${sql.ref('u.full_name')}`.as('name'),
        ])
            .where('u.user_id', '=', userId)
            .executeTakeFirst();
        if (userRow) {
            return {
                userId: userRow.userId,
                email: userRow.email,
                name: userRow.name,
            };
        }
        const inspectorRow = await db
            .selectFrom('INSPECTORS as i')
            .select([
            'i.inspector_id as userId',
            sql `NULL`.as('email'),
            'i.inspector_name as name',
        ])
            .where('i.inspector_id', '=', userId)
            .executeTakeFirst();
        if (!inspectorRow) {
            return null;
        }
        return {
            userId: inspectorRow.userId,
            email: inspectorRow.email,
            name: inspectorRow.name,
        };
    }
    async findNotificationContextById(id) {
        const row = await db
            .selectFrom('NPI_LOTS as n')
            .leftJoin('SUPPLIERS as sup', 'n.supplier_id', 'sup.supplier_id')
            .leftJoin('USERS as inspector_user', 'n.inspector_id', 'inspector_user.user_id')
            .leftJoin('INSPECTORS as inspector_master', 'n.inspector_id', 'inspector_master.inspector_id')
            .leftJoin('USERS as checker_user', 'n.checker_id', 'checker_user.user_id')
            .leftJoin('INSPECTORS as checker_master', 'n.checker_id', 'checker_master.inspector_id')
            .leftJoin('USERS as approver_user', 'n.approver_id', 'approver_user.user_id')
            .leftJoin('INSPECTORS as approver_master', 'n.approver_id', 'approver_master.inspector_id')
            .select([
            'n.npi_lot_id as recordId',
            'n.control_no as controlNo',
            sql `COALESCE(${sql.ref('sup.supplier_name')}, '')`.as('supplierName'),
            sql `${sql.ref('n.inspector_id')}`.as('inspectorId'),
            sql `${sql.ref('inspector_user.email')}`.as('inspectorEmail'),
            sql `COALESCE(${sql.ref('inspector_user.full_name')}, ${sql.ref('inspector_master.inspector_name')}, ${sql.ref('n.inspector_id')})`.as('inspectorName'),
            sql `${sql.ref('n.checker_id')}`.as('checkerId'),
            sql `${sql.ref('checker_user.email')}`.as('checkerEmail'),
            sql `COALESCE(${sql.ref('checker_user.full_name')}, ${sql.ref('checker_master.inspector_name')}, ${sql.ref('n.checker_id')})`.as('checkerName'),
            sql `${sql.ref('n.approver_id')}`.as('approverId'),
            sql `${sql.ref('approver_user.email')}`.as('approverEmail'),
            sql `COALESCE(${sql.ref('approver_user.full_name')}, ${sql.ref('approver_master.inspector_name')}, ${sql.ref('n.approver_id')})`.as('approverName'),
        ])
            .where('n.npi_lot_id', '=', id)
            .executeTakeFirst();
        if (!row) {
            return null;
        }
        const ccRows = await db
            .selectFrom('NPI_CC as cc')
            .leftJoin('USERS as u', 'cc.user_id', 'u.user_id')
            .leftJoin('INSPECTORS as i', 'cc.user_id', 'i.inspector_id')
            .select([
            'cc.user_id as userId',
            'u.email as email',
            sql `COALESCE(${sql.ref('u.full_name')}, ${sql.ref('i.inspector_name')}, ${sql.ref('cc.user_id')})`.as('name'),
        ])
            .where('cc.npi_lot_id', '=', id)
            .execute();
        return {
            recordId: row.recordId,
            controlNo: row.controlNo,
            supplierName: row.supplierName,
            inspector: row.inspectorId
                ? {
                    userId: row.inspectorId,
                    email: row.inspectorEmail,
                    name: row.inspectorName,
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
    async executeTransaction(callback) {
        return await db.transaction().execute(async (trx) => {
            return await callback(trx);
        });
    }
}
export const npiRepository = new NpiRepository();
