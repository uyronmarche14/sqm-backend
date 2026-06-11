import { v4 as uuidv4 } from 'uuid';
import { getSubFormFormCodes } from '@sqm/permissions-contract';
import { BadRequestError } from '../../../shared/errors/AppError.js';
import { attachmentService } from '../../../shared/services/attachment.service.js';
import {
  extractOriginalFilenameMarker,
  formatAttachmentRemarks,
} from '../../../shared/utils/attachment-remarks.js';
import {
  validateApprover,
  validateChecker,
} from '../../../shared/utils/assignment-validation.utils.js';

const MNR_RESPONSE_ATTACHMENT_RECORD_CONFIG = {
  tableName: 'MNR_RESPONSE_ATTACHMENT',
  ownerColumn: 'mnr_response_id',
  idColumn: 'mnr_response_attachment_id',
  fileNameColumn: 'file_name',
  extensionColumn: 'file_extension',
  remarksColumn: 'remarks',
  lastUpdateColumn: 'last_update',
  updatedByColumn: 'updateby',
} as const;

const MNR_RESPONSE_APPROVAL_FORM_ID =
  getSubFormFormCodes('MNR', 'RESPONSE_AWAIT_APPROVAL')[0] ?? 'MNR-12-10';

export class MnrResponseService {
  formatDate(dateStr?: string | null): Date | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  sanitizeUserForeignKey(value?: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  async resolveAttentionId(trx: any, attentionId: string | null): Promise<string> {
    const cleanAttentionId = this.sanitizeUserForeignKey(attentionId);
    if (!cleanAttentionId) {
      throw new BadRequestError('Attention is required.');
    }

    const supplierUser = await trx
      .selectFrom('SUPPLIERSUSER')
      .select('user_id')
      .where('Id', '=', cleanAttentionId)
      .executeTakeFirst();

    if (supplierUser?.user_id) {
      return supplierUser.user_id;
    }

    const userExists = await trx
      .selectFrom('USERS')
      .select('user_id')
      .where('user_id', '=', cleanAttentionId)
      .executeTakeFirst();

    if (userExists?.user_id) {
      return userExists.user_id;
    }

    throw new BadRequestError('Attention must be selected from the supplier attention lookup.');
  }

  buildResponseUpdatePayload(responsePayload: Record<string, any>, userId: string, now: Date) {
    return {
      d1: responsePayload.d1_teamApproach || responsePayload.teamApproach || null,
      d2: responsePayload.d2_problemDescription || responsePayload.problemDescription || null,
      d3: responsePayload.d3_containmentPlan || responsePayload.containmentPlan || null,
      d4: responsePayload.d4_rootCause || responsePayload.rootCause || null,
      d5: responsePayload.d5_correctiveAction || responsePayload.correctiveAction || null,
      d6: responsePayload.d6_verificationEffectiveness || responsePayload.verificationEffectiveness || null,
      d7: responsePayload.d7_preventRecurrence || responsePayload.preventRecurrence || null,
      d8: responsePayload.d8_completionApproval || responsePayload.ultimateVerification || null,
      invoice_no: responsePayload.invoiceDrNo || responsePayload.invoiceNo || null,
      lot_size: this.toNumber(responsePayload.lotSize),
      lot_no: responsePayload.lotNo || null,
      eta: responsePayload.eta || null,
      marking: responsePayload.ifSortedMarkingIdentification || responsePayload.marking || null,
      rtv_received: this.toNumber(responsePayload.actualRtvReceived ?? responsePayload.rtvReceived),
      replacement_date: this.formatDate(responsePayload.targetReplacementDate || responsePayload.replacementDate),
      replacement_qty: this.toNumber(responsePayload.replacementQty),
      ncv_invoice_no: responsePayload.ncvInvoiceNo || null,
      label: responsePayload.boxLabelIdentification || responsePayload.label || null,
      remarks: responsePayload.correctedPartsNotice || responsePayload.remarks || null,
      attention_date: this.formatDate(responsePayload.attentionDate),
      accept_date: this.formatDate(responsePayload.acceptDate),
      checker_id: responsePayload.cycle2CheckerId || responsePayload.checker || null,
      checker_remarks: responsePayload.cycle2CheckerRemarks || responsePayload.checkerRemarks || null,
      checker_date: this.formatDate(responsePayload.cycle2CheckerDate || responsePayload.checkerDate),
      approver_id: responsePayload.cycle2ApproverId || responsePayload.approver || null,
      approver_remarks: responsePayload.cycle2ApproverRemarks || responsePayload.approverRemarks || null,
      approver_date: this.formatDate(responsePayload.cycle2ApproverDate || responsePayload.approverDate),
      issuer_remarks: responsePayload.cycle2IssuerRemarks || responsePayload.issuerRemarks || null,
      issuer_date: this.formatDate(responsePayload.cycle2IssuerDate || responsePayload.issuerDate),
      last_update: now,
      updateby: userId,
    };
  }

  async persistResponseArtifacts(
    trx: any,
    realId: string,
    responsePayload: Record<string, any>,
    userId: string,
    now: Date,
    files: any[] = [],
  ) {
    const nextCheckerId = this.sanitizeUserForeignKey(
      responsePayload.cycle2CheckerId || responsePayload.checker,
    );
    const nextApproverId = this.sanitizeUserForeignKey(
      responsePayload.cycle2ApproverId || responsePayload.approver,
    );

    if (nextCheckerId) {
      await validateChecker(nextCheckerId, MNR_RESPONSE_APPROVAL_FORM_ID);
    }
    if (nextApproverId) {
      await validateApprover(nextApproverId, MNR_RESPONSE_APPROVAL_FORM_ID);
    }

    const existingResponse = await trx
      .selectFrom('MNR_RESPONSE')
      .select('mnr_response_id')
      .where('mnr_id', '=', realId)
      .executeTakeFirst();

    const responseId = existingResponse?.mnr_response_id || uuidv4();

    const responseUpdatePayload = this.buildResponseUpdatePayload(responsePayload, userId, now);

    if (existingResponse?.mnr_response_id) {
      await trx
        .updateTable('MNR_RESPONSE')
        .set(responseUpdatePayload)
        .where('mnr_id', '=', realId)
        .execute();
    } else {
      await trx
        .insertInto('MNR_RESPONSE')
        .values({
          mnr_response_id: responseId,
          mnr_id: realId,
          ...responseUpdatePayload,
        })
        .execute();
    }

    if (Array.isArray(responsePayload.verificationEntries)) {
      await trx.deleteFrom('MNR_VERIFICATION').where('mnr_id', '=', realId).execute();
      for (const entry of responsePayload.verificationEntries) {
        if (!entry?.receivedDate || !entry?.invoiceNo || !entry?.judgment) continue;
        await trx.insertInto('MNR_VERIFICATION').values({
          mnr_verification_id: uuidv4(),
          mnr_id: realId,
          received_date: this.formatDate(entry.receivedDate) || now,
          invoice_no: String(entry.invoiceNo),
          judgment: String(entry.judgment),
          remarks: entry.remarks ? String(entry.remarks) : null,
          last_update: now,
          updateby: userId,
        }).execute();
      }
    }

    const responseAttachments = Array.isArray(responsePayload.attachments)
      ? responsePayload.attachments
      : Array.isArray(responsePayload.responseAttachments)
        ? responsePayload.responseAttachments
        : undefined;

    const attachmentSync = await attachmentService.syncAttachments(
      trx,
      responseAttachments,
      files,
      {
        ownerId: responseId,
        userId,
        now,
        recordConfig: MNR_RESPONSE_ATTACHMENT_RECORD_CONFIG,
        createId: () => uuidv4(),
        remarkFormatter: ({ command, existing, originalName }) =>
          formatAttachmentRemarks(
            command.remarks ?? existing?.remarks ?? null,
            originalName,
            extractOriginalFilenameMarker(existing?.remarks),
          ),
      },
    );

    return attachmentSync;
  }
}

export const mnrResponseService = new MnrResponseService();
