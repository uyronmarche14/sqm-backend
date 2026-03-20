import { v4 as uuidv4 } from 'uuid';
import { ogiRepository } from './ogi.repository.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/AppError.js';
import { mapStatusFromDB, mapStatusToDB } from '../../shared/utils/status-mapper.js';
import { assertWorkflowRecordAccess, filterWorkflowRecordsByScope, } from '../../shared/utils/workflow-access.js';
import { controlNumberService } from '../../shared/services/control-number.service.js';
const OGI_DB_STATUS = {
    DRAFT: 'DR',
    SUBMITTED: 'SB',
};
function mapOgiStatusToDB(status) {
    const normalized = String(status || 'DRAFT').toUpperCase();
    if (normalized === 'DR' || normalized === 'DRAFT' || normalized === 'NEW') {
        return OGI_DB_STATUS.DRAFT;
    }
    if (normalized === 'SB' || normalized === 'SU' || normalized === 'SUBMITTED') {
        return OGI_DB_STATUS.SUBMITTED;
    }
    return mapStatusToDB(normalized);
}
function mapOgiStatusFromDB(code) {
    const normalized = String(code || OGI_DB_STATUS.DRAFT).toUpperCase();
    if (normalized === 'SB' || normalized === 'SU') {
        return 'SUBMITTED';
    }
    return mapStatusFromDB(normalized);
}
export class OgiService {
    assertSubmitControlNoInputs(input) {
        if (!input.siteId && !input.siteCode) {
            throw new BadRequestError('Site is required before submitting this OGI record.');
        }
    }
    isAdminActor(actor) {
        return (actor?.roleName || '').toUpperCase().includes('ADMIN');
    }
    canReadRecord(record, actor) {
        if (!actor?.userId || this.isAdminActor(actor)) {
            return true;
        }
        return record.incharge_id === actor.userId;
    }
    canMutateRecord(record, actor) {
        if (!actor?.userId || this.isAdminActor(actor)) {
            return true;
        }
        return record.incharge_id === actor.userId;
    }
    async generateSequence(siteId) {
        return controlNumberService.buildOgiDraft({ siteId });
    }
    async getAllRecords(actor, scope = 'history') {
        const records = await ogiRepository.findAllDetailed();
        if (records.length === 0)
            return [];
        const ogiIds = records.map((r) => r.ogi_id);
        const allLots = await ogiRepository.fetchLotsByOgiIds(ogiIds);
        const allAttachments = await ogiRepository.fetchAttachmentsByOgiIds(ogiIds);
        const visibleRecords = this.isAdminActor(actor)
            ? records
            : filterWorkflowRecordsByScope(records, scope, {
                isAssigned: (record) => this.canReadRecord(record, actor),
                isMine: (record) => this.canReadRecord(record, actor),
                isHistoryVisible: (record) => this.canReadRecord(record, actor),
            });
        return visibleRecords.map((r) => {
            const rLots = allLots.filter((l) => l.ogi_id === r.ogi_id).map((l) => ({
                id: l.ogi_lot_id,
                lotNo: l.lot_no,
                invoiceNo: l.invoice_no,
                lotSize: l.lot_size
            }));
            const rAtts = allAttachments.filter((a) => a.ogi_id === r.ogi_id).map((a) => ({
                id: a.ogi_attachment_id,
                fileName: a.file_name,
                uploadedBy: a.updateby,
                remarks: a.remarks
            }));
            return {
                ...r,
                status: mapOgiStatusFromDB(r.request_status),
                created_at: r.upload_date,
                lots: rLots,
                attachments: rAtts
            };
        });
    }
    async getRecordById(id, actor) {
        const data = await ogiRepository.findByIdDetailed(id);
        if (!data)
            throw new NotFoundError('OGI Record not found');
        assertWorkflowRecordAccess({
            allowed: this.canReadRecord(data.record, actor),
            action: 'view',
            moduleName: 'OGI',
        });
        const { record, lots, attachments } = data;
        return {
            ...record,
            status: mapOgiStatusFromDB(record.request_status),
            created_at: record.upload_date,
            lots: (lots || []).map((l) => ({
                id: l.ogi_lot_id,
                lotNo: l.lot_no,
                invoiceNo: l.invoice_no,
                lotSize: l.lot_size
            })),
            attachments: (attachments || []).map((a) => ({
                id: a.ogi_attachment_id,
                fileName: a.file_name,
                uploadedBy: a.updateby,
                remarks: a.remarks
            }))
        };
    }
    async createRecord(payload, userId, files = []) {
        const recordId = uuidv4();
        const now = new Date();
        const defaultUserId = '6a15b66a-079b-433b-b70f-dc15dce25631';
        const effectiveUserId = userId && userId !== 'current_user' ? userId : defaultUserId;
        const dbStatus = mapOgiStatusToDB(payload.status || 'DRAFT');
        const isSubmittedOnCreate = dbStatus === OGI_DB_STATUS.SUBMITTED;
        if (isSubmittedOnCreate) {
            this.assertSubmitControlNoInputs({ siteId: payload.siteId });
        }
        const dbPayload = {
            ogi_id: recordId,
            control_no: '',
            upload_date: now,
            site_id: payload.siteId,
            supplier_id: payload.supplierId,
            part_id: payload.partId,
            remarks: payload.remarks || null,
            incharge_id: effectiveUserId,
            request_status: dbStatus,
            submit_date: dbStatus === 'SB' ? now : null,
            last_update: now,
            updateby: effectiveUserId
        };
        return await ogiRepository.executeTransaction(async (trx) => {
            const controlNo = isSubmittedOnCreate
                ? await controlNumberService.finalizeOgi({
                    siteId: payload.siteId,
                    date: now,
                }, trx)
                : await controlNumberService.buildOgiDraft({
                    siteId: payload.siteId,
                    date: now,
                }, trx);
            // 1. Insert Main Record
            await trx.insertInto('OGI').values({
                ...dbPayload,
                control_no: controlNo,
            }).execute();
            // 2. Insert Lots
            if (payload.lots && payload.lots.length > 0) {
                for (const lot of payload.lots) {
                    await trx.insertInto('OGI_LOTS').values({
                        ogi_lot_id: lot.id || lot.ogi_lot_id || uuidv4(),
                        ogi_id: recordId,
                        lot_no: lot.lotNo,
                        invoice_no: lot.invoiceNo,
                        lot_size: lot.lotSize,
                        last_update: now,
                        updateby: effectiveUserId
                    }).execute();
                }
            }
            // 3. Insert Attachments
            if (payload.attachments && payload.attachments.length > 0) {
                for (const att of payload.attachments) {
                    const originalName = att.fileName;
                    if (!originalName)
                        continue;
                    const uploadedFile = files.find(f => f.originalname === originalName);
                    const diskFileName = uploadedFile ? uploadedFile.filename : originalName;
                    const finalRemarks = (att.remarks ? `${att.remarks} (Original: ${originalName})` : `Original: ${originalName}`).slice(0, 200);
                    await trx.insertInto('OGI_ATTACHMENT').values({
                        ogi_attachment_id: att.id || att.ogi_attachment_id || uuidv4(),
                        ogi_id: recordId,
                        file_name: diskFileName || 'Unknown',
                        file_extension: diskFileName ? diskFileName.split('.').pop() : (att.file_extension || null),
                        remarks: finalRemarks,
                        last_update: now,
                        updateby: effectiveUserId
                    }).execute();
                }
            }
            return {
                success: true,
                data: {
                    id: recordId,
                    recordId,
                    controlNo,
                    controlNoState: controlNumberService.getControlNoState(controlNo),
                },
                message: 'OGI Record created successfully'
            };
        });
    }
    async updateRecord(id, payload, actor, files = []) {
        const existing = await ogiRepository.findByIdDetailed(id);
        if (!existing)
            throw new NotFoundError('Record not found');
        assertWorkflowRecordAccess({
            allowed: this.canMutateRecord(existing.record, actor),
            action: 'update',
            moduleName: 'OGI',
        });
        const now = new Date();
        const effectiveUserId = actor.userId || 'SYSTEM';
        const dbUpdates = {
            last_update: now,
            updateby: effectiveUserId
        };
        if (payload.siteId)
            dbUpdates.site_id = payload.siteId;
        if (payload.supplierId)
            dbUpdates.supplier_id = payload.supplierId;
        if (payload.partId)
            dbUpdates.part_id = payload.partId;
        if (payload.remarks !== undefined)
            dbUpdates.remarks = payload.remarks;
        const statusVal = payload.status || payload.request_status;
        if (statusVal) {
            dbUpdates.request_status = mapOgiStatusToDB(statusVal);
            if (dbUpdates.request_status === 'SB' && existing.record.request_status !== 'SB') {
                dbUpdates.submit_date = now;
            }
        }
        return await ogiRepository.executeTransaction(async (trx) => {
            if (dbUpdates.request_status === 'SB' && existing.record.request_status !== 'SB') {
                this.assertSubmitControlNoInputs({
                    siteId: dbUpdates.site_id || existing.record.site_id,
                    siteCode: existing.record.site_code,
                });
                dbUpdates.control_no = await controlNumberService.finalizeOgi({
                    siteId: dbUpdates.site_id || existing.record.site_id,
                    siteCode: existing.record.site_code,
                    date: now,
                }, trx);
            }
            // 1. Update Base Record
            if (Object.keys(dbUpdates).length > 2) {
                await trx.updateTable('OGI')
                    .set(dbUpdates)
                    .where('ogi_id', '=', existing.record.ogi_id)
                    .execute();
            }
            // 2. Lots
            if (payload.lots !== undefined) {
                await trx.deleteFrom('OGI_LOTS').where('ogi_id', '=', existing.record.ogi_id).execute();
                for (const lot of payload.lots) {
                    await trx.insertInto('OGI_LOTS').values({
                        ogi_lot_id: lot.id || lot.ogi_lot_id || uuidv4(),
                        ogi_id: existing.record.ogi_id,
                        lot_no: lot.lotNo,
                        invoice_no: lot.invoiceNo,
                        lot_size: lot.lotSize,
                        last_update: now,
                        updateby: effectiveUserId
                    }).execute();
                }
            }
            // 3. Attachments
            if (payload.attachments !== undefined) {
                await trx.deleteFrom('OGI_ATTACHMENT').where('ogi_id', '=', existing.record.ogi_id).execute();
                for (const att of payload.attachments) {
                    const originalName = att.fileName;
                    if (!originalName)
                        continue;
                    const uploadedFile = files.find(f => f.originalname === originalName);
                    const diskFileName = uploadedFile ? uploadedFile.filename : originalName;
                    const finalRemarks = (att.remarks ? `${att.remarks} (Original: ${originalName})` : `Original: ${originalName}`).slice(0, 200);
                    await trx.insertInto('OGI_ATTACHMENT').values({
                        ogi_attachment_id: att.id || att.ogi_attachment_id || uuidv4(),
                        ogi_id: existing.record.ogi_id,
                        file_name: diskFileName || 'Unknown',
                        file_extension: diskFileName ? diskFileName.split('.').pop() : (att.file_extension || null),
                        remarks: finalRemarks,
                        last_update: now,
                        updateby: effectiveUserId
                    }).execute();
                }
            }
            const controlNo = String(dbUpdates.control_no || existing.record.control_no || '');
            return {
                success: true,
                data: {
                    id,
                    recordId: existing.record.ogi_id,
                    controlNo,
                    controlNoState: controlNumberService.getControlNoState(controlNo),
                },
                message: 'OGI Record updated successfully'
            };
        });
    }
    /**
     * Dedicated submit: DRAFT → SUBMITTED
     * Directly updates request_status without going through generic updateRecord
     */
    async submitRecord(idOrControlNo, userId) {
        const existing = await ogiRepository.findByIdDetailed(idOrControlNo);
        if (!existing)
            throw new NotFoundError('OGI Record not found');
        const currentStatus = mapOgiStatusFromDB(existing.record.request_status);
        if (currentStatus !== 'DRAFT') {
            throw new Error(`Cannot submit: record is in ${currentStatus}, expected DRAFT`);
        }
        const now = new Date();
        let controlNo = String(existing.record.control_no || '');
        return await ogiRepository.executeTransaction(async (trx) => {
            this.assertSubmitControlNoInputs({
                siteId: existing.record.site_id,
                siteCode: existing.record.site_code,
            });
            controlNo = await controlNumberService.finalizeOgi({
                siteId: existing.record.site_id,
                siteCode: existing.record.site_code,
                date: now,
            }, trx);
            await trx.updateTable('OGI')
                .set({
                control_no: controlNo,
                request_status: OGI_DB_STATUS.SUBMITTED,
                submit_date: now,
                last_update: now,
                updateby: userId
            })
                .where('ogi_id', '=', existing.record.ogi_id)
                .execute();
            return {
                success: true,
                data: {
                    id: existing.record.ogi_id,
                    recordId: existing.record.ogi_id,
                    controlNo,
                    controlNoState: controlNumberService.getControlNoState(controlNo),
                },
                message: 'OGI Record submitted successfully'
            };
        });
    }
    /**
     * Deletes an OGI record and all child tables
     */
    async deleteRecord(id, actor) {
        const existing = await ogiRepository.findByIdDetailed(id);
        if (!existing)
            throw new NotFoundError('OGI Record not found');
        assertWorkflowRecordAccess({
            allowed: this.canMutateRecord(existing.record, actor),
            action: 'delete',
            moduleName: 'OGI',
        });
        const ogiId = existing.record.ogi_id;
        return await ogiRepository.executeTransaction(async (trx) => {
            await trx.deleteFrom('OGI_LOTS').where('ogi_id', '=', ogiId).execute();
            await trx.deleteFrom('OGI_ATTACHMENT').where('ogi_id', '=', ogiId).execute();
            await trx.deleteFrom('OGI').where('ogi_id', '=', ogiId).execute();
            return { success: true, data: { id }, message: 'OGI Record deleted successfully' };
        });
    }
}
export const ogiService = new OgiService();
