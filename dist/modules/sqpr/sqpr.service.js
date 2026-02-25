import { v4 as uuidv4 } from 'uuid';
import { sqprRepository } from './sqpr.repository.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { mapStatusFromDB, mapStatusToDB } from '../../shared/utils/status-mapper.js';
export class SqprService {
    /**
     * Helper: Generate Control No
     */
    async generateControlNo(fiscalYear, reportType) {
        const typeStr = reportType === 1 ? 'M' : 'Q';
        // In production, should get MAX() + 1
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `SFR-${fiscalYear}-${typeStr}-C${random}`;
    }
    /**
     * Safe Date Parser
     */
    parseDate(d) {
        if (!d)
            return null;
        const parsed = new Date(d);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    async getAllRecords() {
        const records = await sqprRepository.findAllDetailed();
        return records.map((r) => ({
            ...r,
            status: mapStatusFromDB(r.request_status),
            created_at: r.date_created,
            // Overwrite DB flat rows back to expected UI names if needed
            incharge_name: r.incharge_name,
            attention_name: r.attention_name,
            checker_name: r.checker_name,
            approver_name: r.approver_name,
            site_name: r.site_name,
            supplier_name: r.supplier_name
        }));
    }
    async getRecordById(id) {
        const data = await sqprRepository.findByIdDetailed(id);
        if (!data)
            throw new NotFoundError('SQPR Record not found');
        const { record, attachments, ccList } = data;
        return {
            ...record,
            status: mapStatusFromDB(record.request_status),
            created_at: record.date_created,
            attachments: attachments || [],
            cc_list: ccList || []
        };
    }
    async createRecord(payload, userId, files = []) {
        const sqprId = uuidv4();
        const now = new Date();
        const controlNo = await this.generateControlNo(payload.fiscal_year, payload.report_type);
        const dbPayload = {
            sqpr_id: sqprId,
            control_no: controlNo,
            site_id: payload.site_id,
            fiscal_year: payload.fiscal_year,
            report_type: payload.report_type,
            month: payload.month || 1,
            supplier_id: payload.supplierId || payload.supplier_id || null,
            attention_id: payload.attentionId || payload.attention_id || null,
            attention: payload.attention || null,
            file_id: uuidv4(),
            file_name: 'Pending',
            file_extension: 'pdf',
            remarks: payload.remarks || null,
            date_created: now,
            incharge_id: userId,
            incharge_remarks: payload.incharge_remarks || null,
            request_status: mapStatusToDB('DRAFT'),
            last_update: now,
            updateby: userId
        };
        return await sqprRepository.executeTransaction(async (trx) => {
            // 1. Insert Main Record
            await trx.insertInto('SQPR').values(dbPayload).execute();
            // 2. Insert Attachments
            if (payload.attachments && payload.attachments.length > 0) {
                for (const att of payload.attachments) {
                    const uploadedFile = files.find(f => f.originalname === att.file_name);
                    const diskFileName = uploadedFile ? uploadedFile.filename : att.file_name;
                    const originalName = att.file_name;
                    const finalRemarks = att.remarks ? `${att.remarks} (Original: ${originalName})` : `Original: ${originalName}`;
                    await trx.insertInto('SQPR_ATTACHMENT').values({
                        sqpr_attachment_id: uuidv4(),
                        sqpr_id: sqprId,
                        file_name: diskFileName || 'Unknown',
                        file_extension: diskFileName ? diskFileName.split('.').pop() : (att.file_extension || 'dat'),
                        attachment_type: att.attachment_type || 'COVER',
                        remarks: finalRemarks,
                        last_update: now,
                        updateby: userId
                    }).execute();
                }
            }
            // 3. Insert CC List
            if (payload.cc_list && payload.cc_list.length > 0) {
                for (const cc of payload.cc_list) {
                    await trx.insertInto('SQPR_CC').values({
                        sqpr_cc_id: uuidv4(),
                        sqpr_id: sqprId,
                        user_id: cc.user_id,
                        last_update: now,
                        updateby: userId
                    }).execute();
                }
            }
            return { success: true, sqpr_id: sqprId, message: 'Record created successfully' };
        });
    }
    async updateRecord(id, payload, userId, files = []) {
        const existing = await sqprRepository.findByIdDetailed(id);
        if (!existing)
            throw new NotFoundError('Record not found');
        const now = new Date();
        const dbUpdates = {
            last_update: now,
            updateby: userId
        };
        if (payload.site_id)
            dbUpdates.site_id = payload.site_id;
        if (payload.fiscal_year)
            dbUpdates.fiscal_year = payload.fiscal_year;
        if (payload.report_type)
            dbUpdates.report_type = payload.report_type;
        if (payload.month)
            dbUpdates.month = payload.month;
        if (payload.supplier_id !== undefined)
            dbUpdates.supplier_id = payload.supplier_id;
        if (payload.attention_id !== undefined)
            dbUpdates.attention_id = payload.attention_id;
        if (payload.attention !== undefined)
            dbUpdates.attention = payload.attention;
        if (payload.remarks !== undefined)
            dbUpdates.remarks = payload.remarks;
        // Status Mapping
        const statusVal = payload.status || payload.request_status;
        if (statusVal)
            dbUpdates.request_status = mapStatusToDB(statusVal);
        if (payload.incharge_id)
            dbUpdates.incharge_id = payload.incharge_id;
        if (payload.incharge_remarks !== undefined)
            dbUpdates.incharge_remarks = payload.incharge_remarks;
        if (payload.checker_id)
            dbUpdates.checker_id = payload.checker_id;
        if (payload.checker_remarks !== undefined)
            dbUpdates.checker_remarks = payload.checker_remarks;
        if (payload.checker_date)
            dbUpdates.checker_date = this.parseDate(payload.checker_date);
        if (payload.approver_id)
            dbUpdates.approver_id = payload.approver_id;
        if (payload.approver_remarks !== undefined)
            dbUpdates.approver_remarks = payload.approver_remarks;
        if (payload.approver_date)
            dbUpdates.approver_date = this.parseDate(payload.approver_date);
        return await sqprRepository.executeTransaction(async (trx) => {
            // 1. Update Header
            if (Object.keys(dbUpdates).length > 2) {
                await trx.updateTable('SQPR')
                    .set(dbUpdates)
                    .where('sqpr_id', '=', existing.record.sqpr_id)
                    .execute();
            }
            // 2. Refresh Attachments (Delete & Re-insert)
            if (payload.attachments !== undefined) {
                await trx.deleteFrom('SQPR_ATTACHMENT').where('sqpr_id', '=', existing.record.sqpr_id).execute();
                for (const att of payload.attachments) {
                    const uploadedFile = files.find(f => f.originalname === att.file_name);
                    const diskFileName = uploadedFile ? uploadedFile.filename : att.file_name;
                    const originalName = att.file_name;
                    const finalRemarks = att.remarks ? `${att.remarks} (Original: ${originalName})` : `Original: ${originalName}`;
                    await trx.insertInto('SQPR_ATTACHMENT').values({
                        sqpr_attachment_id: att.sqpr_attachment_id || uuidv4(),
                        sqpr_id: existing.record.sqpr_id,
                        file_name: diskFileName || 'Unknown',
                        file_extension: diskFileName ? diskFileName.split('.').pop() : (att.file_extension || 'dat'),
                        attachment_type: att.attachment_type || 'COVER',
                        remarks: finalRemarks,
                        last_update: now,
                        updateby: userId
                    }).execute();
                }
            }
            // 3. Refresh CC (Delete & Re-insert)
            if (payload.cc_list !== undefined) {
                await trx.deleteFrom('SQPR_CC').where('sqpr_id', '=', existing.record.sqpr_id).execute();
                for (const cc of payload.cc_list) {
                    await trx.insertInto('SQPR_CC').values({
                        sqpr_cc_id: cc.sqpr_cc_id || uuidv4(),
                        sqpr_id: existing.record.sqpr_id,
                        user_id: cc.user_id,
                        last_update: now,
                        updateby: userId
                    }).execute();
                }
            }
            return { success: true, message: 'Record updated successfully' };
        });
    }
    async deleteRecord(id) {
        const existing = await sqprRepository.findByIdDetailed(id);
        if (!existing)
            throw new NotFoundError('Record not found');
        return await sqprRepository.executeTransaction(async (trx) => {
            await trx.deleteFrom('SQPR_ATTACHMENT').where('sqpr_id', '=', existing.record.sqpr_id).execute();
            await trx.deleteFrom('SQPR_CC').where('sqpr_id', '=', existing.record.sqpr_id).execute();
            await trx.deleteFrom('SQPR').where('sqpr_id', '=', existing.record.sqpr_id).execute();
            return { success: true, message: 'Record deleted successfully' };
        });
    }
}
export const sqprService = new SqprService();
