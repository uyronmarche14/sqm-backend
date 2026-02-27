import { v4 as uuidv4 } from 'uuid';
import { sqmpRepository } from './sqmp.repository.js';
import { SQMPCreationInput, SQMPUpdateInput } from './sqmp.schema.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { mapStatusFromDB, mapStatusToDB } from '../../shared/utils/status-mapper.js';

export class SqmpService {
  private async generateControlNo(fiscalYear?: number, semester?: string | number): Promise<string> {
    const fy = fiscalYear || new Date().getFullYear();
    const sem = semester?.toString().toUpperCase() || '1ST';
    // In production, should get MAX() + 1
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SQMP-${fy}-${sem}-C${random}`;
  }

  private parseDate(d?: Date | string | null): Date | null {
      if (!d) return null;
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
  }

  private toDBSemester(sem?: string | number): number {
      if (sem === '1ST' || sem === 1) return 1;
      if (sem === '2ND' || sem === 2) return 2;
      return 1;
  }

  private fromDBSemester(sem: number): string {
      return sem === 2 ? '2ND' : '1ST';
  }

  async getAllRecords() {
    const records = await sqmpRepository.findAllDetailed();
    return records.map((r: any) => ({
      ...r,
      status: mapStatusFromDB(r.request_status),
      semester: this.fromDBSemester(r.semester),
      created_at: r.registration_date,
    }));
  }

  async getRecordById(id: string) {
    const data = await sqmpRepository.findByIdDetailed(id);
    if (!data) throw new NotFoundError('SQMP Record not found');

    const { record, mainDocuments, appendixDocuments, ccList } = data;

    return {
      ...record,
      status: mapStatusFromDB(record.request_status),
      semester: this.fromDBSemester(record.semester),
      main_documents: mainDocuments || [],
      appendix_documents: appendixDocuments || [],
      cc_list: ccList || []
    };
  }

  async createRecord(payload: SQMPCreationInput, userId: string, files: any[] = []) {
    const sqmpId = uuidv4();
    const now = new Date();
    const controlNo = await this.generateControlNo(payload.fiscal_year, payload.semester);

    const dbPayload = {
      sqmp_id: sqmpId,
      control_no: controlNo,
      registration_date: this.parseDate(payload.registration_date) || now,
      site_id: payload.site_id,
      supplier_id: payload.supplier_id || '',
      attention_id: payload.attention_id || '',
      fiscal_year: payload.fiscal_year || now.getFullYear(),
      semester: this.toDBSemester(payload.semester),
      issued_date: this.parseDate(payload.issued_date) || null,
      due_date: this.parseDate(payload.due_date) || now,
      model_id: payload.model_id || '',
      revision: payload.revision || 0,
      remarks: payload.remarks || null,
      main_document_remarks: payload.main_document_remarks || null,
      appendix_sheet_remarks: payload.appendix_sheet_remarks || null,
      encoder_id: userId,
      encoder_date: now,
      issuer_id: userId,
      issuer_remarks: null,
      request_status: mapStatusToDB('DRAFT'),
      last_update: now,
      updateby: userId
    };

    return await sqmpRepository.executeTransaction(async (trx) => {
      // 1. Insert Main
      await trx.insertInto('SQMP').values(dbPayload).execute();

      // 2. Insert Main Documents
      if (payload.main_documents?.length) {
        for (const doc of payload.main_documents) {
          const uploadedFile = files.find(f => f.originalname === doc.file_name);
          const diskFileName = uploadedFile ? uploadedFile.filename : doc.file_name;
          const originalName = doc.file_name;
          const finalRemarks = doc.remarks ? `${doc.remarks} (Original: ${originalName})` : `Original: ${originalName}`;

          await trx.insertInto('SQMP_DOCUMENT').values({
            sqmp_document_id: doc.sqmp_attachment_id || uuidv4(),
            sqmp_id: sqmpId,
            file_name: diskFileName || 'Unknown',
            file_extension: diskFileName ? diskFileName.split('.').pop()! : (doc.file_extension || 'dat'),
            remarks: finalRemarks,
            last_update: now,
            updateby: userId
          }).execute();
        }
      }

      // 3. Insert Appendix Documents
      if (payload.appendix_documents?.length) {
        for (const app of payload.appendix_documents) {
          const uploadedFile = files.find(f => f.originalname === app.file_name);
          const diskFileName = uploadedFile ? uploadedFile.filename : app.file_name;
          const originalName = app.file_name;
          const finalRemarks = app.remarks ? `${app.remarks} (Original: ${originalName})` : `Original: ${originalName}`;

          await trx.insertInto('SQMP_APPENDIX').values({
            sqmp_appendix_id: app.sqmp_attachment_id || uuidv4(),
            sqmp_id: sqmpId,
            file_name: diskFileName || 'Unknown',
            file_extension: diskFileName ? diskFileName.split('.').pop()! : (app.file_extension || 'dat'),
            remarks: finalRemarks,
            last_update: now,
            updateby: userId
          }).execute();
        }
      }

      // 4. CC List
      if (payload.cc_list?.length) {
        for (const cc of payload.cc_list) {
          await trx.insertInto('SQMP_CC').values({
            sqmp_cc_id: cc.sqmp_cc_id || uuidv4(),
            sqmp_id: sqmpId,
            user_id: cc.user_id,
            last_update: now,
            updateby: userId
          }).execute();
        }
      }

      return { success: true, sqmp_id: sqmpId, message: 'Record created successfully' };
    });
  }

  async updateRecord(id: string, payload: SQMPUpdateInput, userId: string, files: any[] = []) {
    const existing = await sqmpRepository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('Record not found');

    const now = new Date();
    const dbUpdates: any = {
      last_update: now,
      updateby: userId
    };

    if (payload.registration_date) dbUpdates.registration_date = this.parseDate(payload.registration_date);
    if (payload.site_id) dbUpdates.site_id = payload.site_id;
    if (payload.supplier_id !== undefined) dbUpdates.supplier_id = payload.supplier_id;
    if (payload.attention_id !== undefined) dbUpdates.attention_id = payload.attention_id;
    if (payload.fiscal_year) dbUpdates.fiscal_year = payload.fiscal_year;
    if (payload.semester) dbUpdates.semester = this.toDBSemester(payload.semester);
    if (payload.issued_date !== undefined) dbUpdates.issued_date = this.parseDate(payload.issued_date);
    if (payload.due_date) dbUpdates.due_date = this.parseDate(payload.due_date);
    if (payload.model_id !== undefined) dbUpdates.model_id = payload.model_id;
    if (payload.revision !== undefined) dbUpdates.revision = payload.revision;
    
    if (payload.remarks !== undefined) dbUpdates.remarks = payload.remarks;
    if (payload.main_document_remarks !== undefined) dbUpdates.main_document_remarks = payload.main_document_remarks;
    if (payload.appendix_sheet_remarks !== undefined) dbUpdates.appendix_sheet_remarks = payload.appendix_sheet_remarks;
    
    const statusVal = payload.status || payload.request_status;
    if (statusVal) dbUpdates.request_status = mapStatusToDB(statusVal);

    if (payload.issuer_id) dbUpdates.issuer_id = payload.issuer_id;
    if (payload.issuer_remarks !== undefined) dbUpdates.issuer_remarks = payload.issuer_remarks;
    if (payload.issuer_date !== undefined) dbUpdates.issuer_date = this.parseDate(payload.issuer_date);
    
    if (payload.checker_id) dbUpdates.checker_id = payload.checker_id;
    if (payload.checker_remarks !== undefined) dbUpdates.checker_remarks = payload.checker_remarks;
    if (payload.checker_date) dbUpdates.checker_date = this.parseDate(payload.checker_date);
    
    if (payload.approver_id) dbUpdates.approver_id = payload.approver_id;
    if (payload.approver_remarks !== undefined) dbUpdates.approver_remarks = payload.approver_remarks;
    if (payload.approver_date) dbUpdates.approver_date = this.parseDate(payload.approver_date);

    return await sqmpRepository.executeTransaction(async (trx) => {
      // 1. Update Header
      if (Object.keys(dbUpdates).length > 2) {
        await trx.updateTable('SQMP')
          .set(dbUpdates)
          .where('sqmp_id', '=', existing.record.sqmp_id)
          .execute();
      }

      // 2. Update Main Documents
      if (payload.main_documents !== undefined) {
        await trx.deleteFrom('SQMP_DOCUMENT').where('sqmp_id', '=', existing.record.sqmp_id).execute();
        for (const doc of payload.main_documents) {
          const uploadedFile = files.find(f => f.originalname === doc.file_name);
          const diskFileName = uploadedFile ? uploadedFile.filename : doc.file_name;
          const originalName = doc.file_name;
          const finalRemarks = doc.remarks ? `${doc.remarks} (Original: ${originalName})` : `Original: ${originalName}`;

          await trx.insertInto('SQMP_DOCUMENT').values({
            sqmp_document_id: doc.sqmp_attachment_id || uuidv4(),
            sqmp_id: existing.record.sqmp_id,
            file_name: diskFileName || 'Unknown',
            file_extension: diskFileName ? diskFileName.split('.').pop()! : (doc.file_extension || 'dat'),
            remarks: finalRemarks,
            last_update: now,
            updateby: userId
          }).execute();
        }
      }

      // 3. Update Appendix Documents
      if (payload.appendix_documents !== undefined) {
        await trx.deleteFrom('SQMP_APPENDIX').where('sqmp_id', '=', existing.record.sqmp_id).execute();
        for (const app of payload.appendix_documents) {
          const uploadedFile = files.find(f => f.originalname === app.file_name);
          const diskFileName = uploadedFile ? uploadedFile.filename : app.file_name;
          const originalName = app.file_name;
          const finalRemarks = app.remarks ? `${app.remarks} (Original: ${originalName})` : `Original: ${originalName}`;

          await trx.insertInto('SQMP_APPENDIX').values({
            sqmp_appendix_id: app.sqmp_attachment_id || uuidv4(),
            sqmp_id: existing.record.sqmp_id,
            file_name: diskFileName || 'Unknown',
            file_extension: diskFileName ? diskFileName.split('.').pop()! : (app.file_extension || 'dat'),
            remarks: finalRemarks,
            last_update: now,
            updateby: userId
          }).execute();
        }
      }

      // 4. CC List
      if (payload.cc_list !== undefined) {
          await trx.deleteFrom('SQMP_CC').where('sqmp_id', '=', existing.record.sqmp_id).execute();
          for (const cc of payload.cc_list) {
            await trx.insertInto('SQMP_CC').values({
              sqmp_cc_id: cc.sqmp_cc_id || uuidv4(),
              sqmp_id: existing.record.sqmp_id,
              user_id: cc.user_id,
              last_update: now,
              updateby: userId
            }).execute();
          }
      }

      return { success: true, message: 'Record updated successfully' };
    });
  }

    async deleteRecord(id: string) {
      const existing = await sqmpRepository.findByIdDetailed(id);
      if (!existing) throw new NotFoundError('Record not found');

      return await sqmpRepository.executeTransaction(async (trx) => {
          await trx.deleteFrom('SQMP_DOCUMENT').where('sqmp_id', '=', existing.record.sqmp_id).execute();
          await trx.deleteFrom('SQMP_APPENDIX').where('sqmp_id', '=', existing.record.sqmp_id).execute();
          await trx.deleteFrom('SQMP_CC').where('sqmp_id', '=', existing.record.sqmp_id).execute();
          await trx.deleteFrom('SQMP').where('sqmp_id', '=', existing.record.sqmp_id).execute();
          return { success: true, message: 'Record deleted successfully' };
      });
  }

  /**
   * Workflow: Issue the plan (APPROVED → ISSUED)
   */
  async issueRecord(id: string, userId: string, remarks?: string) {
    const existing = await sqmpRepository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('Record not found');

    const now = new Date();
    return await sqmpRepository.executeTransaction(async (trx) => {
      await trx.updateTable('SQMP')
        .set({
          request_status: 'ISS',
          issuer_id: userId,
          issuer_remarks: remarks || null,
          last_update: now,
          updateby: userId
        })
        .where('sqmp_id', '=', existing.record.sqmp_id)
        .execute();
      return { success: true, message: 'SQM Plan issued successfully' };
    });
  }

  /**
   * Workflow: Cancel the plan
   */
  async cancelRecord(id: string, userId: string, remarks?: string) {
    const existing = await sqmpRepository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('Record not found');

    const now = new Date();
    return await sqmpRepository.executeTransaction(async (trx) => {
      await trx.updateTable('SQMP')
        .set({
          request_status: 'CA',
          issuer_remarks: remarks || existing.record.issuer_remarks,
          last_update: now,
          updateby: userId
        })
        .where('sqmp_id', '=', existing.record.sqmp_id)
        .execute();
      return { success: true, message: 'SQM Plan cancelled successfully' };
    });
  }

  /**
   * Workflow: Close the plan
   */
  async closeRecord(id: string, userId: string, remarks?: string) {
    const existing = await sqmpRepository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('Record not found');

    const now = new Date();
    return await sqmpRepository.executeTransaction(async (trx) => {
      await trx.updateTable('SQMP')
        .set({
          request_status: 'CL',
          issuer_remarks: remarks || existing.record.issuer_remarks,
          last_update: now,
          updateby: userId
        })
        .where('sqmp_id', '=', existing.record.sqmp_id)
        .execute();
      return { success: true, message: 'SQM Plan closed successfully' };
    });
  }
}

export const sqmpService = new SqmpService();
