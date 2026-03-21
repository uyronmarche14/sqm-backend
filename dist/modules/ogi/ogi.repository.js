// @ts-ignore
import { db } from '../../shared/infrastructure/db.js';
import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';
import { sql } from 'kysely';
export class OgiRepository extends BaseRepository {
    constructor() {
        super('OGI');
    }
    async findAllDetailed() {
        return await db.selectFrom('OGI as o')
            .leftJoin('MFG_SITES as s', 'o.site_id', 's.site_id')
            .leftJoin('SUPPLIERS as sup', 'o.supplier_id', 'sup.supplier_id')
            .leftJoin('PARTS as p', 'o.part_id', 'p.part_id')
            .selectAll('o')
            .select([
            sql `${sql.ref('s.site_code')}`.as('site_code'),
            's.site_name',
            'sup.supplier_name',
            'p.part_code',
            'p.part_name'
        ])
            .orderBy('o.upload_date', 'desc')
            .execute();
    }
    async findByIdDetailed(idOrControlNo) {
        const record = await db.selectFrom('OGI as o')
            .leftJoin('MFG_SITES as s', 'o.site_id', 's.site_id')
            .leftJoin('SUPPLIERS as sup', 'o.supplier_id', 'sup.supplier_id')
            .leftJoin('PARTS as p', 'o.part_id', 'p.part_id')
            .selectAll('o')
            .select([
            sql `${sql.ref('s.site_code')}`.as('site_code'),
            's.site_name',
            'sup.supplier_name',
            'p.part_code',
            'p.part_name'
        ])
            .where((eb) => eb.or([
            eb('o.ogi_id', '=', idOrControlNo),
            eb('o.control_no', '=', idOrControlNo)
        ]))
            .executeTakeFirst();
        if (!record)
            return null;
        const lots = await db.selectFrom('OGI_LOTS')
            .selectAll()
            .where('ogi_id', '=', record.ogi_id)
            .execute();
        const attachments = await db.selectFrom('OGI_ATTACHMENT')
            .selectAll()
            .where('ogi_id', '=', record.ogi_id)
            .execute();
        return { record, lots, attachments };
    }
    async findAttachmentOwner(attachmentId) {
        const attachment = await db
            .selectFrom('OGI_ATTACHMENT')
            .select(['ogi_id'])
            .where('ogi_attachment_id', '=', attachmentId)
            .executeTakeFirst();
        return attachment || null;
    }
    async fetchLotsByOgiIds(ogiIds) {
        if (ogiIds.length === 0)
            return [];
        return await db.selectFrom('OGI_LOTS')
            .selectAll()
            .where('ogi_id', 'in', ogiIds)
            .execute();
    }
    async fetchAttachmentsByOgiIds(ogiIds) {
        if (ogiIds.length === 0)
            return [];
        return await db.selectFrom('OGI_ATTACHMENT')
            .selectAll()
            .where('ogi_id', 'in', ogiIds)
            .execute();
    }
    async getNextSequence(prefix) {
        const result = await db.selectFrom('OGI')
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
export const ogiRepository = new OgiRepository();
