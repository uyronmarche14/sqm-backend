import { v4 as uuidv4 } from 'uuid';
import { sqmpRepository } from '../sqmp.repository.js';
import { userRepository } from '../../users/user.repository.js';
import { SQMPResponseUpsertInput } from './response.schema.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../../shared/errors/AppError.js';
import { mapStatusToDB } from '../../../shared/utils/status-mapper.js';
import { sanitizeAttachmentRemarks } from '../utils/attachment.util.js';

export class SqmpResponseService {
  private async getRoleName(roleId?: string): Promise<string> {
      if (!roleId) return 'UNKNOWN';
      const roleObj = await userRepository.findRoleById(roleId);
      return roleObj?.role_name || 'UNKNOWN';
  }

  private async validateResponseAccess(mainRecord: any, roleName: string, userId: string, operation: 'upsert' | 'workflow' = 'workflow'): Promise<void> {
    const isSupplier = roleName.toUpperCase().includes('SUPPLIER');
    const isGlobalRole = ['ADMIN', 'MPD'].some(r => roleName.toUpperCase().includes(r));

    if (isGlobalRole) return;

    if (operation === 'upsert') {
        if (!isSupplier) {
            throw new ForbiddenError('Only suppliers are permitted to submit responses.');
        }
        if (mainRecord.supplier_id !== userId) {
            throw new ForbiddenError('Access Denied: This SQM Plan is assigned to a different supplier.');
        }
    } else {
        // Workflow roles (checker, approver)
        const userObj = await userRepository.findById(userId);
        const userSiteId = userObj?.site_id;

        const isChecker = mainRecord.checker_id === userId;
        const isApprover = mainRecord.approver_id === userId;
        const isSameSite = mainRecord.site_id === userSiteId;

        if (!isChecker && !isApprover && !isSameSite) {
            throw new ForbiddenError('Access Denied: You do not have permission to perform this workflow action.');
        }
    }
  }

