import { v4 as uuidv4 } from 'uuid';
import { getSubFormFormCodes } from '@sqm/permissions-contract';
import { db } from '../../../shared/infrastructure/db.js';
import { attachmentService } from '../../../shared/services/attachment.service.js';
import {
  extractOriginalFilenameMarker,
  formatAttachmentRemarks,
  stripOriginalFilenameMarker,
} from '../../../shared/utils/attachment-remarks.js';
import {
  validateApprover,
  validateChecker,
} from '../../../shared/utils/assignment-validation.utils.js';
import { qmqaRepository } from '../qmqa.repository.js';
import { sanitizeUUID } from './qmqa-module-strategy.js';

const QMQA_RESPONSE_INITIAL_RECORD_CONFIG = {
  tableName: 'QMQA_RESPONSE_INITIAL',
  ownerColumn: 'qmqa_response_id',
  idColumn: 'qmqa_response_initial_attachment_id',
  fileNameColumn: 'file_name',
  extensionColumn: 'file_extension',
  remarksColumn: 'remarks',
  lastUpdateColumn: 'last_update',
  updatedByColumn: 'updateby',
} as const;

const QMQA_RESPONSE_FINAL_RECORD_CONFIG = {
  tableName: 'QMQA_RESPONSE_FINAL',
  ownerColumn: 'qmqa_response_id',
  idColumn: 'qmqa_response_final_attachment_id',
  fileNameColumn: 'file_name',
  extensionColumn: 'file_extension',
  remarksColumn: 'remarks',
  lastUpdateColumn: 'last_update',
  updatedByColumn: 'updateby',
} as const;

const QMQA_RESPONSE_VERIFICATION_RECORD_CONFIG = {
  tableName: 'QMQA_RESPONSE_VERIFICATION',
  ownerColumn: 'qmqa_response_id',
  idColumn: 'qmqa_response_verification_attachment_id',
  fileNameColumn: 'file_name',
  extensionColumn: 'file_extension',
  remarksColumn: 'remarks',
  lastUpdateColumn: 'last_update',
  updatedByColumn: 'updateby',
} as const;

const QMQA_RESPONSE_APPROVAL_FORM_ID =
  getSubFormFormCodes('QMQA', 'RESPONSE_AWAIT_APPROVAL')[0] ?? 'QMQA-05-09';

export class QmqaResponseService {
  private buildAttachmentView(
    attachment: any,
    moduleType: 'qmqa-response-initial' | 'qmqa-response-final' | 'qmqa-response-verification',
    category?: string,
  ) {
    const attachmentId = String(
      attachment.qmqa_response_initial_attachment_id ||
      attachment.qmqa_response_final_attachment_id ||
      attachment.qmqa_response_verification_attachment_id ||
      attachment.id ||
      '',
    );
    const downloadUrl = attachmentId
      ? `/api/qmqa/attachments/${moduleType}/${attachmentId}`
      : '';

    return {
      ...attachment,
      attachmentId,
      id: attachmentId,
      category: category || moduleType,
      downloadUrl,
      download_url: downloadUrl,
      fileUrl: downloadUrl,
      file_url: downloadUrl,
      url: downloadUrl,
    };
  }

  private getAttachmentRole(remarks: unknown) {
    if (typeof remarks !== 'string') {
      return null;
    }

    const normalized = stripOriginalFilenameMarker(remarks).trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    return normalized;
  }

  private getAttachmentId(attachment: any) {
    return String(
      attachment.qmqa_response_initial_attachment_id ||
      attachment.qmqa_response_final_attachment_id ||
      attachment.qmqa_response_verification_attachment_id ||
      attachment.id ||
      '',
    );
  }

