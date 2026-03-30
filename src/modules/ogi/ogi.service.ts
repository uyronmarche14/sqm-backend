import { v4 as uuidv4 } from 'uuid';
import { getSubFormFormCodes } from '@sqm/permissions-contract';
import { ogiRepository } from './ogi.repository.js';
import { OGICreationInput, OGIUpdateInput } from './ogi.schema.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/AppError.js';
import { mapStatusFromDB } from '../../shared/utils/status-mapper.js';
import {
  assertWorkflowRecordAccess,
  filterWorkflowRecordsByScope,
  type WorkflowListScope,
} from '../../shared/utils/workflow-access.js';
import { controlNumberService } from '../../shared/services/control-number.service.js';
import { attachmentService } from '../../shared/services/attachment.service.js';
import { permissionService } from '../../shared/services/permission.service.js';
import { formatAttachmentRemarks } from '../../shared/utils/attachment-remarks.js';
import { isAdminRole } from '../../shared/utils/admin.utils.js';
import {
  ogiNotificationService,
  type OgiNotificationSender,
} from '../../shared/notifications/ogi-notification.service.js';
import type { EmailAddress } from '../../shared/notifications/email.types.js';

const OGI_DB_STATUS = {
  DRAFT: 'DR',
  SUBMITTED: 'SB',
} as const;

const OGI_QUEUE_STATUS_FORM_FALLBACKS: Record<string, string[]> = {
  NEW: ['OGI-01-01'],
  DRAFT: ['OGI-01-02'],
  DR: ['OGI-01-02'],
  SUBMITTED: ['OGI-01-03'],
  SB: ['OGI-01-03'],
  SU: ['OGI-01-03'],
  SEARCH: ['OGI-01-04'],
};

function uniqueFormCodes(formIds: string[]) {
  return Array.from(new Set(formIds.filter(Boolean)));
}

function resolveOgiQueueFormUniverse() {
  const contractCodes = Object.keys(OGI_QUEUE_STATUS_FORM_FALLBACKS).flatMap((stage) =>
    getSubFormFormCodes('OGI', stage),
  );
  const fallbackCodes = Object.values(OGI_QUEUE_STATUS_FORM_FALLBACKS).flat();
  return uniqueFormCodes([...contractCodes, ...fallbackCodes]);
}

const OGI_QUEUE_FORM_CODES = resolveOgiQueueFormUniverse();
const OGI_REFERENCE_FORM_CODE = 'OGI-01-04';

function mapOgiStatusFromDB(code?: string): string {
  const normalized = String(code || OGI_DB_STATUS.DRAFT).toUpperCase();

  if (normalized === 'SB' || normalized === 'SU') {
    return 'SUBMITTED';
  }

  return mapStatusFromDB(normalized);
}

export class OgiService {
  constructor(
    private readonly repository = ogiRepository,
    private readonly permissions = permissionService,
    private readonly notifications: OgiNotificationSender = ogiNotificationService,
  ) {}

  private assertSubmitControlNoInputs(input: { siteId?: string | null; siteCode?: string | null }) {
    if (!input.siteId && !input.siteCode) {
      throw new BadRequestError('Site is required before submitting this OGI record.');
    }
  }

  private isActiveUserFlag(flag: boolean | number | null | undefined) {
    return flag === true || flag === 1 || flag === null || flag === undefined;
  }

  private formatNotificationDate(value: Date | string | null | undefined) {
    if (!value) {
      return '-';
    }

    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }

