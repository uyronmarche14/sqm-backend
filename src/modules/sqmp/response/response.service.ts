import { v4 as uuidv4 } from 'uuid';
import { getSubFormFormCodes } from '@sqm/permissions-contract';
import { sqmpRepository } from '../sqmp.repository.js';
import { userRepository } from '../../users/user.repository.js';
import { SQMPResponseUpsertInput } from './response.schema.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../../shared/errors/AppError.js';
import { mapStatusToDB } from '../../../shared/utils/status-mapper.js';
import { attachmentService } from '../../../shared/services/attachment.service.js';
import {
  extractOriginalFilenameMarker,
  formatAttachmentRemarks,
} from '../../../shared/utils/attachment-remarks.js';
import {
  validateApprover,
  validateChecker,
} from '../../../shared/utils/assignment-validation.utils.js';
import { isAdminRole } from '../../../shared/utils/admin.utils.js';

const SQMP_RESPONSE_DOCUMENT_RECORD_CONFIG = {
  tableName: 'SQMP_RESPONSE_DOCUMENT',
  ownerColumn: 'sqmp_response_id',
  idColumn: 'sqmp_response_document_id',
  fileNameColumn: 'file_name',
  extensionColumn: 'file_extension',
  remarksColumn: 'remarks',
  lastUpdateColumn: 'last_update',
  updatedByColumn: 'updateby',
} as const;

const SQMP_RESPONSE_APPENDIX_RECORD_CONFIG = {
  tableName: 'SQMP_RESPONSE_APPENDIX',
  ownerColumn: 'sqmp_response_id',
  idColumn: 'sqmp_response_appendix_id',
  fileNameColumn: 'file_name',
  extensionColumn: 'file_extension',
  remarksColumn: 'remarks',
  lastUpdateColumn: 'last_update',
  updatedByColumn: 'updateby',
} as const;

const SQMP_RESPONSE_CLOSURE_RECORD_CONFIG = {
  tableName: 'SQMP_RESPONSE_CLOSURE',
  ownerColumn: 'sqmp_response_id',
  idColumn: 'sqmp_response_closure_id',
  fileNameColumn: 'file_name',
  extensionColumn: 'file_extension',
  remarksColumn: 'remarks',
  lastUpdateColumn: 'last_update',
  updatedByColumn: 'updateby',
} as const;

const SQMP_RESPONSE_APPROVAL_FORM_ID =
  getSubFormFormCodes('SQM_PLAN', 'RESPONSE_AWAITING_APPROVAL')[0] ?? 'SQMP-09-07';

interface PersistResponseContentOptions {
  mainRecordRequestStatus: string;
  updateMainStatus?: string;
  useLegacySubmitTransition?: boolean;
}

export class SqmpResponseService {
  private async getRoleName(roleId?: string): Promise<string> {
    if (!roleId) return 'UNKNOWN';
    const roleObj = await userRepository.findRoleById(roleId);
    return roleObj?.role_name || 'UNKNOWN';
  }

  private async validateResponseAccess(
    mainRecord: any,
    latestResponse: any,
    roleName: string,
    userId: string,
    operation: 'upsert' | 'workflow' = 'workflow',
  ): Promise<void> {
    const isSupplier = roleName.toUpperCase().includes('SUPPLIER');
    const isGlobalRole = isAdminRole(roleName);

    if (isGlobalRole) return;

    if (operation === 'upsert') {
      if (!isSupplier) {
        throw new ForbiddenError('Only suppliers are permitted to submit responses.');
      }
      const supplierIds = await sqmpRepository.findSupplierIdsByUserId(userId);
      const hasSupplierAccess = supplierIds.includes(mainRecord.supplier_id) || mainRecord.attention_id === userId;
      if (!hasSupplierAccess) {
        throw new ForbiddenError('Access Denied: This SQM Plan is assigned to a different supplier.');
      }
      return;
    }

    const isChecker = latestResponse?.checker_id === userId;
    const isApprover = latestResponse?.approver_id === userId;

    if (!isChecker && !isApprover) {
      throw new ForbiddenError('Access Denied: You do not have permission to perform this workflow action.');
    }
  }

