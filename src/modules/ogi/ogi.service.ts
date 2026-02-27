import { v4 as uuidv4 } from 'uuid';
import { ogiRepository } from './ogi.repository.js';
import { OGICreationInput, OGIUpdateInput } from './ogi.schema.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { mapStatusFromDB, mapStatusToDB } from '../../shared/utils/status-mapper.js';

export class OgiService {
  
  async generateSequence(siteId: string): Promise<string> {
    const d = new Date();
    const year = d.getFullYear().toString().slice(-2);
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `OGI-${siteId}-${year}-${month}-`;

    const lastSeq = await ogiRepository.getNextSequence(prefix);
    let nextNum = 1;
    if (lastSeq) {
      const parts = lastSeq.split('-');
      const numPart = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(numPart)) {
        nextNum = numPart + 1;
      }
    }
    return `${prefix}${nextNum.toString().padStart(4, '0')}`;
  }

  async getAllRecords() {
    const records = await ogiRepository.findAllDetailed();
    if (records.length === 0) return [];

    const ogiIds = records.map((r: any) => r.ogi_id);
    const allLots = await ogiRepository.fetchLotsByOgiIds(ogiIds);
    const allAttachments = await ogiRepository.fetchAttachmentsByOgiIds(ogiIds);

    return records.map((r: any) => {
      const rLots = allLots.filter((l: any) => l.ogi_id === r.ogi_id).map((l: any) => ({
        id: l.ogi_lot_id,
        lotNo: l.lot_no,
        invoiceNo: l.invoice_no,
        lotSize: l.lot_size
      }));

      const rAtts = allAttachments.filter((a: any) => a.ogi_id === r.ogi_id).map((a: any) => ({
        id: a.ogi_attachment_id,
        fileName: a.file_name,
        uploadedBy: a.updateby,
        remarks: a.remarks
      }));

      return {
        ...r,
        status: mapStatusFromDB(r.request_status),
        created_at: r.upload_date,
        lots: rLots,
        attachments: rAtts
      };
    });
  }

  async getRecordById(id: string) {
    const data = await ogiRepository.findByIdDetailed(id);
    if (!data) throw new NotFoundError('OGI Record not found');

    const { record, lots, attachments } = data;

    return {
      ...record,
      status: mapStatusFromDB(record.request_status),
      created_at: record.upload_date,
      lots: (lots || []).map((l: any) => ({
        id: l.ogi_lot_id,
        lotNo: l.lot_no,
        invoiceNo: l.invoice_no,
        lotSize: l.lot_size
      })),
      attachments: (attachments || []).map((a: any) => ({
        id: a.ogi_attachment_id,
        fileName: a.file_name,
        uploadedBy: a.updateby,
        remarks: a.remarks
      }))
    };
  }

  async createRecord(payload: OGICreationInput, userId: string, files: any[] = []) {
    const recordId = uuidv4();
    const now = new Date();
    const defaultUserId = '6a15b66a-079b-433b-b70f-dc15dce25631'; 
    const effectiveUserId = userId && userId !== 'current_user' ? userId : defaultUserId;
    
    const dbStatus = mapStatusToDB(payload.status || 'DRAFT');

    const dbPayload = {
        ogi_id: recordId,
        control_no: payload.controlNo,
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
      // 1. Insert Main Record
      await trx.insertInto('OGI').values(dbPayload).execute();

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
          const originalName = att.file_name || att.fileName;
          if (!originalName) continue;
          
          const uploadedFile = files.find(f => f.originalname === originalName);
          const diskFileName = uploadedFile ? uploadedFile.filename : originalName;
          const finalRemarks = (att.remarks ? `${att.remarks} (Original: ${originalName})` : `Original: ${originalName}`).slice(0, 200);

          await trx.insertInto('OGI_ATTACHMENT').values({
            ogi_attachment_id: att.id || att.ogi_attachment_id || uuidv4(),
            ogi_id: recordId,
            file_name: diskFileName || 'Unknown',
            file_extension: diskFileName ? diskFileName.split('.').pop()! : (att.file_extension || null),
            remarks: finalRemarks,
            last_update: now,
            updateby: effectiveUserId
          }).execute();
        }
      }

      return { success: true, id: recordId, message: 'OGI Record created successfully' };
    });
  }

  async updateRecord(id: string, payload: OGIUpdateInput, userId: string, files: any[] = []) {
    const existing = await ogiRepository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('Record not found');
    
    const now = new Date();
    const effectiveUserId = userId || 'SYSTEM';

    const dbUpdates: any = {
      last_update: now,
      updateby: effectiveUserId
    };

    if (payload.siteId) dbUpdates.site_id = payload.siteId;
    if (payload.supplierId) dbUpdates.supplier_id = payload.supplierId;
    if (payload.partId) dbUpdates.part_id = payload.partId;
    if (payload.remarks !== undefined) dbUpdates.remarks = payload.remarks;

    const statusVal = payload.status || payload.request_status;
    if (statusVal) {
      dbUpdates.request_status = mapStatusToDB(statusVal);
      if (dbUpdates.request_status === 'SB' && existing.record.request_status !== 'SB') {
         dbUpdates.submit_date = now;
      }
    }

    return await ogiRepository.executeTransaction(async (trx) => {
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
            const originalName = att.file_name || att.fileName;
            if (!originalName) continue;
            
            const uploadedFile = files.find(f => f.originalname === originalName);
            const diskFileName = uploadedFile ? uploadedFile.filename : originalName;
            const finalRemarks = (att.remarks ? `${att.remarks} (Original: ${originalName})` : `Original: ${originalName}`).slice(0, 200);
  
            await trx.insertInto('OGI_ATTACHMENT').values({
              ogi_attachment_id: att.id || att.ogi_attachment_id || uuidv4(),
              ogi_id: existing.record.ogi_id,
              file_name: diskFileName || 'Unknown',
              file_extension: diskFileName ? diskFileName.split('.').pop()! : (att.file_extension || null),
              remarks: finalRemarks,
              last_update: now,
              updateby: effectiveUserId
            }).execute();
          }
      }

      return { success: true, message: 'OGI Record updated successfully' };
    });
  }
  /**
   * Dedicated submit: DRAFT → SUBMITTED
   * Directly updates request_status without going through generic updateRecord
   */
  async submitRecord(idOrControlNo: string, userId: string) {
    const existing = await ogiRepository.findByIdDetailed(idOrControlNo);
    if (!existing) throw new NotFoundError('OGI Record not found');

    const currentStatus = mapStatusFromDB(existing.record.request_status);
    console.log(`[OGI] submitRecord: id=${idOrControlNo}, ogi_id=${existing.record.ogi_id}, currentStatus=${currentStatus}, dbStatus=${existing.record.request_status}`);

    if (currentStatus !== 'DRAFT') {
      throw new Error(`Cannot submit: record is in ${currentStatus}, expected DRAFT`);
    }

    const now = new Date();
    return await ogiRepository.executeTransaction(async (trx) => {
      await trx.updateTable('OGI')
        .set({
          request_status: mapStatusToDB('SUBMITTED'),
          submit_date: now,
          last_update: now,
          updateby: userId
        })
        .where('ogi_id', '=', existing.record.ogi_id)
        .execute();

      console.log(`[OGI] submitRecord: SUCCESS — status changed to SU for ogi_id=${existing.record.ogi_id}`);
      return { success: true, message: 'OGI Record submitted successfully' };
    });
  }
  /**
   * Deletes an OGI record and all child tables
   */
  async deleteRecord(id: string) {
    const existing = await ogiRepository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('OGI Record not found');

    const ogiId = existing.record.ogi_id;

    return await ogiRepository.executeTransaction(async (trx) => {
      await trx.deleteFrom('OGI_LOTS').where('ogi_id', '=', ogiId).execute();
      await trx.deleteFrom('OGI_ATTACHMENT').where('ogi_id', '=', ogiId).execute();
      await trx.deleteFrom('OGI').where('ogi_id', '=', ogiId).execute();
      return { success: true, message: 'OGI Record deleted successfully' };
    });
  }
}

export const ogiService = new OgiService();