    return parsed.toISOString();
  }

  private async resolveActorName(userId: string) {
    if (typeof (this.repository as any).findUserContactById !== 'function') {
      return userId;
    }

    const actor = await (this.repository as any).findUserContactById(userId);
    return actor?.name || userId;
  }

  private async resolveSubmittedRecipients(): Promise<EmailAddress[]> {
    if (typeof this.permissions.findUsersWithRolePermission !== 'function') {
      return [];
    }

    const eligibleUsers = await this.permissions.findUsersWithRolePermission('OGI-01-03', 'viewlist');
    if (!eligibleUsers.length || typeof (this.repository as any).findUserContactById !== 'function') {
      return [];
    }

    const contacts = await Promise.all(
      eligibleUsers.map((user) => (this.repository as any).findUserContactById(user.userId)),
    );

    const seen = new Set<string>();
    const recipients: EmailAddress[] = [];

    for (const contact of contacts) {
      const email = String(contact?.email || '').trim();
      if (!email || !this.isActiveUserFlag(contact?.activeFlag)) {
        continue;
      }

      const key = email.toLowerCase();
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      recipients.push({
        email,
        name: contact?.name || undefined,
      });
    }

    return recipients;
  }

  private async sendSubmittedNotification(recordId: string, actorUserId: string, fallbackControlNo?: string) {
    const data = await this.repository.findByIdDetailed(recordId);
    if (!data) {
      return;
    }

    const recipients = await this.resolveSubmittedRecipients();
    if (recipients.length === 0) {
      console.warn(
        '[ogi] workflow email notification skipped',
        JSON.stringify({
          recordId,
          eventKey: 'ogi.submitted',
          reason: 'no_role_access_recipients',
          controlNo: fallbackControlNo || data.record.control_no || null,
        }),
      );
      return;
    }

    const actorName = await this.resolveActorName(actorUserId);

    try {
      const result = await this.notifications.sendSubmittedNotification({
        eventKey: 'ogi.submitted',
        recordId: data.record.ogi_id,
        controlNo: String(fallbackControlNo || data.record.control_no || ''),
        supplierName: String(data.record.supplier_name || ''),
        siteName: data.record.site_name || data.record.site_code || null,
        submittedByName: actorName,
        submittedDate: this.formatNotificationDate(data.record.submit_date),
        message: `The report has been submitted by ${actorName}`,
        subject: `<OGI> Uploaded - ${String(data.record.supplier_name || '')}`,
        to: recipients,
      });

      console.log(
        '[ogi] workflow email notification processed',
        JSON.stringify({
          recordId: data.record.ogi_id,
          eventKey: 'ogi.submitted',
          transport: result.transport,
          delivered: result.delivered,
          skipped: result.skipped ?? false,
          subject: result.subject,
          recipients: result.recipients,
          referenceId: result.referenceId ?? null,
        }),
      );
    } catch (error) {
      console.error(
        '[ogi] workflow email notification failed',
        JSON.stringify({
          recordId,
          eventKey: 'ogi.submitted',
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  private isAdminActor(actor?: { roleName?: string | null }) {
    return isAdminRole(actor?.roleName);
  }

  private async resolveRoleViewListFormCodes(userId?: string | null) {
    if (!userId) {
      return new Set<string>();
    }

    const checks = await Promise.all(
      OGI_QUEUE_FORM_CODES.map(async (formId) => ({
        formId,
        allowed: await this.permissions.checkRolePermission(userId, formId, 'viewlist'),
      })),
    );

    return new Set(
      checks
        .filter((entry) => entry.allowed)
        .map((entry) => entry.formId),
    );
  }

  private hasReferenceViewListAccess(record: Record<string, any>, roleViewListForms: Set<string>) {
    if (roleViewListForms.size === 0 || !roleViewListForms.has(OGI_REFERENCE_FORM_CODE)) {
      return false;
    }

    return mapOgiStatusFromDB(record.request_status ?? record.status) === 'SUBMITTED';
  }

  private isAssignedRecord(record: Record<string, any>, actor?: { userId?: string; roleName?: string | null }) {
    if (!actor?.userId || this.isAdminActor(actor)) {
      return false;
    }

    return record.incharge_id === actor.userId;
  }

  private isMineRecord(record: Record<string, any>, actor?: { userId?: string; roleName?: string | null }) {
    if (!actor?.userId || this.isAdminActor(actor)) {
      return false;
    }

    return record.incharge_id === actor.userId;
  }

  private canReadRecord(
    record: Record<string, any>,
    actor?: { userId?: string; roleName?: string | null },
    roleViewListForms: Set<string> = new Set(),
  ) {
    if (!actor?.userId) {
      return false;
    }

    if (this.isAdminActor(actor)) {
      return true;
    }

    if (this.isMineRecord(record, actor)) {
      return true;
    }

    return this.hasReferenceViewListAccess(record, roleViewListForms);
  }

  private canMutateRecord(record: Record<string, any>, actor?: { userId?: string; roleName?: string | null }) {
    if (this.isAdminActor(actor)) {
      return true;
    }

    if (!actor?.userId || record.incharge_id !== actor.userId) {
      return false;
    }

    const status = mapOgiStatusFromDB(record.request_status ?? record.status);
    return status === 'DRAFT';
  }

  private canDeleteRecord(record: Record<string, any>, actor?: { userId?: string; roleName?: string | null }) {
    if (this.isAdminActor(actor)) {
      return true;
    }

    if (!actor?.userId || record.incharge_id !== actor.userId) {
      return false;
    }

    return mapOgiStatusFromDB(record.request_status ?? record.status) === 'DRAFT';
  }

  private decorateRecord(
    record: Record<string, any>,
    actor?: { userId?: string; roleName?: string | null },
    roleViewListForms: Set<string> = new Set(),
  ) {
    const status = mapOgiStatusFromDB(record.request_status);
    const canEdit = this.canMutateRecord(record, actor);
    const canDelete = this.canDeleteRecord(record, actor);

    return {
      ...record,
      status,
      created_at: record.upload_date,
      workflow: {
        status,
        availableActions: canEdit ? ['save', 'submit'] : [],
        blockers: [],
      },
      permissions: {
        canView: this.canReadRecord(record, actor, roleViewListForms),
        canEdit,
        canDelete,
      },
    };
  }

  
  async generateSequence(siteId: string): Promise<string> {
    return controlNumberService.buildOgiDraft({ siteId });
  }

  async getAllRecords(
    actor?: { userId?: string; roleName?: string | null },
    scope: WorkflowListScope = 'history',
  ) {
    const records = await this.repository.findAllDetailed();
    if (records.length === 0) return [];

    const ogiIds = records.map((r: any) => r.ogi_id);
    const allLots = await this.repository.fetchLotsByOgiIds(ogiIds);
    const allAttachments = await this.repository.fetchAttachmentsByOgiIds(ogiIds);

    const roleViewListForms = this.isAdminActor(actor)
      ? new Set<string>()
      : await this.resolveRoleViewListFormCodes(actor?.userId);
    const visibleRecords = this.isAdminActor(actor)
      ? records
      : filterWorkflowRecordsByScope(records, scope, {
          isAssigned: (record) => this.isAssignedRecord(record as any, actor),
          isMine: (record) => this.isMineRecord(record as any, actor),
          isHistoryVisible: (record) => this.canReadRecord(record as any, actor, roleViewListForms),
        });

    return visibleRecords.map((r: any) => {
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
        ...this.decorateRecord(r, actor, roleViewListForms),
        lots: rLots,
        attachments: rAtts
      };
    });
  }

  async getRecordById(id: string, actor?: { userId?: string; roleName?: string | null }) {
    const data = await this.repository.findByIdDetailed(id);
    if (!data) throw new NotFoundError('OGI Record not found');
    const roleViewListForms = this.isAdminActor(actor)
      ? new Set<string>()
      : await this.resolveRoleViewListFormCodes(actor?.userId);
    assertWorkflowRecordAccess({
      allowed: this.canReadRecord(data.record, actor, roleViewListForms),
      action: 'view',
      moduleName: 'OGI',
    });

    const { record, lots, attachments } = data;

    return {
      ...this.decorateRecord(record, actor, roleViewListForms),
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

    const dbPayload = {
        ogi_id: recordId,
        control_no: '',
        upload_date: now,
        site_id: payload.siteId,
        supplier_id: payload.supplierId,
        part_id: payload.partId,
        remarks: payload.remarks || null,
        incharge_id: effectiveUserId,
        request_status: OGI_DB_STATUS.DRAFT,
        submit_date: null,
        last_update: now,
        updateby: effectiveUserId
    };

    return await this.repository.executeTransaction(async (trx) => {
      const controlNo = await controlNumberService.buildOgiDraft(
        {
          siteId: payload.siteId,
          date: now,
        },
        trx,
      );

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
          if (!originalName) continue;
          
          const uploadedFile = files.find(f => f.originalname === originalName);
          const diskFileName = uploadedFile ? uploadedFile.filename : originalName;
          const finalRemarks = formatAttachmentRemarks(att.remarks, originalName)?.slice(0, 200) || null;

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

  async updateRecord(
    id: string,
    payload: OGIUpdateInput,
    actor: { userId?: string; roleName?: string | null },
    files: any[] = [],
  ) {
    const existing = await this.repository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('Record not found');
    assertWorkflowRecordAccess({
      allowed: this.canMutateRecord(existing.record, actor),
      action: 'update',
      moduleName: 'OGI',
    });
    
    const now = new Date();
    const effectiveUserId = actor.userId || 'SYSTEM';

    const dbUpdates: any = {
      last_update: now,
      updateby: effectiveUserId
    };

    if (payload.siteId) dbUpdates.site_id = payload.siteId;
    if (payload.supplierId) dbUpdates.supplier_id = payload.supplierId;
    if (payload.partId) dbUpdates.part_id = payload.partId;
    if (payload.remarks !== undefined) dbUpdates.remarks = payload.remarks;

    return await this.repository.executeTransaction(async (trx) => {
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
            if (!originalName) continue;
            
            const uploadedFile = files.find(f => f.originalname === originalName);
            const diskFileName = uploadedFile ? uploadedFile.filename : originalName;
            const finalRemarks = formatAttachmentRemarks(att.remarks, originalName)?.slice(0, 200) || null;
  
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
  async submitRecord(idOrControlNo: string, userId: string) {
    const existing = await this.repository.findByIdDetailed(idOrControlNo);
    if (!existing) throw new NotFoundError('OGI Record not found');

    const currentStatus = mapOgiStatusFromDB(existing.record.request_status);

    if (currentStatus !== 'DRAFT') {
      throw new Error(`Cannot submit: record is in ${currentStatus}, expected DRAFT`);
    }

    const now = new Date();
    let controlNo = String(existing.record.control_no || '');
    const result = await this.repository.executeTransaction(async (trx) => {
      this.assertSubmitControlNoInputs({
        siteId: existing.record.site_id,
        siteCode: existing.record.site_code,
      });
      controlNo = await controlNumberService.finalizeOgi(
        {
          siteId: existing.record.site_id,
          siteCode: existing.record.site_code,
          date: now,
        },
        trx,
      );

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

    await this.sendSubmittedNotification(existing.record.ogi_id, userId, controlNo);

    return result;
  }
  /**
   * Deletes an OGI record and all child tables
   */
  async deleteRecord(id: string, actor?: { userId?: string; roleName?: string | null }) {
    const existing = await this.repository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('OGI Record not found');
    assertWorkflowRecordAccess({
      allowed: this.canDeleteRecord(existing.record, actor),
      action: 'delete',
      moduleName: 'OGI',
    });

    const ogiId = existing.record.ogi_id;

    return await this.repository.executeTransaction(async (trx) => {
      await trx.deleteFrom('OGI_LOTS').where('ogi_id', '=', ogiId).execute();
      await trx.deleteFrom('OGI_ATTACHMENT').where('ogi_id', '=', ogiId).execute();
      await trx.deleteFrom('OGI').where('ogi_id', '=', ogiId).execute();
      return { success: true, data: { id }, message: 'OGI Record deleted successfully' };
    });
  }

  async downloadAttachment(attachmentId: string, actor?: { userId?: string; roleName?: string | null }) {
    const owner = await this.repository.findAttachmentOwner(attachmentId);
    if (!owner?.ogi_id) {
      throw new NotFoundError('Attachment not found');
    }

    const existing = await this.repository.findByIdDetailed(owner.ogi_id);
    if (!existing) {
      throw new NotFoundError('OGI Record not found');
    }

    const roleViewListForms = this.isAdminActor(actor)
      ? new Set<string>()
      : await this.resolveRoleViewListFormCodes(actor?.userId);
    assertWorkflowRecordAccess({
      allowed: this.canReadRecord(existing.record, actor, roleViewListForms),
      action: 'download',
      moduleName: 'OGI',
    });

    return attachmentService.downloadAttachment('ogi-main', attachmentId);
  }
}

export const ogiService = new OgiService();