  private buildCompatibilityAttachmentCommands(
    existingAttachments: any[],
    files: any[],
    fallbackRole: string,
  ) {
    const existingByRole = new Map<string, any>();

    for (const attachment of existingAttachments) {
      const role = this.getAttachmentRole(attachment.remarks) || fallbackRole;
      if (!existingByRole.has(role)) {
        existingByRole.set(role, attachment);
      }
    }

    const commands = files.map((file) => {
      const role = this.getAttachmentRole(file.fieldname) || fallbackRole;
      const existing = existingByRole.get(role);

      return {
        id: existing ? this.getAttachmentId(existing) : undefined,
        attachmentId: existing ? this.getAttachmentId(existing) : undefined,
        file_name: file.originalname || file.filename,
        file_field: typeof file.fieldname === 'string' ? file.fieldname : undefined,
        category: role,
        action: existing ? 'replace' : 'add',
      };
    });

    const incomingRoles = new Set(
      commands
        .map((command) => String(command.category || '').trim().toLowerCase())
        .filter(Boolean),
    );

    for (const attachment of existingAttachments) {
      const role = this.getAttachmentRole(attachment.remarks) || fallbackRole;
      if (incomingRoles.has(role)) {
        continue;
      }

      const attachmentId = this.getAttachmentId(attachment);
      commands.push({
        id: attachmentId,
        attachmentId,
        file_name: attachment.file_name,
        file_field: undefined,
        category: role,
        action: 'keep',
      });
    }

    return commands;
  }

  async resolveAttentionId(
    userIdOrSupplierUserId: string | null | undefined,
    trxOrDb: typeof db | any = db,
  ) {
    const cleanAttentionId = sanitizeUUID(userIdOrSupplierUserId);
    if (!cleanAttentionId) {
      return null;
    }

    const supplierUser = await trxOrDb.selectFrom('SUPPLIERSUSER')
      .select('user_id')
      .where('Id', '=', cleanAttentionId)
      .executeTakeFirst();

    return supplierUser?.user_id || cleanAttentionId;
  }

  mapInitialAttachments(rawAttachments: any[]) {
    return rawAttachments.map((attachment: any) => this.buildAttachmentView({
      ...attachment,
      fileName: attachment.file_name,
      fileExtension: attachment.file_extension,
      fileSize: attachment.file_size,
      remarks: attachment.remarks,
      uploadedBy: attachment.updateby,
      uploadedAt: attachment.last_update,
    }, 'qmqa-response-initial', 'initial-report-attachment'));
  }

  mapFinalAttachments(rawAttachments: any[]) {
    return rawAttachments.map((attachment: any) => this.buildAttachmentView({
      ...attachment,
      fileName: attachment.file_name,
      fileExtension: attachment.file_extension,
      fileSize: attachment.file_size,
      remarks: attachment.remarks,
      uploadedBy: attachment.updateby,
      uploadedAt: attachment.last_update,
    }, 'qmqa-response-final', this.getAttachmentRole(attachment.remarks) || 'final-report-attachment'));
  }

  mapVerificationAttachments(rawAttachments: any[]) {
    return rawAttachments.map((attachment: any) => this.buildAttachmentView({
      ...attachment,
      fileName: attachment.file_name,
      fileExtension: attachment.file_extension,
      fileSize: attachment.file_size,
      remarks: attachment.remarks,
      uploadedBy: attachment.updateby,
      uploadedAt: attachment.last_update,
    }, 'qmqa-response-verification', 'verification-attachment'));
  }

  resolveInitialAttachment(rawAttachments: any[]) {
    const mappedAttachments = this.mapInitialAttachments(rawAttachments);
    const taggedIndex = rawAttachments.findIndex(
      (attachment: any) => this.getAttachmentRole(attachment.remarks) === 'initialreportattachment',
    );

    if (taggedIndex >= 0) {
      return mappedAttachments[taggedIndex] || null;
    }

    return mappedAttachments[0] || null;
  }

  resolveFinalAttachmentSlots(rawAttachments: any[]) {
    const mappedAttachments = this.mapFinalAttachments(rawAttachments);
    const reportIndex = rawAttachments.findIndex(
      (attachment: any) => this.getAttachmentRole(attachment.remarks) === 'finalreport',
    );
    const attachmentIndex = rawAttachments.findIndex(
      (attachment: any) => this.getAttachmentRole(attachment.remarks) === 'finalreportattachment',
    );

    const finalReport = reportIndex >= 0
      ? mappedAttachments[reportIndex] || null
      : mappedAttachments[0] || null;

    const finalReportAttachment = attachmentIndex >= 0
      ? mappedAttachments[attachmentIndex] || null
      : mappedAttachments.find((attachment: any) => attachment.id !== finalReport?.id) || null;

    return {
      finalReport,
      finalReportAttachment,
    };
  }