  private async validateClosureSaveAccess(mainRecord: any, roleName: string, userId: string): Promise<void> {
    const isGlobalRole = isAdminRole(roleName);
    if (isGlobalRole) return;

    const isIssuer = mainRecord.issuer_id === userId;

    if (!isIssuer) {
      throw new ForbiddenError('Only the assigned issuer can save closure content.');
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

  private async persistResponseContent(
    sqmpId: string,
    payload: SQMPResponseUpsertInput,
    userId: string,
    files: any[] = [],
    options: PersistResponseContentOptions,
  ): Promise<{
    sqmp_response_id: string;
    cleanupQueue: {
      documents: Array<{ fileName: string; storedPath?: string | null }>;
      appendixes: Array<{ fileName: string; storedPath?: string | null }>;
      closures: Array<{ fileName: string; storedPath?: string | null }>;
    };
  }> {
    const now = new Date();
    const responseId = payload.sqmp_response_id || uuidv4();
    const nextCheckerId = payload.checker_id !== undefined ? this.sanitizeUuid(payload.checker_id) : undefined;
    const nextApproverId = payload.approver_id !== undefined ? this.sanitizeUuid(payload.approver_id) : undefined;

    if (nextCheckerId) {
      await validateChecker(nextCheckerId, SQMP_RESPONSE_APPROVAL_FORM_ID);
    }
    if (nextApproverId) {
      await validateApprover(nextApproverId, SQMP_RESPONSE_APPROVAL_FORM_ID);
    }

    return await sqmpRepository.executeTransaction(async (trx) => {
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

      const responseUpdates: any = {
        sqmp_id: sqmpId,
        response_date: this.parseDate(payload.response_date) || now,
        main_document_remarks: payload.main_document_remarks || null,
        appendix_sheet_remarks: payload.appendix_sheet_remarks || null,
        closure_remarks: payload.closure_remarks || null,
        remarks: payload.remarks || null,
        last_update: now,
        updateby: userId,
      };

      if (payload.issuer_remarks !== undefined) responseUpdates.issuer_remarks = payload.issuer_remarks;
      if (payload.issuer_date !== undefined) responseUpdates.issuer_date = this.parseDate(payload.issuer_date);

      if (payload.checker_id !== undefined) responseUpdates.checker_id = nextCheckerId;
      if (payload.checker_remarks !== undefined) responseUpdates.checker_remarks = payload.checker_remarks;
      if (payload.checker_date !== undefined) responseUpdates.checker_date = this.parseDate(payload.checker_date);

      if (payload.approver_id !== undefined) responseUpdates.approver_id = nextApproverId;
      if (payload.approver_remarks !== undefined) responseUpdates.approver_remarks = payload.approver_remarks;
      if (payload.approver_date !== undefined) responseUpdates.approver_date = this.parseDate(payload.approver_date);

      if (existingResp) {
        await trx.updateTable('SQMP_RESPONSE')
          .set(responseUpdates)
          .where('sqmp_response_id', '=', responseIdToUse)
          .execute();
      } else {
        await trx.insertInto('SQMP_RESPONSE')
          .values({ sqmp_response_id: responseIdToUse, ...responseUpdates })
          .execute();
      }

      const documentSync = await attachmentService.syncAttachments(
        trx,
        payload.documents,
        files,
        {
          ownerId: responseIdToUse,
          userId,
          now,
          recordConfig: SQMP_RESPONSE_DOCUMENT_RECORD_CONFIG,
          createId: () => uuidv4(),
          remarkFormatter: ({ command, existing, originalName }) =>
            formatAttachmentRemarks(
              command.remarks ?? existing?.remarks ?? null,
              originalName,
              extractOriginalFilenameMarker(existing?.remarks),
            ),
        },
      );

      const appendixSync = await attachmentService.syncAttachments(
        trx,
        payload.appendixes,
        files,
        {
          ownerId: responseIdToUse,
          userId,
          now,
          recordConfig: SQMP_RESPONSE_APPENDIX_RECORD_CONFIG,
          createId: () => uuidv4(),
          remarkFormatter: ({ command, existing, originalName }) =>
            formatAttachmentRemarks(
              command.remarks ?? existing?.remarks ?? null,
              originalName,
              extractOriginalFilenameMarker(existing?.remarks),
            ),
        },
      );

      const closureSync = await attachmentService.syncAttachments(
        trx,
        payload.closures,
        files,
        {
          ownerId: responseIdToUse,
          userId,
          now,
          recordConfig: SQMP_RESPONSE_CLOSURE_RECORD_CONFIG,
          createId: () => uuidv4(),
          remarkFormatter: ({ command, existing, originalName }) =>
            formatAttachmentRemarks(
              command.remarks ?? existing?.remarks ?? null,
              originalName,
              extractOriginalFilenameMarker(existing?.remarks),
            ),
        },
      );

      let requestStatusToPersist: string | undefined;

      if (options.useLegacySubmitTransition) {
        const statusToTransition = [
          mapStatusToDB('ISSUED'),
          mapStatusToDB('RESPONSE_AWAITING'),
          mapStatusToDB('RESPONSE_REJECTED'),
          '11',
          '21',
          '22',
          '24',
        ];

        if (statusToTransition.includes(String(options.mainRecordRequestStatus))) {
          requestStatusToPersist = mapStatusToDB('RESPONSE_SUBMITTED');
        }
      }

      if (options.updateMainStatus !== undefined) {
        requestStatusToPersist = options.updateMainStatus;
      }

      if (requestStatusToPersist) {
        await trx.updateTable('SQMP')
          .set({
            request_status: requestStatusToPersist,
            last_update: now,
            updateby: userId,
          })
          .where('sqmp_id', '=', sqmpId)
          .execute();
      }

      return {
        sqmp_response_id: responseIdToUse,
        cleanupQueue: {
          documents: documentSync.cleanupQueue,
          appendixes: appendixSync.cleanupQueue,
          closures: closureSync.cleanupQueue,
        },
      };
    });
  }

  /**
   * Legacy compatibility endpoint used by the current controller.
   * This keeps the old submit-on-save behavior until explicit workflow endpoints replace it.
   */
  async upsertResponse(sqmpId: string, payload: SQMPResponseUpsertInput, userId: string, roleId: string, files: any[] = []) {
    const roleName = await this.getRoleName(roleId);
    const mainRecord = await sqmpRepository.findByIdDetailed(sqmpId, userId, roleName);
    if (!mainRecord) throw new NotFoundError('SQM Plan not found');

    const latestResponse = mainRecord.responses?.[mainRecord.responses.length - 1];
    await this.validateResponseAccess(mainRecord.record, latestResponse, roleName, userId, 'upsert');

    const result = await this.persistResponseContent(sqmpId, payload, userId, files, {
      mainRecordRequestStatus: String(mainRecord.record.request_status || ''),
      useLegacySubmitTransition: true,
    });

    await attachmentService.deleteStoredAttachments('sqmp-response-document', result.cleanupQueue.documents || []);
    await attachmentService.deleteStoredAttachments('sqmp-response-appendix', result.cleanupQueue.appendixes || []);
    await attachmentService.deleteStoredAttachments('sqmp-response-closure', result.cleanupQueue.closures || []);

    return {
      success: true,
      data: {
        sqmp_response_id: result.sqmp_response_id,
      },
      message: 'Response submitted successfully',
    };
  }

  /**
   * Content-only save for supplier response.
   * Stage changes must be triggered from the workflow layer.
   */
  async saveSupplierResponseContent(sqmpId: string, payload: SQMPResponseUpsertInput, userId: string, roleId: string, files: any[] = []) {
    const roleName = await this.getRoleName(roleId);
    const mainRecord = await sqmpRepository.findByIdDetailed(sqmpId, userId, roleName);
    if (!mainRecord) throw new NotFoundError('SQM Plan not found');

    const latestResponse = mainRecord.responses?.[mainRecord.responses.length - 1];
    await this.validateResponseAccess(mainRecord.record, latestResponse, roleName, userId, 'upsert');

    const result = await this.persistResponseContent(sqmpId, payload, userId, files, {
      mainRecordRequestStatus: String(mainRecord.record.request_status || ''),
    });

    await attachmentService.deleteStoredAttachments('sqmp-response-document', result.cleanupQueue.documents || []);
    await attachmentService.deleteStoredAttachments('sqmp-response-appendix', result.cleanupQueue.appendixes || []);
    await attachmentService.deleteStoredAttachments('sqmp-response-closure', result.cleanupQueue.closures || []);

    return {
      success: true,
      data: {
        sqmp_response_id: result.sqmp_response_id,
      },
      message: 'Response content saved successfully',
    };
  }

  /**
   * Content-only save for issuer closure preparation.
   * Stage changes must be triggered from the workflow layer.
   */
  async saveClosureContent(sqmpId: string, payload: SQMPResponseUpsertInput, userId: string, roleId: string, files: any[] = []) {
    const roleName = await this.getRoleName(roleId);
    const mainRecord = await sqmpRepository.findByIdDetailed(sqmpId, userId, roleName);
    if (!mainRecord) throw new NotFoundError('SQM Plan not found');

    await this.validateClosureSaveAccess(mainRecord.record, roleName, userId);

    const result = await this.persistResponseContent(sqmpId, payload, userId, files, {
      mainRecordRequestStatus: String(mainRecord.record.request_status || ''),
    });

    await attachmentService.deleteStoredAttachments('sqmp-response-document', result.cleanupQueue.documents || []);
    await attachmentService.deleteStoredAttachments('sqmp-response-appendix', result.cleanupQueue.appendixes || []);
    await attachmentService.deleteStoredAttachments('sqmp-response-closure', result.cleanupQueue.closures || []);

    return {
      success: true,
      data: {
        sqmp_response_id: result.sqmp_response_id,
      },
      message: 'Closure content saved successfully',
    };
  }

  async checkResponse(sqmpId: string, remarks: string, userId: string, roleId: string) {
    const roleName = await this.getRoleName(roleId);
    const mainRecord = await sqmpRepository.findByIdDetailed(sqmpId, userId, roleName);
    if (!mainRecord) throw new NotFoundError('SQM Plan not found');

    const latestResponse = mainRecord.responses?.[mainRecord.responses.length - 1];
    await this.validateResponseAccess(mainRecord.record, latestResponse, roleName, userId, 'workflow');

    if (mainRecord.record.request_status !== mapStatusToDB('RESPONSE_SUBMITTED')) {
      throw new BadRequestError('Invalid Transition: Response is not yet submitted');
    }

    const now = new Date();
    const persistedLatestResponse = await sqmpRepository.findLatestResponse(sqmpId);
    if (!persistedLatestResponse) throw new NotFoundError('No response found to check');

    return await sqmpRepository.executeTransaction(async (trx) => {
      await trx.updateTable('SQMP_RESPONSE')
        .set({
          checker_id: userId,
          checker_remarks: remarks,
          checker_date: now,
          last_update: now,
          updateby: userId,
        })
        .where('sqmp_response_id', '=', persistedLatestResponse.sqmp_response_id)
        .execute();

      await trx.updateTable('SQMP')
        .set({
          request_status: mapStatusToDB('RESPONSE_AWAITING_APPROVAL'),
          last_update: now,
          updateby: userId,
        })
        .where('sqmp_id', '=', sqmpId)
        .execute();

      await trx.insertInto('SQMP_STATUS_REMARKS').values({
        sqmp_status_remarks_id: uuidv4(),
        sqmp_id: sqmpId,
        remarks,
        request_status: mapStatusToDB('RESPONSE_AWAITING_APPROVAL'),
        remarks_by_id: userId,
        remarks_date: now,
      }).execute();

      return { success: true, message: 'Response checked successfully' };
    });
  }

  async approveResponse(sqmpId: string, remarks: string, userId: string, roleId: string) {
    const roleName = await this.getRoleName(roleId);
    const mainRecord = await sqmpRepository.findByIdDetailed(sqmpId, userId, roleName);
    if (!mainRecord) throw new NotFoundError('SQM Plan not found');

    const latestResponse = mainRecord.responses?.[mainRecord.responses.length - 1];
    await this.validateResponseAccess(mainRecord.record, latestResponse, roleName, userId, 'workflow');

    if (mainRecord.record.request_status !== mapStatusToDB('RESPONSE_AWAITING_APPROVAL')) {
      throw new BadRequestError('Invalid Transition: Response is not awaiting approval');
    }

    const now = new Date();
    const persistedLatestResponse = await sqmpRepository.findLatestResponse(sqmpId);
    if (!persistedLatestResponse) throw new NotFoundError('No response found to approve');

    return await sqmpRepository.executeTransaction(async (trx) => {
      await trx.updateTable('SQMP_RESPONSE')
        .set({
          approver_id: userId,
          approver_remarks: remarks,
          approver_date: now,
          last_update: now,
          updateby: userId,
        })
        .where('sqmp_response_id', '=', persistedLatestResponse.sqmp_response_id)
        .execute();

      await trx.updateTable('SQMP')
        .set({
          request_status: mapStatusToDB('CLOSED'),
          last_update: now,
          updateby: userId,
        })
        .where('sqmp_id', '=', sqmpId)
        .execute();

      await trx.insertInto('SQMP_STATUS_REMARKS').values({
        sqmp_status_remarks_id: uuidv4(),
        sqmp_id: sqmpId,
        remarks,
        request_status: mapStatusToDB('CLOSED'),
        remarks_by_id: userId,
        remarks_date: now,
      }).execute();

      return { success: true, message: 'Response approved and plan closed' };
    });
  }

  async rejectResponse(sqmpId: string, remarks: string, userId: string, roleId: string) {
    const roleName = await this.getRoleName(roleId);
    const mainRecord = await sqmpRepository.findByIdDetailed(sqmpId, userId, roleName);
    if (!mainRecord) throw new NotFoundError('SQM Plan not found');

    const latestResponse = mainRecord.responses?.[mainRecord.responses.length - 1];
    await this.validateResponseAccess(mainRecord.record, latestResponse, roleName, userId, 'workflow');

    const dbStatus = mainRecord.record.request_status;
    if (dbStatus !== mapStatusToDB('RESPONSE_SUBMITTED') && dbStatus !== mapStatusToDB('RESPONSE_AWAITING_APPROVAL')) {
      throw new BadRequestError('Invalid Transition: Record cannot be rejected at this stage');
    }

    const now = new Date();
    const persistedLatestResponse = await sqmpRepository.findLatestResponse(sqmpId);
    if (!persistedLatestResponse) throw new NotFoundError('No response found to reject');

    return await sqmpRepository.executeTransaction(async (trx) => {
      await trx.updateTable('SQMP_RESPONSE')
        .set({
          approver_id: userId,
          approver_remarks: remarks,
          approver_date: now,
          last_update: now,
          updateby: userId,
        })
        .where('sqmp_response_id', '=', persistedLatestResponse.sqmp_response_id)
        .execute();

      await trx.updateTable('SQMP')
        .set({
          request_status: mapStatusToDB('RESPONSE_REJECTED'),
          last_update: now,
          updateby: userId,
        })
        .where('sqmp_id', '=', sqmpId)
        .execute();

      await trx.insertInto('SQMP_STATUS_REMARKS').values({
        sqmp_status_remarks_id: uuidv4(),
        sqmp_id: sqmpId,
        remarks,
        request_status: mapStatusToDB('RESPONSE_REJECTED'),
        remarks_by_id: userId,
        remarks_date: now,
      }).execute();

      return { success: true, message: 'Response rejected' };
    });
  }
}

export const sqmpResponseService = new SqmpResponseService();
