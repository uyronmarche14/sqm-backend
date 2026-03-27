import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../shared/infrastructure/db.js';
import { qmqaRepository } from '../qmqa.repository.js';
import { sanitizeUUID } from './qmqa-module-strategy.js';

export class QmqaResponseService {
  private getAttachmentRole(remarks: unknown) {
    if (typeof remarks !== 'string') {
      return null;
    }

    const normalized = remarks.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    return normalized;
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
    return rawAttachments.map((attachment: any) => ({
      id: attachment.qmqa_response_initial_attachment_id,
      fileName: attachment.file_name,
      fileExtension: attachment.file_extension,
      fileSize: attachment.file_size,
      fileUrl: attachment.file_url,
      remarks: attachment.remarks,
      uploadedBy: attachment.updateby,
      uploadedAt: attachment.last_update,
    }));
  }

  mapFinalAttachments(rawAttachments: any[]) {
    return rawAttachments.map((attachment: any) => ({
      id: attachment.qmqa_response_final_attachment_id,
      fileName: attachment.file_name,
      fileExtension: attachment.file_extension,
      fileSize: attachment.file_size,
      fileUrl: attachment.file_url,
      remarks: attachment.remarks,
      uploadedBy: attachment.updateby,
      uploadedAt: attachment.last_update,
    }));
  }

  mapVerificationAttachments(rawAttachments: any[]) {
    return rawAttachments.map((attachment: any) => ({
      id: attachment.qmqa_response_verification_attachment_id,
      fileName: attachment.file_name,
      fileExtension: attachment.file_extension,
      fileSize: attachment.file_size,
      fileUrl: attachment.file_url,
      remarks: attachment.remarks,
      uploadedBy: attachment.updateby,
      uploadedAt: attachment.last_update,
    }));
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
    },
    files: any[] = [],
    section: 'initial' | 'final' = 'initial',
  ) {
    const now = new Date();
    const existingResponse = await qmqaRepository.findResponseByQmqaId(id);

    return qmqaRepository.executeTransaction(async (trx) => {
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

      const attachmentTable = section === 'initial'
        ? 'QMQA_RESPONSE_INITIAL'
        : 'QMQA_RESPONSE_FINAL';
      const attachmentIdColumn = section === 'initial'
        ? 'qmqa_response_initial_attachment_id'
        : 'qmqa_response_final_attachment_id';

      for (const file of files) {
        await trx.insertInto(attachmentTable).values({
          [attachmentIdColumn]: uuidv4(),
          qmqa_response_id: responseId,
          file_name: file.filename || file.originalname,
          file_extension: (file.filename || file.originalname || '').split('.').pop() || 'unknown',
          remarks: typeof file.fieldname === 'string' ? file.fieldname : null,
          last_update: now,
          updateby: userId,
        } as any).execute();
      }

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
        message: 'QMQA supplier response saved',
      };
    });
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
    },
    files: any[] = [],
  ) {
    const now = new Date();
    const existingResponse = await qmqaRepository.findResponseByQmqaId(id);
    const cleanCheckerId = sanitizeUUID(payload.cycle2_checker_id);
    const cleanApproverId = sanitizeUUID(payload.cycle2_approver_id);

    return qmqaRepository.executeTransaction(async (trx) => {
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

      for (const file of files) {
        await trx.insertInto('QMQA_RESPONSE_VERIFICATION').values({
          qmqa_response_verification_attachment_id: uuidv4(),
          qmqa_response_id: responseId,
          file_name: file.filename || file.originalname,
          file_extension: (file.filename || file.originalname || '').split('.').pop() || 'unknown',
          remarks: typeof file.fieldname === 'string' ? file.fieldname : null,
          last_update: now,
          updateby: userId,
        }).execute();
      }

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
        message: 'QMQA response review saved',
      };
    });
  }
}

export const qmqaResponseService = new QmqaResponseService();