  async saveSupplierResponseContent(
    id: string,
    userId: string,
    payload: {
      skip_initial?: boolean;
      initial_remarks?: string | null;
      final_remarks?: string | null;
      attachments?: any[];
    },
    files: any[] = [],
    section: 'initial' | 'final' = 'initial',
  ) {
    const now = new Date();
    const existingResponse = await qmqaRepository.findResponseByQmqaId(id);

    const result = await qmqaRepository.executeTransaction(async (trx) => {
      const responseId = existingResponse?.qmqa_response_id || uuidv4();

      if (existingResponse) {
        await trx.updateTable('QMQA_RESPONSE')
          .set({
            skip_initial: payload.skip_initial !== undefined
              ? (payload.skip_initial ? 1 : 0)
              : existingResponse.skip_initial,
            initial_report_date: section === 'initial' ? now : existingResponse.initial_report_date,
            initial_remarks: section === 'initial'
              ? (payload.initial_remarks ?? existingResponse.initial_remarks ?? null)
              : existingResponse.initial_remarks,
            final_report_date: section === 'final' ? now : existingResponse.final_report_date,
            final_remarks: section === 'final'
              ? (payload.final_remarks ?? existingResponse.final_remarks ?? null)
              : existingResponse.final_remarks,
            last_update: now,
            updateby: userId,
          })
          .where('qmqa_response_id', '=', responseId)
          .execute();
      } else {
        await trx.insertInto('QMQA_RESPONSE').values({
          qmqa_response_id: responseId,
          qmqa_id: id,
          skip_initial: payload.skip_initial ? 1 : 0,
          initial_report_date: section === 'initial' ? now : null,
          final_report_date: section === 'final' ? now : null,
          initial_remarks: section === 'initial' ? payload.initial_remarks || null : null,
          final_remarks: section === 'final' ? payload.final_remarks || null : null,
          issuer_remarks: null,
          issuer_date: null,
          checker_id: null,
          checker_remarks: null,
          checker_date: null,
          approver_id: null,
          approver_remarks: null,
          approver_date: null,
          last_update: now,
          updateby: userId,
          accept_date: null,
          remarks: null,
          verification_remarks: null,
        }).execute();
      }

      const existingAttachments = section === 'initial'
        ? await qmqaRepository.findResponseInitialAttachments(responseId)
        : await qmqaRepository.findResponseFinalAttachments(responseId);

      const attachmentCommands = Array.isArray(payload.attachments)
        ? payload.attachments
        : this.buildCompatibilityAttachmentCommands(
            existingAttachments,
            files,
            section === 'initial' ? 'initialreportattachment' : 'finalreportattachment',
          );

      const attachmentSync = await attachmentService.syncAttachments(
        trx,
        attachmentCommands,
        files,
        {
          ownerId: responseId,
          userId,
          now,
          recordConfig: section === 'initial'
            ? QMQA_RESPONSE_INITIAL_RECORD_CONFIG
            : QMQA_RESPONSE_FINAL_RECORD_CONFIG,
          createId: () => uuidv4(),
          remarkFormatter: ({ command, existing, originalName }) => {
            const role = this.getAttachmentRole(command.category || command.remarks)
              || this.getAttachmentRole(existing?.remarks)
              || (section === 'initial' ? 'initialreportattachment' : 'finalreportattachment');

            return formatAttachmentRemarks(
              role,
              originalName,
              extractOriginalFilenameMarker(existing?.remarks),
            );
          },
        },
      );

      await trx.updateTable('QMQA')
        .set({
          last_update: now,
          updateby: userId,
        })
        .where('qmqa_id', '=', id)
        .execute();

      return {
        success: true,
        data: {
          id,
          responseId,
        },
        cleanupQueue: attachmentSync.cleanupQueue,
        message: 'QMQA supplier response saved',
      };
    });

    await attachmentService.deleteStoredAttachments(
      section === 'initial' ? 'qmqa-response-initial' : 'qmqa-response-final',
      result.cleanupQueue || [],
    );

    return {
      success: result.success,
      data: result.data,
      message: result.message,
    };
  }