  private parseDate(d?: Date | string | null): Date | null {
    if (!d || d === '') return null;
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  private sanitizeUuid(val?: string | null): string | null {
    if (!val || val.trim() === '') return null;
    return val;
  }

  /**
   * Upsert a single response record and its attachments
   */
  async upsertResponse(sqmpId: string, payload: SQMPResponseUpsertInput, userId: string, roleId: string, files: any[] = []) {
    const roleName = await this.getRoleName(roleId);
    const mainRecord = await sqmpRepository.findByIdDetailed(sqmpId, userId, roleName);
    if (!mainRecord) throw new NotFoundError('SQM Plan not found');

    await this.validateResponseAccess(mainRecord.record, roleName, userId, 'upsert');

    const now = new Date();
    const responseId = payload.sqmp_response_id || uuidv4();

    return await sqmpRepository.executeTransaction(async (trx) => {
      // 1. Upsert Response Header
      let existingResp = null;
      if (payload.sqmp_response_id) {
        existingResp = await trx.selectFrom('SQMP_RESPONSE')
          .selectAll()
          .where('sqmp_response_id', '=', payload.sqmp_response_id)
          .executeTakeFirst();
      }

      if (!existingResp) {
        existingResp = await trx.selectFrom('SQMP_RESPONSE')
          .selectAll()
          .where('sqmp_id', '=', sqmpId)
          .executeTakeFirst();
      }

      const responseIdToUse = existingResp ? (existingResp.sqmp_response_id || (existingResp as any).SQMP_RESPONSE_ID) : responseId;

      const respData: any = {
        sqmp_id: sqmpId,
        response_date: this.parseDate(payload.response_date) || now,
        main_document_remarks: payload.main_document_remarks || null,
        appendix_sheet_remarks: payload.appendix_sheet_remarks || null,
        closure_remarks: payload.closure_remarks || null,
        remarks: payload.remarks || null,
        last_update: now,
        updateby: userId
      };

      if (payload.issuer_id !== undefined) respData.issuer_id = this.sanitizeUuid(payload.issuer_id);
      if (payload.issuer_remarks !== undefined) respData.issuer_remarks = payload.issuer_remarks;
      if (payload.issuer_date !== undefined) respData.issuer_date = this.parseDate(payload.issuer_date);

      if (payload.checker_id !== undefined) respData.checker_id = this.sanitizeUuid(payload.checker_id);
      if (payload.checker_remarks !== undefined) respData.checker_remarks = payload.checker_remarks;
      if (payload.checker_date !== undefined) respData.checker_date = this.parseDate(payload.checker_date);
      
      if (payload.approver_id !== undefined) respData.approver_id = this.sanitizeUuid(payload.approver_id);
      if (payload.approver_remarks !== undefined) respData.approver_remarks = payload.approver_remarks;
      if (payload.approver_date !== undefined) respData.approver_date = this.parseDate(payload.approver_date);

      if (existingResp) {
        await trx.updateTable('SQMP_RESPONSE').set(respData).where('sqmp_response_id', '=', responseIdToUse).execute();
      } else {
        await trx.insertInto('SQMP_RESPONSE').values({ sqmp_response_id: responseIdToUse, ...respData }).execute();
      }

      // 2. Handle Attachments (Documents)
      if (payload.documents !== undefined) {
        await trx.deleteFrom('SQMP_RESPONSE_DOCUMENT').where('sqmp_response_id', '=', responseIdToUse).execute();
        for (const doc of payload.documents) {
          const uploadedFile = files.find(f => f.originalname.trim().toLowerCase() === doc.file_name.trim().toLowerCase());
          const finalRemarks = sanitizeAttachmentRemarks(doc.remarks, uploadedFile?.originalname);

          await trx.insertInto('SQMP_RESPONSE_DOCUMENT').values({
            sqmp_response_document_id: doc.sqmp_attachment_id || uuidv4(),
            sqmp_response_id: responseIdToUse,
            file_name: uploadedFile ? uploadedFile.filename : doc.file_name,
            file_extension: uploadedFile ? uploadedFile.filename.split('.').pop()! : (doc.file_extension || 'dat'),
            remarks: finalRemarks,
            last_update: now,
            updateby: userId
          }).execute();
        }
      }

      // 3. Handle Appendixes
      if (payload.appendixes !== undefined) {
        await trx.deleteFrom('SQMP_RESPONSE_APPENDIX').where('sqmp_response_id', '=', responseIdToUse).execute();
        for (const app of payload.appendixes) {
          const uploadedFile = files.find(f => f.originalname.trim().toLowerCase() === app.file_name.trim().toLowerCase());
          const finalRemarks = sanitizeAttachmentRemarks(app.remarks, uploadedFile?.originalname);

          await trx.insertInto('SQMP_RESPONSE_APPENDIX').values({
            sqmp_response_appendix_id: app.sqmp_attachment_id || uuidv4(),
            sqmp_response_id: responseIdToUse,
            file_name: uploadedFile ? uploadedFile.filename : app.file_name,
            file_extension: uploadedFile ? uploadedFile.filename.split('.').pop()! : (app.file_extension || 'dat'),
            remarks: finalRemarks,
            last_update: now,
            updateby: userId
          }).execute();
        }
      }

      // 4. Handle Closures
      if (payload.closures !== undefined) {
        await trx.deleteFrom('SQMP_RESPONSE_CLOSURE').where('sqmp_response_id', '=', responseIdToUse).execute();
        for (const cls of payload.closures) {
          const uploadedFile = files.find(f => f.originalname.trim().toLowerCase() === cls.file_name.trim().toLowerCase());
          const finalRemarks = sanitizeAttachmentRemarks(cls.remarks, uploadedFile?.originalname);

          await trx.insertInto('SQMP_RESPONSE_CLOSURE').values({
            sqmp_response_closure_id: cls.sqmp_attachment_id || uuidv4(),
            sqmp_response_id: responseIdToUse,
            file_name: uploadedFile ? uploadedFile.filename : cls.file_name,
            file_extension: uploadedFile ? uploadedFile.filename.split('.').pop()! : (cls.file_extension || 'dat'),
            remarks: finalRemarks,
            last_update: now,
            updateby: userId
          }).execute();
        }
      }

      // 5. Update main SQMP record
      const statusToTransition = [
        mapStatusToDB('ISSUED'), 
        mapStatusToDB('RESPONSE_AWAITING'), 
        mapStatusToDB('RESPONSE_REJECTED')
      ];

      const updateData: any = { last_update: now, updateby: userId };
      
      if (statusToTransition.includes(mainRecord.record.request_status)) {
        updateData.request_status = mapStatusToDB('RESPONSE_SUBMITTED');
      }

      await trx.updateTable('SQMP')
        .set(updateData)
        .where('sqmp_id', '=', sqmpId)
        .execute();

      return { success: true, data: { sqmp_response_id: responseIdToUse }, message: 'Response submitted successfully' };
    });
  }

  async checkResponse(sqmpId: string, remarks: string, userId: string, roleId: string) {
    const roleName = await this.getRoleName(roleId);
    const mainRecord = await sqmpRepository.findByIdDetailed(sqmpId, userId, roleName);
    if (!mainRecord) throw new NotFoundError('SQM Plan not found');
    
    await this.validateResponseAccess(mainRecord.record, roleName, userId, 'workflow');

    if (mainRecord.record.request_status !== mapStatusToDB('RESPONSE_SUBMITTED')) {
      throw new BadRequestError('Invalid Transition: Response is not yet submitted');
    }

    const now = new Date();
    const latestResponse = await sqmpRepository.findLatestResponse(sqmpId);
    if (!latestResponse) throw new NotFoundError('No response found to check');

    return await sqmpRepository.executeTransaction(async (trx) => {
      await trx.updateTable('SQMP_RESPONSE')
        .set({
          checker_id: userId,
          checker_remarks: remarks,
          checker_date: now,
          last_update: now,
          updateby: userId
        })
        .where('sqmp_response_id', '=', latestResponse.sqmp_response_id)
        .execute();

      await trx.updateTable('SQMP')
        .set({ request_status: mapStatusToDB('RESPONSE_AWAITING_APPROVAL'), last_update: now, updateby: userId })
        .where('sqmp_id', '=', sqmpId)
        .execute();

      await trx.insertInto('SQMP_STATUS_REMARKS').values({
        sqmp_status_remarks_id: uuidv4(),
        sqmp_id: sqmpId,
        remarks: remarks,
        request_status: mapStatusToDB('RESPONSE_AWAITING_APPROVAL'),
        remarks_by_id: userId,
        remarks_date: now
      }).execute();

      return { success: true, message: 'Response checked successfully' };
    });
  }

  async approveResponse(sqmpId: string, remarks: string, userId: string, roleId: string) {
    const roleName = await this.getRoleName(roleId);
    const mainRecord = await sqmpRepository.findByIdDetailed(sqmpId, userId, roleName);
    if (!mainRecord) throw new NotFoundError('SQM Plan not found');

    await this.validateResponseAccess(mainRecord.record, roleName, userId, 'workflow');

    if (mainRecord.record.request_status !== mapStatusToDB('RESPONSE_AWAITING_APPROVAL')) {
      throw new BadRequestError('Invalid Transition: Response is not awaiting approval');
    }

    const now = new Date();
    const latestResponse = await sqmpRepository.findLatestResponse(sqmpId);
    if (!latestResponse) throw new NotFoundError('No response found to approve');

    return await sqmpRepository.executeTransaction(async (trx) => {
      await trx.updateTable('SQMP_RESPONSE')
        .set({
          approver_id: userId,
          approver_remarks: remarks,
          approver_date: now,
          last_update: now,
          updateby: userId
        })
        .where('sqmp_response_id', '=', latestResponse.sqmp_response_id)
        .execute();

      await trx.updateTable('SQMP')
        .set({ request_status: mapStatusToDB('CLOSED'), last_update: now, updateby: userId })
        .where('sqmp_id', '=', sqmpId)
        .execute();

      await trx.insertInto('SQMP_STATUS_REMARKS').values({
        sqmp_status_remarks_id: uuidv4(),
        sqmp_id: sqmpId,
        remarks: remarks,
        request_status: mapStatusToDB('CLOSED'),
        remarks_by_id: userId,
        remarks_date: now
      }).execute();

      return { success: true, message: 'Response approved and plan closed' };
    });
  }

  async rejectResponse(sqmpId: string, remarks: string, userId: string, roleId: string) {
    const roleName = await this.getRoleName(roleId);
    const mainRecord = await sqmpRepository.findByIdDetailed(sqmpId, userId, roleName);
    if (!mainRecord) throw new NotFoundError('SQM Plan not found');

    await this.validateResponseAccess(mainRecord.record, roleName, userId, 'workflow');

    const dbStatus = mainRecord.record.request_status;
    if (dbStatus !== mapStatusToDB('RESPONSE_SUBMITTED') && dbStatus !== mapStatusToDB('RESPONSE_AWAITING_APPROVAL')) {
      throw new BadRequestError('Invalid Transition: Record cannot be rejected at this stage');
    }

    const now = new Date();
    const latestResponse = await sqmpRepository.findLatestResponse(sqmpId);
    if (!latestResponse) throw new NotFoundError('No response found to reject');

    return await sqmpRepository.executeTransaction(async (trx) => {
      await trx.updateTable('SQMP_RESPONSE')
        .set({
          approver_id: userId,
          approver_remarks: remarks,
          approver_date: now,
          last_update: now,
          updateby: userId
        })
        .where('sqmp_response_id', '=', latestResponse.sqmp_response_id)
        .execute();

      await trx.updateTable('SQMP')
        .set({ request_status: mapStatusToDB('RESPONSE_REJECTED'), last_update: now, updateby: userId })
        .where('sqmp_id', '=', sqmpId)
        .execute();

      await trx.insertInto('SQMP_STATUS_REMARKS').values({
        sqmp_status_remarks_id: uuidv4(),
        sqmp_id: sqmpId,
        remarks: remarks,
        request_status: mapStatusToDB('RESPONSE_REJECTED'),
        remarks_by_id: userId,
        remarks_date: now
      }).execute();

      return { success: true, message: 'Response rejected' };
    });
  }
}

export const sqmpResponseService = new SqmpResponseService();
