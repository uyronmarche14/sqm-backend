import { v4 as uuidv4 } from 'uuid';
import { qmqaRepository } from './qmqa.repository.js';
import { QMQAScheduleCreationInput, QMQAScheduleUpdateInput, QMQARecordCreationInput, QMQARecordUpdateInput } from './qmqa.schema.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { mapStatusFromDB, mapStatusToDB } from '../../shared/utils/status-mapper.js';

export class QmqaService {

  // ==========================================
  // SCHEDULES (Audit Plan)
  // ==========================================
  async generateControlNo(year: number, isSchedule: boolean = false): Promise<string> {
    const prefix = isSchedule ? `P-${year}-` : `A-${year}-`;
    const lastSeq = await qmqaRepository.getNextSequence(prefix);
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

  async getAllSchedules() {
    const schedules = await qmqaRepository.findAllSchedules();
    return schedules.map((s: any) => ({
      ...s,
      status: mapStatusFromDB(s.request_status),
      created_at: s.created_date,
    }));
  }

  async getScheduleById(id: string) {
    const s = await qmqaRepository.findScheduleById(id);
    if (!s) throw new NotFoundError('Schedule not found');
    return {
      ...s,
      status: mapStatusFromDB(s.request_status),
      created_at: s.created_date,
    };
  }

  async createSchedule(payload: QMQAScheduleCreationInput, userId: string) {
    const id = uuidv4();
    const now = new Date();
    const effectiveUserId = userId || 'SYSTEM';
    
    const year = new Date(payload.audit_plan_date).getFullYear();
    const controlNo = await this.generateControlNo(year, true);

    const dbPayload = {
      qmqa_audit_plan_id: id,
      control_no: controlNo,
      created_date: now,
      site_id: payload.site_id,
      supplier_id: payload.supplier_id,
      audit_category_id: payload.audit_category_id,
      audit_plan_date: payload.audit_plan_date,
      sqe_pic_id: payload.sqe_pic_id,
      remarks: payload.remarks || null,
      request_status: 'PL',
      last_update: now,
      updateby: effectiveUserId
    };

    return await qmqaRepository.executeTransaction(async (trx) => {
      await trx.insertInto('QMQA_AUDIT_PLAN').values(dbPayload).execute();
      return { success: true, id, controlNo, message: 'Schedule created' };
    });
  }

  async updateSchedule(id: string, payload: QMQAScheduleUpdateInput, userId: string) {
    const existing = await qmqaRepository.findScheduleById(id);
    if (!existing) throw new NotFoundError('Schedule not found');
    
    const effectiveUserId = userId || 'SYSTEM';

    const dbUpdates: any = {
      last_update: new Date(),
      updateby: effectiveUserId
    };

    if (payload.site_id) dbUpdates.site_id = payload.site_id;
    if (payload.supplier_id) dbUpdates.supplier_id = payload.supplier_id;
    if (payload.audit_category_id) dbUpdates.audit_category_id = payload.audit_category_id;
    if (payload.audit_plan_date) dbUpdates.audit_plan_date = payload.audit_plan_date;
    if (payload.sqe_pic_id) dbUpdates.sqe_pic_id = payload.sqe_pic_id;
    if (payload.remarks !== undefined) dbUpdates.remarks = payload.remarks;

    return await qmqaRepository.executeTransaction(async (trx) => {
      await trx.updateTable('QMQA_AUDIT_PLAN')
        .set(dbUpdates)
        .where('qmqa_audit_plan_id', '=', id)
        .execute();
      return { success: true, message: 'Schedule updated' };
    });
  }

  // ==========================================
  // RECORDS (Execution)
  // ==========================================
  async getAllRecords() {
    const records = await qmqaRepository.findAllRecordsDetailed();
    return records.map((r: any) => ({
      ...r,
      status: mapStatusFromDB(r.request_status),
      created_at: r.created_date,
    }));
  }

  async getRecordById(id: string) {
    const data = await qmqaRepository.findRecordByIdDetailed(id);
    if (!data) throw new NotFoundError('QMQA Record not found');

    // Fetch arrays manually using the Kysely instance safely inside repo. 
    // Simplified for now.
    return {
      ...data,
      status: mapStatusFromDB(data.request_status),
      created_at: data.created_date
    };
  }

  async createRecord(payload: QMQARecordCreationInput, userId: string, files: any[] = []) {
    const now = new Date();
    const effectiveUserId = userId || 'SYSTEM';
    const qmqaId = uuidv4();

    return await qmqaRepository.executeTransaction(async (trx) => {
      let apid = payload.schedule_id;

      // Ensure Audit Plan exists
      if (!payload.from_schedule || !apid) {
         apid = uuidv4();
         const year = new Date(payload.audit_date).getFullYear();
         const controlNo = await this.generateControlNo(year, false);

         await trx.insertInto('QMQA_AUDIT_PLAN').values({
            qmqa_audit_plan_id: apid,
            control_no: controlNo,
            created_date: now,
            site_id: payload.site_id!,
            supplier_id: payload.supplier_id!,
            audit_category_id: payload.audit_category_id!,
            audit_plan_date: payload.audit_plan_date || now,
            sqe_pic_id: payload.sqe_pic_id!,
            remarks: null,
            request_status: 'CO', // Completed since it bypasses planning
            last_update: now,
            updateby: effectiveUserId
         }).execute();
      } else {
         // Update schedule to COMPLETED
         await trx.updateTable('QMQA_AUDIT_PLAN')
           .set({ request_status: 'CO', last_update: now, updateby: effectiveUserId })
           .where('qmqa_audit_plan_id', '=', apid)
           .execute();
      }

      await trx.insertInto('QMQA').values({
        qmqa_id: qmqaId,
        qmqa_audit_plan_id: apid,
        created_date: now,
        audit_type_id: payload.audit_type_id,
        attention_id: payload.attention_id || null,
        pic_auditor_id: payload.pic_auditor_id || null,
        due_date: payload.due_date ? new Date(payload.due_date) : null,
        audit_date: new Date(payload.audit_date),
        issued_date: null,
        audit_rating: payload.audit_rating ?? null,
        auditees: payload.auditees || null,
        auditors: payload.auditors || null,
        attendees: payload.attendees || null,
        remarks: payload.remarks || null,
        encoder_id: effectiveUserId,
        encoder_date: now,
        issuer_id: effectiveUserId,
        issuer_remarks: null,
        issuer_date: null,
        checker_id: payload.checker_id || null,
        checker_remarks: null,
        checker_date: null,
        approver_id: payload.approver_id || null,
        approver_remarks: null,
        approver_date: null,
        request_status: 'DR',
        last_update: now,
        updateby: effectiveUserId
      }).execute();

      // CC List
      if (payload.cc_list && payload.cc_list.length > 0) {
        for (const cc of payload.cc_list) {
          await trx.insertInto('QMQA_CC').values({
            qmqa_cc_id: uuidv4(),
            qmqa_id: qmqaId,
            user_id: cc.user_id,
            last_update: now,
            updateby: effectiveUserId
          }).execute();
        }
      }

      // Attachments
      if (payload.attachments && payload.attachments.length > 0) {
        for (const att of payload.attachments) {
          const originalName = att.file_name || att.fileName;
          if (!originalName) continue;
          
          const uploadedFile = files.find(f => f.originalname === originalName);
          const diskFileName = uploadedFile ? uploadedFile.filename : originalName;
          
          await trx.insertInto('QMQA_ATTACHMENT').values({
            qmqa_attachment_id: att.id || uuidv4(),
            qmqa_id: qmqaId,
            file_name: diskFileName || 'Unknown',
            file_extension: diskFileName ? diskFileName.split('.').pop()! : 'unknown',
            remarks: att.remarks || null,
            last_update: now,
            updateby: effectiveUserId
          }).execute();
        }
      }

      return { success: true, id: qmqaId, apid };
    });
  }

  async updateRecord(id: string, payload: QMQARecordUpdateInput, userId: string) {
    // Simplified partial update
    const effectiveUserId = userId || 'SYSTEM';
    const now = new Date();
    
    const dbUpdates: any = {
      last_update: now,
      updateby: effectiveUserId
    };

    if (payload.audit_type_id) dbUpdates.audit_type_id = payload.audit_type_id;
    if (payload.due_date !== undefined) dbUpdates.due_date = payload.due_date ? new Date(payload.due_date) : null;
    if (payload.audit_date) dbUpdates.audit_date = new Date(payload.audit_date);
    if (payload.audit_rating !== undefined) dbUpdates.audit_rating = payload.audit_rating;
    if (payload.remarks !== undefined) dbUpdates.remarks = payload.remarks;

    return await qmqaRepository.executeTransaction(async (trx) => {
      if (Object.keys(dbUpdates).length > 2) {
        await trx.updateTable('QMQA')
          .set(dbUpdates)
          .where('qmqa_id', '=', id)
          .execute();
      }
      return { success: true, message: 'QMQA Record updated successfully' };
    });
  }

  // ==========================================
  // WORKFLOW ACTIONS
  // ==========================================

  /** DRAFT → AWAITING_APPROVAL (AA) */
  async submit(id: string, userId: string) {
    const record = await qmqaRepository.findRecordByIdDetailed(id);
    if (!record) throw new NotFoundError('QMQA Record not found');

    const currentStatus = mapStatusFromDB(record.request_status);
    if (currentStatus !== 'DRAFT') {
      throw new Error(`Cannot submit: record is in ${currentStatus}, expected DRAFT`);
    }

    return await qmqaRepository.executeTransaction(async (trx) => {
      await trx.updateTable('QMQA')
        .set({
          request_status: mapStatusToDB('AAPPROVAL'),
          last_update: new Date(),
          updateby: userId
        })
        .where('qmqa_id', '=', id)
        .execute();
      return { success: true, message: 'Record submitted for approval' };
    });
  }

  /** AWAITING_APPROVAL → APPROVED (AP) */
  async approve(id: string, userId: string, remarks?: string) {
    const record = await qmqaRepository.findRecordByIdDetailed(id);
    if (!record) throw new NotFoundError('QMQA Record not found');

    const currentStatus = mapStatusFromDB(record.request_status);
    if (currentStatus !== 'AAPPROVAL') {
      throw new Error(`Cannot approve: record is in ${currentStatus}, expected AAPPROVAL`);
    }

    const now = new Date();
    return await qmqaRepository.executeTransaction(async (trx) => {
      await trx.updateTable('QMQA')
        .set({
          request_status: mapStatusToDB('APPROVED'),
          approver_id: userId,
          approver_remarks: remarks || null,
          approver_date: now,
          last_update: now,
          updateby: userId
        })
        .where('qmqa_id', '=', id)
        .execute();
      return { success: true, message: 'Record approved' };
    });
  }

  /** AWAITING_APPROVAL → REJECTED (RE) → returns to DRAFT */
  async reject(id: string, userId: string, remarks?: string) {
    const record = await qmqaRepository.findRecordByIdDetailed(id);
    if (!record) throw new NotFoundError('QMQA Record not found');

    const currentStatus = mapStatusFromDB(record.request_status);
    if (currentStatus !== 'AAPPROVAL') {
      throw new Error(`Cannot reject: record is in ${currentStatus}, expected AAPPROVAL`);
    }

    const now = new Date();
    return await qmqaRepository.executeTransaction(async (trx) => {
      await trx.updateTable('QMQA')
        .set({
          request_status: mapStatusToDB('DRAFT'),
          checker_remarks: remarks || null,
          last_update: now,
          updateby: userId
        })
        .where('qmqa_id', '=', id)
        .execute();
      return { success: true, message: 'Record rejected and returned to draft' };
    });
  }

  /** APPROVED → ISSUED (IS) */
  async issue(id: string, userId: string) {
    const record = await qmqaRepository.findRecordByIdDetailed(id);
    if (!record) throw new NotFoundError('QMQA Record not found');

    const currentStatus = mapStatusFromDB(record.request_status);
    if (currentStatus !== 'APPROVED') {
      throw new Error(`Cannot issue: record is in ${currentStatus}, expected APPROVED`);
    }

    const now = new Date();
    return await qmqaRepository.executeTransaction(async (trx) => {
      await trx.updateTable('QMQA')
        .set({
          request_status: mapStatusToDB('ISSUED'),
          issuer_id: userId,
          issuer_date: now,
          issued_date: now,
          last_update: now,
          updateby: userId
        })
        .where('qmqa_id', '=', id)
        .execute();
      return { success: true, message: 'Record issued successfully' };
    });
  }

  /** ISSUED → CANCELLED (CA) */
  async cancel(id: string, userId: string) {
    const record = await qmqaRepository.findRecordByIdDetailed(id);
    if (!record) throw new NotFoundError('QMQA Record not found');

    const currentStatus = mapStatusFromDB(record.request_status);
    if (currentStatus !== 'ISSUED') {
      throw new Error(`Cannot cancel: record is in ${currentStatus}, expected ISSUED`);
    }

    return await qmqaRepository.executeTransaction(async (trx) => {
      await trx.updateTable('QMQA')
        .set({
          request_status: mapStatusToDB('CANCEL'),
          last_update: new Date(),
          updateby: userId
        })
        .where('qmqa_id', '=', id)
        .execute();
      return { success: true, message: 'Record cancelled' };
    });
  }

  /**
   * Delete a schedule (Audit Plan)
   */
  async deleteSchedule(id: string) {
    const existing = await qmqaRepository.findScheduleById(id);
    if (!existing) throw new NotFoundError('Schedule not found');

    return await qmqaRepository.executeTransaction(async (trx) => {
      await trx.deleteFrom('QMQA_AUDIT_PLAN')
        .where('qmqa_audit_plan_id', '=', id)
        .execute();
      return { success: true, message: 'Schedule deleted successfully' };
    });
  }

  /**
   * Delete a QMQA record and all child data
   */
  async deleteRecord(id: string) {
    const existing = await qmqaRepository.findRecordByIdDetailed(id);
    if (!existing) throw new NotFoundError('QMQA Record not found');

    return await qmqaRepository.executeTransaction(async (trx) => {
      await trx.deleteFrom('QMQA_CC').where('qmqa_id', '=', id).execute();
      await trx.deleteFrom('QMQA_ATTACHMENT').where('qmqa_id', '=', id).execute();
      await trx.deleteFrom('QMQA_NC').where('qmqa_id', '=', id).execute();
      await trx.deleteFrom('QMQA_SCORE').where('qmqa_id', '=', id).execute();
      await trx.deleteFrom('QMQA').where('qmqa_id', '=', id).execute();
      return { success: true, message: 'QMQA Record deleted successfully' };
    });
  }
  /**
   * Verification endpoint with Cycle 2 approval fields
   */
  async verify(id: string, userId: string, payload: {
    verified_by: string;
    verification_remarks?: string;
    verification_date?: Date;
    cycle2_checker_id?: string;
    cycle2_checker_remarks?: string;
    cycle2_approver_id?: string;
    cycle2_approver_remarks?: string;
  }) {
    const record = await qmqaRepository.findRecordByIdDetailed(id);
    if (!record) throw new NotFoundError('QMQA Record not found');

    const now = new Date();
    return await qmqaRepository.executeTransaction(async (trx) => {
      await trx.updateTable('QMQA')
        .set({
          request_status: mapStatusToDB('VERIFIED'),
          verification_remarks: payload.verification_remarks || null,
          last_update: now,
          updateby: userId
        })
        .where('qmqa_id', '=', id)
        .execute();

      // Update QMQA_RESPONSE with Cycle 2 approval info
      await trx.updateTable('QMQA_RESPONSE')
        .set({
          verification_remarks: payload.verification_remarks || null,
          checker_id: payload.cycle2_checker_id || null,
          checker_remarks: payload.cycle2_checker_remarks || null,
          approver_id: payload.cycle2_approver_id || null,
          approver_remarks: payload.cycle2_approver_remarks || null,
          last_update: now,
          updateby: userId
        })
        .where('qmqa_id', '=', id)
        .execute();

      return { success: true, message: 'Record verified with Cycle 2 approval' };
    });
  }

}

export const qmqaService = new QmqaService();