  async saveResponseReviewContent(
    id: string,
    userId: string,
    payload: {
      issuer_remarks?: string | null;
      verification_remarks?: string | null;
      cycle2_checker_id?: string | null;
      cycle2_checker_remarks?: string | null;
      cycle2_approver_id?: string | null;
      cycle2_approver_remarks?: string | null;
      attachments?: any[];
    },
    files: any[] = [],
  ) {
    const now = new Date();
    const existingResponse = await qmqaRepository.findResponseByQmqaId(id);
    const cleanCheckerId = sanitizeUUID(payload.cycle2_checker_id);
    const cleanApproverId = sanitizeUUID(payload.cycle2_approver_id);

    if (cleanCheckerId) {
      await validateChecker(cleanCheckerId, QMQA_RESPONSE_APPROVAL_FORM_ID);
    }

    if (cleanApproverId) {
      await validateApprover(cleanApproverId, QMQA_RESPONSE_APPROVAL_FORM_ID);
    }

    const result = await qmqaRepository.executeTransaction(async (trx) => {
      const responseId = existingResponse?.qmqa_response_id || uuidv4();

      if (existingResponse) {
        await trx.updateTable('QMQA_RESPONSE')
          .set({
            issuer_date: now,
            issuer_remarks: payload.issuer_remarks
              ?? payload.verification_remarks
              ?? existingResponse.issuer_remarks
              ?? null,
            checker_id: cleanCheckerId ?? existingResponse.checker_id ?? null,
            checker_remarks: payload.cycle2_checker_remarks ?? existingResponse.checker_remarks ?? null,
            approver_id: cleanApproverId ?? existingResponse.approver_id ?? null,
            approver_remarks: payload.cycle2_approver_remarks ?? existingResponse.approver_remarks ?? null,
            verification_remarks: payload.verification_remarks ?? existingResponse.verification_remarks ?? null,
            last_update: now,
            updateby: userId,
          })
          .where('qmqa_response_id', '=', responseId)
          .execute();
      } else {
        await trx.insertInto('QMQA_RESPONSE').values({
          qmqa_response_id: responseId,
          qmqa_id: id,
          skip_initial: 0,
          initial_report_date: null,
          final_report_date: null,
          initial_remarks: null,
          final_remarks: null,
          issuer_remarks: payload.issuer_remarks || payload.verification_remarks || null,
          issuer_date: now,
          checker_id: cleanCheckerId || null,
          checker_remarks: payload.cycle2_checker_remarks || null,
          checker_date: null,
          approver_id: cleanApproverId || null,
          approver_remarks: payload.cycle2_approver_remarks || null,
          approver_date: null,
          last_update: now,
          updateby: userId,
          accept_date: null,
          remarks: null,
          verification_remarks: payload.verification_remarks || null,
        }).execute();
      }

      const existingAttachments = await qmqaRepository.findResponseVerificationAttachments(responseId);
      const attachmentCommands = Array.isArray(payload.attachments)
        ? payload.attachments
        : this.buildCompatibilityAttachmentCommands(
            existingAttachments,
            files,
            'verificationattachment',
          );

      const attachmentSync = await attachmentService.syncAttachments(
        trx,
        attachmentCommands,
        files,
        {
          ownerId: responseId,
          userId,
          now,
          recordConfig: QMQA_RESPONSE_VERIFICATION_RECORD_CONFIG,
          createId: () => uuidv4(),
          remarkFormatter: ({ command, existing, originalName }) => {
            const role = this.getAttachmentRole(command.category || command.remarks)
              || this.getAttachmentRole(existing?.remarks)
              || 'verificationattachment';

            return formatAttachmentRemarks(
              role,
              originalName,
              extractOriginalFilenameMarker(existing?.remarks),
            );
          },
        },
      );

      await trx.updateTable('QMQA')
        .set({
          last_update: now,
          updateby: userId,
        })
        .where('qmqa_id', '=', id)
        .execute();

      return {
        success: true,
        data: {
          id,
          responseId,
        },
        cleanupQueue: attachmentSync.cleanupQueue,
        message: 'QMQA response review saved',
      };
    });

    await attachmentService.deleteStoredAttachments('qmqa-response-verification', result.cleanupQueue || []);

    return {
      success: result.success,
      data: result.data,
      message: result.message,
    };
  }
}

export const qmqaResponseService = new QmqaResponseService();
