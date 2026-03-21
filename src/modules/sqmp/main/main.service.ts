import { v4 as uuidv4 } from 'uuid';
import { getModuleFormCodes, getSubFormFormCodes } from '@sqm/permissions-contract';
import { sqmpRepository } from '../sqmp.repository.js';
import { userRepository } from '../../users/user.repository.js';
import { SQMPCreationInput, SQMPUpdateInput } from './main.schema.js';
import { NotFoundError, ForbiddenError } from '../../../shared/errors/AppError.js';
import { sanitizeAttachmentRemarks } from '../utils/attachment.util.js';
import { SQMP_STAGE_CODE } from '../workflow/workflow.constants.js';
import { buildSqmpWorkflowMetadata } from '../workflow/workflow.utils.js';
import { controlNumberService } from '../../../shared/services/control-number.service.js';
import { attachmentService } from '../../../shared/services/attachment.service.js';
import {
  assertWorkflowRecordAccess,
  filterWorkflowRecordsByScope,
  type WorkflowListScope,
} from '../../../shared/utils/workflow-access.js';
import { permissionService } from '../../../shared/services/permission.service.js';

const SQMP_STATUS_FORM_FALLBACKS: Record<string, string[]> = {
  NEW: ['SQMP-09-01'],
  DRAFT: ['SQMP-09-02'],
  SUBMITTED: ['SQMP-09-03'],
  CHECKED: ['SQMP-09-03'],
  AWAITING_CHECKED: ['SQMP-09-03'],
  AAPPROVAL: ['SQMP-09-03'],
  A_APPROVAL: ['SQMP-09-03'],
  AWAITING_APPROVAL: ['SQMP-09-03'],
  APPROVED: ['SQMP-09-04'],
  ISSUED: ['SQMP-09-05', 'SQMP-09-06'],
  RESPONSE_AWAITING: ['SQMP-09-06'],
  RESPONSE_SUBMITTED: ['SQMP-09-06'],
  RESPONSE_AWAITING_CHECKED: ['SQMP-09-07'],
  RESPONSE_CHECKED: ['SQMP-09-07'],
  RESPONSE_AWAIT_APPROVAL: ['SQMP-09-07'],
  RESPONSE_AWAITING_APPROVAL: ['SQMP-09-07'],
  RESPONSE_APPROVAL: ['SQMP-09-07'],
  RESPONSE_AAPPROVAL: ['SQMP-09-07'],
  RESPONSE_REJECTED: ['SQMP-09-08'],
  CLOSED: ['SQMP-09-09'],
  CANCEL: ['SQMP-09-10'],
  CANCELLED: ['SQMP-09-10'],
  REJECTED: ['SQMP-09-11'],
  ACHIEVEMENT: ['SQMP-09-12'],
  SEARCH: ['SQMP-09-13'],
  REPORT: ['SQMP-09-14'],
  '1': ['SQMP-09-09'],
  '2': ['SQMP-09-02'],
  '3': ['SQMP-09-03'],
  '4': ['SQMP-09-03'],
  '5': ['SQMP-09-11'],
  '6': ['SQMP-09-11'],
  '9': ['SQMP-09-10'],
  '10': ['SQMP-09-04'],
  '11': ['SQMP-09-05', 'SQMP-09-06'],
  '15': ['SQMP-09-06'],
  '16': ['SQMP-09-07'],
  '17': ['SQMP-09-07'],
  '19': ['SQMP-09-07'],
  '21': ['SQMP-09-08'],
  '22': ['SQMP-09-08'],
  '24': ['SQMP-09-08'],
};

const SQMP_QUEUE_FORM_CODES = getModuleFormCodes('SQM_PLAN').filter((formId) => formId.startsWith('SQMP-09-'));
const SQMP_HISTORY_STAGE_CODES = new Set<string>([
  SQMP_STAGE_CODE.CLOSED,
  SQMP_STAGE_CODE.CANCELLED,
]);
const SQMP_EDITABLE_STAGE_CODES = new Set<string>([
  SQMP_STAGE_CODE.DRAFT,
  SQMP_STAGE_CODE.REJECTED_BY_CHECKER,
  SQMP_STAGE_CODE.REJECTED_BY_APPROVER,
]);

export class MainSqmpService {
  private isGlobalRole(roleName?: string) {
    return (roleName || '').toUpperCase().includes('ADMIN');
  }

  private isSupplierRole(roleName?: string) {
    return (roleName || '').toUpperCase().includes('SUPPLIER');
  }

  private resolveRecordFormCodes(record: any, latestResponse: any): string[] {
    const metadata = buildSqmpWorkflowMetadata({
      record,
      latestResponse,
    });

    const status = String(metadata.status || record?.request_status || '').toUpperCase();
    const formCodes = new Set<string>([
      ...getSubFormFormCodes('SQM_PLAN', status),
      ...(SQMP_STATUS_FORM_FALLBACKS[status] || []),
    ]);

    return formCodes.size > 0 ? Array.from(formCodes) : SQMP_QUEUE_FORM_CODES;
  }

  private async resolveRoleViewListFormCodes(userId?: string): Promise<Set<string>> {
    if (!userId) {
      return new Set();
    }

    const checks = await Promise.all(
      SQMP_QUEUE_FORM_CODES.map(async (formId) => ({
        formId,
        allowed: await permissionService.checkRolePermission(userId, formId, 'viewlist'),
      })),
    );

    return new Set(
      checks
        .filter((entry) => entry.allowed)
        .map((entry) => entry.formId),
    );
  }

  private hasRoleViewListAccessForRecord(record: any, latestResponse: any, roleViewListForms: Set<string>) {
    if (roleViewListForms.size === 0) {
      return false;
    }

    return this.resolveRecordFormCodes(record, latestResponse).some((formId) => roleViewListForms.has(formId));
  }

  private hasSupplierAccess(record: any, userId?: string, supplierIds: string[] = []) {
    if (!record || !userId) {
      return false;
    }

    return supplierIds.includes(record.supplier_id) || record.attention_id === userId;
  }

  private buildWorkflowMetadata(
    record: any,
    latestResponse: any,
    userId?: string,
    roleName?: string,
    supplierIds: string[] = [],
    userSiteId?: string | null,
  ) {
    return buildSqmpWorkflowMetadata({
      record,
      latestResponse,
      userId,
      roleName,
      userSiteId: userSiteId || null,
      supplierIds,
    });
  }

  private canReadRecord(
    record: any,
    latestResponse: any,
    userId?: string,
    roleName?: string,
    supplierIds: string[] = [],
    roleViewListForms: Set<string> = new Set(),
    userSiteId?: string | null,
  ) {
    if (!record || !userId) {
      return false;
    }

    if (this.isGlobalRole(roleName)) {
      return true;
    }

    const metadata = this.buildWorkflowMetadata(
      record,
      latestResponse,
      userId,
      roleName,
      supplierIds,
      userSiteId,
    );

    if (this.isSupplierRole(roleName)) {
      return this.hasSupplierAccess(record, userId, supplierIds) && (
        (Array.isArray(metadata.availableActions) && metadata.availableActions.length > 0) ||
        SQMP_HISTORY_STAGE_CODES.has(metadata.workflowStageCode)
      );
    }

    if (Array.isArray(metadata.availableActions) && metadata.availableActions.length > 0) {
      return true;
    }

    if (!SQMP_HISTORY_STAGE_CODES.has(metadata.workflowStageCode)) {
      return false;
    }

    return (
      this.hasRoleViewListAccessForRecord(record, latestResponse, roleViewListForms) ||
      this.isMineRecord(record, latestResponse, userId, roleName, supplierIds)
    );
  }

  private isMineRecord(record: any, latestResponse: any, userId?: string, roleName?: string, supplierIds: string[] = []) {
    if (!userId) {
      return false;
    }

    if (this.isSupplierRole(roleName)) {
      return this.hasSupplierAccess(record, userId, supplierIds);
    }

    return [
      record.encoder_id,
      record.issuer_id,
      record.checker_id,
      record.approver_id,
      latestResponse?.checker_id,
      latestResponse?.approver_id,
    ].includes(userId);
  }

  private async getRoleName(roleId?: string): Promise<string> {
      if (!roleId) return 'UNKNOWN';
      const roleObj = await userRepository.findRoleById(roleId);
      return roleObj?.role_name || 'UNKNOWN';
  }

  /**
   * Internal Helper: Enforce RBAC/ABAC Context Guards
   */
  private canUpdateRecord(record: any, latestResponse: any, roleName: string, userId: string): boolean {
    if (!userId) {
      return false;
    }

    if (this.isGlobalRole(roleName)) {
      return true;
    }

    if (this.isSupplierRole(roleName)) {
      return false;
    }

    const metadata = this.buildWorkflowMetadata(record, latestResponse, userId, roleName);
    return (
      SQMP_EDITABLE_STAGE_CODES.has(metadata.workflowStageCode) &&
      (record.encoder_id === userId || record.issuer_id === userId)
    );
  }

  private canDeleteRecord(record: any, latestResponse: any, roleName: string, userId: string): boolean {
    if (!userId) {
      return false;
    }

    if (this.isGlobalRole(roleName)) {
      return true;
    }

    if (this.isSupplierRole(roleName)) {
      return false;
    }

    const metadata = this.buildWorkflowMetadata(record, latestResponse, userId, roleName);
    return (
      metadata.workflowStageCode === SQMP_STAGE_CODE.DRAFT &&
      (record.encoder_id === userId || record.issuer_id === userId)
    );
  }

  private async validateAccess(record: any, latestResponse: any, roleName: string, userId: string): Promise<void> {
    const isSupplier = roleName.toUpperCase().includes('SUPPLIER');
    if (this.isGlobalRole(roleName)) return;

    if (isSupplier) {
      throw new ForbiddenError('Suppliers are not permitted to edit SQM Plan issuance content.');
    }

    const metadata = this.buildWorkflowMetadata(record, latestResponse, userId, roleName);

    if (!Array.isArray(metadata.availableActions) || metadata.availableActions.length === 0) {
      throw new ForbiddenError('Access Denied: You do not have permission to access or modify this record.');
    }
  }

  private parseDate(d?: Date | string | null): Date | null {
      if (!d || d === '') return null;
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

  private sanitizeUuid(val?: string | null): string | null {
      if (!val || val.trim() === '') return null;
      return val;
  }

  async previewControlNo(query: {
    fiscalYear: number;
    siteId?: string;
    siteCode?: string;
    semester: string | number;
    series?: number;
    revision?: number;
  }) {
    const controlNo = await controlNumberService.previewSqmp({
      fiscalYear: query.fiscalYear,
      siteId: query.siteId,
      siteCode: query.siteCode,
      semester: query.semester,
      series: query.series,
      revision: query.revision,
    });

    return {
      controlNo,
      controlNoState: controlNumberService.getControlNoState(controlNo),
    };
  }

  private async resolveAttentionId(
    trx: any,
    attentionId?: string | null,
  ): Promise<string> {
    const normalizedAttentionId = attentionId?.trim() || '';
    if (!normalizedAttentionId) return '';

    const supplierUser = await trx.selectFrom('SUPPLIERSUSER')
      .select('user_id')
      .where('Id', '=', normalizedAttentionId)
      .executeTakeFirst();

    return supplierUser?.user_id || normalizedAttentionId;
  }

  async getAllRecords(status?: string, userId?: string, roleId?: string, scope: WorkflowListScope = 'history') {
    const roleName = await this.getRoleName(roleId);
    const userObj = userId ? await userRepository.findById(userId) : null;
    const supplierIds = userId && roleName.toUpperCase().includes('SUPPLIER')
      ? await sqmpRepository.findSupplierIdsByUserId(userId)
      : [];
    const roleViewListForms = await this.resolveRoleViewListFormCodes(userId);
    const records = await sqmpRepository.findAllDetailed(status, userId, roleName);
    const latestResponses = records.length > 0
      ? await sqmpRepository.findLatestResponsesBySqmpIds(records.map((record: any) => record.sqmp_id))
      : [];
    const latestResponseBySqmpId = new Map(
      latestResponses.map((response: any) => [response.sqmp_id, response]),
    );

    const visibleRecords = this.isGlobalRole(roleName)
      ? records
      : filterWorkflowRecordsByScope(records, scope, {
          isAssigned: (record) => {
            const latestResponse = latestResponseBySqmpId.get((record as any).sqmp_id);
            const metadata = this.buildWorkflowMetadata(
              record,
              latestResponse,
              userId,
              roleName,
              supplierIds,
              userObj?.site_id || null,
            );
            return Array.isArray(metadata.availableActions) && metadata.availableActions.length > 0;
          },
          isMine: (record) =>
            this.isMineRecord(record, latestResponseBySqmpId.get((record as any).sqmp_id), userId, roleName, supplierIds),
          isHistoryVisible: (record) =>
            this.canReadRecord(
              record,
              latestResponseBySqmpId.get((record as any).sqmp_id),
              userId,
              roleName,
              supplierIds,
              roleViewListForms,
              userObj?.site_id || null,
            ),
        });

    return visibleRecords.map((r: any) => {
      const latestResponse = latestResponseBySqmpId.get(r.sqmp_id);
      const metadata = this.buildWorkflowMetadata(
        r,
        latestResponse,
        userId,
        roleName,
        supplierIds,
        userObj?.site_id || null,
      );

      return {
        ...r,
        ...metadata,
        status: metadata.status,
        semester: this.fromDBSemester(r.semester),
        created_at: r.registration_date,
      };
    });
  }

  async getRecordById(id: string, userId?: string, roleId?: string) {
    const roleName = await this.getRoleName(roleId);
    const userObj = userId ? await userRepository.findById(userId) : null;
    const supplierIds = userId && roleName.toUpperCase().includes('SUPPLIER')
      ? await sqmpRepository.findSupplierIdsByUserId(userId)
      : [];
    const roleViewListForms = await this.resolveRoleViewListFormCodes(userId);
    const data = await sqmpRepository.findByIdDetailed(id, userId, roleName);
    if (!data) throw new NotFoundError('SQMP Record not found');

    const { record, mainDocuments, appendixDocuments, ccList, responses, statusRemarks } = data;
    const latestResponse = responses?.[responses.length - 1];
    assertWorkflowRecordAccess({
      allowed: this.canReadRecord(
        record,
        latestResponse,
        userId,
        roleName,
        supplierIds,
        roleViewListForms,
        userObj?.site_id || null,
      ),
      action: 'view',
      moduleName: 'SQM Plan',
    });
    const metadata = this.buildWorkflowMetadata(
      record,
      latestResponse,
      userId,
      roleName,
      supplierIds,
      userObj?.site_id || null,
    );

    return {
      ...record,
      ...metadata,
      status: metadata.status,
      semester: this.fromDBSemester(record.semester),
      documents: mainDocuments || [],
      appendixes: appendixDocuments || [],
      cc_list: ccList || [],
      responses: responses || [],
      status_remarks: statusRemarks || []
    };
  }

  async createRecord(payload: SQMPCreationInput, userId: string, files: any[] = []) {
    const sqmpId = uuidv4();
    const now = new Date();

    return await sqmpRepository.executeTransaction(async (trx) => {
      const controlNo = await controlNumberService.previewSqmp({
        fiscalYear: payload.fiscal_year,
        siteId: payload.site_id,
        semester: payload.semester,
        series: (payload as any).control_series,
        revision: payload.revision,
      }, trx);
      const resolvedAttentionId = await this.resolveAttentionId(trx, payload.attention_id);

      const dbPayload = {
        sqmp_id: sqmpId,
        control_no: controlNo,
        registration_date: this.parseDate(payload.registration_date) || now,
        site_id: payload.site_id,
        supplier_id: payload.supplier_id || '',
        attention_id: resolvedAttentionId,
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
        checker_id: payload.checker_id || null,
        approver_id: payload.approver_id || null,
        request_status: SQMP_STAGE_CODE.DRAFT,
        last_update: now,
        updateby: userId
      };

      await trx.insertInto('SQMP').values(dbPayload).execute();

      if (payload.main_documents?.length) {
        for (const doc of payload.main_documents) {
          const uploadedFile = files.find(f => f.originalname.trim().toLowerCase() === doc.file_name.trim().toLowerCase());
          const diskFileName = uploadedFile ? uploadedFile.filename : doc.file_name;
          const finalRemarks = sanitizeAttachmentRemarks(doc.remarks, uploadedFile?.originalname);

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

      if (payload.appendix_documents?.length) {
        for (const app of payload.appendix_documents) {
          const uploadedFile = files.find(f => f.originalname.trim().toLowerCase() === app.file_name.trim().toLowerCase());
          const diskFileName = uploadedFile ? uploadedFile.filename : app.file_name;
          const finalRemarks = sanitizeAttachmentRemarks(app.remarks, uploadedFile?.originalname);

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

      if (payload.cc_list?.length) {
        for (const cc of payload.cc_list) {
          await trx.insertInto('SQMP_CC').values({
            sqmp_cc_id: uuidv4(),
            sqmp_id: sqmpId,
            user_id: cc.user_id,
            last_update: now,
            updateby: userId
          }).execute();
        }
      }

      return {
        success: true,
        data: {
          id: sqmpId,
          recordId: sqmpId,
          controlNo,
          controlNoState: controlNumberService.getControlNoState(controlNo),
        },
        message: 'SQM Plan created successfully',
      };
    });
  }

  async updateRecord(id: string, payload: SQMPUpdateInput, userId: string, roleId: string, files: any[] = []) {
    const roleName = await this.getRoleName(roleId);
    const existing = await sqmpRepository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('Record not found');

    const latestResponse = existing.responses?.[existing.responses.length - 1] || null;
    assertWorkflowRecordAccess({
      allowed: this.canUpdateRecord(existing.record, latestResponse, roleName, userId),
      action: 'update',
      moduleName: 'SQM Plan',
    });

    const record = existing.record;
    const now = new Date();
    const dbUpdates: any = {
      last_update: now,
      updateby: userId
    };

    if (payload.registration_date) dbUpdates.registration_date = this.parseDate(payload.registration_date);
    if (payload.site_id) dbUpdates.site_id = payload.site_id;
    if (payload.supplier_id !== undefined) dbUpdates.supplier_id = this.sanitizeUuid(payload.supplier_id);
    if (payload.fiscal_year) dbUpdates.fiscal_year = payload.fiscal_year;
    if (payload.semester) dbUpdates.semester = this.toDBSemester(payload.semester);
    if (payload.issued_date !== undefined) dbUpdates.issued_date = this.parseDate(payload.issued_date);
    if (payload.due_date) dbUpdates.due_date = this.parseDate(payload.due_date);
    if (payload.model_id !== undefined) dbUpdates.model_id = this.sanitizeUuid(payload.model_id);
    if (payload.revision !== undefined) dbUpdates.revision = payload.revision;
    
    if (payload.remarks !== undefined) dbUpdates.remarks = payload.remarks;
    if (payload.main_document_remarks !== undefined) dbUpdates.main_document_remarks = payload.main_document_remarks;
    if (payload.appendix_sheet_remarks !== undefined) dbUpdates.appendix_sheet_remarks = payload.appendix_sheet_remarks;
    
    if (payload.issuer_id !== undefined) dbUpdates.issuer_id = this.sanitizeUuid(payload.issuer_id);
    if (payload.issuer_remarks !== undefined) dbUpdates.issuer_remarks = payload.issuer_remarks;
    if (payload.issuer_date !== undefined) dbUpdates.issuer_date = this.parseDate(payload.issuer_date);
    
    if (payload.checker_id !== undefined) dbUpdates.checker_id = this.sanitizeUuid(payload.checker_id);
    if (payload.checker_remarks !== undefined) dbUpdates.checker_remarks = payload.checker_remarks;
    if (payload.checker_date !== undefined) dbUpdates.checker_date = this.parseDate(payload.checker_date);
    
    if (payload.approver_id !== undefined) dbUpdates.approver_id = this.sanitizeUuid(payload.approver_id);
    if (payload.approver_remarks !== undefined) dbUpdates.approver_remarks = payload.approver_remarks;
    if (payload.approver_date !== undefined) dbUpdates.approver_date = this.parseDate(payload.approver_date);

    return await sqmpRepository.executeTransaction(async (trx) => {
      const recordId = record.sqmp_id;
      if (payload.attention_id !== undefined) {
        dbUpdates.attention_id = await this.resolveAttentionId(trx, payload.attention_id);
      }

      if (
        payload.site_id !== undefined ||
        payload.fiscal_year !== undefined ||
        payload.semester !== undefined ||
        payload.revision !== undefined ||
        (payload as any).control_series !== undefined
      ) {
        dbUpdates.control_no = await controlNumberService.previewSqmp({
          fiscalYear: payload.fiscal_year ?? record.fiscal_year,
          siteId: payload.site_id ?? record.site_id,
          semester: payload.semester ?? record.semester,
          series: (payload as any).control_series,
          revision: payload.revision ?? record.revision,
        }, trx);
      }

      if (Object.keys(dbUpdates).length > 2) {
        await trx.updateTable('SQMP').set(dbUpdates).where('sqmp_id', '=', recordId).execute();
      }

      if (payload.main_documents !== undefined) {
        await trx.deleteFrom('SQMP_DOCUMENT').where('sqmp_id', '=', recordId).execute();
        for (const doc of payload.main_documents) {
          const uploadedFile = files.find(f => f.originalname.trim().toLowerCase() === doc.file_name.trim().toLowerCase());
          const diskFileName = uploadedFile ? uploadedFile.filename : doc.file_name;
          const finalRemarks = sanitizeAttachmentRemarks(doc.remarks, uploadedFile?.originalname);

          await trx.insertInto('SQMP_DOCUMENT').values({
            sqmp_document_id: doc.sqmp_attachment_id || uuidv4(),
            sqmp_id: recordId,
            file_name: diskFileName || 'Unknown',
            file_extension: diskFileName ? diskFileName.split('.').pop()! : (doc.file_extension || 'dat'),
            remarks: finalRemarks,
            last_update: now,
            updateby: userId
          }).execute();
        }
      }

      if (payload.appendix_documents !== undefined) {
        await trx.deleteFrom('SQMP_APPENDIX').where('sqmp_id', '=', recordId).execute();
        for (const app of payload.appendix_documents) {
          const uploadedFile = files.find(f => f.originalname.trim().toLowerCase() === app.file_name.trim().toLowerCase());
          const diskFileName = uploadedFile ? uploadedFile.filename : app.file_name;
          const finalRemarks = sanitizeAttachmentRemarks(app.remarks, uploadedFile?.originalname);

          await trx.insertInto('SQMP_APPENDIX').values({
            sqmp_appendix_id: app.sqmp_attachment_id || uuidv4(),
            sqmp_id: recordId,
            file_name: diskFileName || 'Unknown',
            file_extension: diskFileName ? diskFileName.split('.').pop()! : (app.file_extension || 'dat'),
            remarks: finalRemarks,
            last_update: now,
            updateby: userId
          }).execute();
        }
      }

      if (payload.cc_list !== undefined) {
        await trx.deleteFrom('SQMP_CC').where('sqmp_id', '=', recordId).execute();
        for (const cc of payload.cc_list) {
          await trx.insertInto('SQMP_CC').values({
            sqmp_cc_id: cc.sqmp_cc_id || uuidv4(),
            sqmp_id: recordId,
            user_id: cc.user_id,
            last_update: now,
            updateby: userId
          }).execute();
        }
      }

      return {
        success: true,
        data: {
          id: recordId,
          recordId,
          controlNo: dbUpdates.control_no || record.control_no,
          controlNoState: controlNumberService.getControlNoState(dbUpdates.control_no || record.control_no),
        },
        message: 'SQM Plan updated successfully',
      };
    });
  }

  async deleteRecord(id: string, userId: string, roleId: string) {
    const roleName = await this.getRoleName(roleId);
    const existing = await sqmpRepository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('Record not found');

    const latestResponse = existing.responses?.[existing.responses.length - 1] || null;
    assertWorkflowRecordAccess({
      allowed: this.canDeleteRecord(existing.record, latestResponse, roleName, userId),
      action: 'delete',
      moduleName: 'SQM Plan',
    });

    return await sqmpRepository.executeTransaction(async (trx) => {
        await trx.deleteFrom('SQMP_CC').where('sqmp_id', '=', existing.record.sqmp_id).execute();
        await trx.deleteFrom('SQMP_DOCUMENT').where('sqmp_id', '=', existing.record.sqmp_id).execute();
        await trx.deleteFrom('SQMP_APPENDIX').where('sqmp_id', '=', existing.record.sqmp_id).execute();
        await trx.deleteFrom('SQMP').where('sqmp_id', '=', existing.record.sqmp_id).execute();
        return { success: true, message: 'Record deleted successfully' };
    });
  }

  async issueRecord(id: string, userId: string, roleId: string, remarks?: string) {
    const roleName = await this.getRoleName(roleId);
    const existing = await sqmpRepository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('Record not found');

    await this.validateAccess(existing.record, existing.responses?.[existing.responses.length - 1] || null, roleName, userId);

    const now = new Date();
    return await sqmpRepository.executeTransaction(async (trx) => {
      await trx.updateTable('SQMP')
        .set({
          request_status: SQMP_STAGE_CODE.SUPPLIER,
          issuer_id: userId,
          issuer_remarks: remarks || null,
          last_update: now,
          updateby: userId
        })
        .where('sqmp_id', '=', existing.record.sqmp_id)
        .execute();

      if (remarks) {
         await trx.insertInto('SQMP_STATUS_REMARKS').values({
            sqmp_status_remarks_id: uuidv4(),
            sqmp_id: existing.record.sqmp_id,
            remarks: remarks,
            request_status: SQMP_STAGE_CODE.SUPPLIER,
            remarks_by_id: userId,
            remarks_date: now
         }).execute();
      }

      return { success: true, data: { id }, message: 'SQM Plan issued successfully' };
    });
  }

  async requestResponse(id: string, userId: string, roleId: string, remarks?: string) {
    const roleName = await this.getRoleName(roleId);
    const existing = await sqmpRepository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('Record not found');

    await this.validateAccess(existing.record, existing.responses?.[existing.responses.length - 1] || null, roleName, userId);

    const now = new Date();
    return await sqmpRepository.executeTransaction(async (trx) => {
      await trx.updateTable('SQMP')
        .set({
          request_status: SQMP_STAGE_CODE.SUPPLIER,
          issuer_remarks: remarks || existing.record.issuer_remarks,
          last_update: now,
          updateby: userId
        })
        .where('sqmp_id', '=', existing.record.sqmp_id)
        .execute();

      if (remarks) {
         await trx.insertInto('SQMP_STATUS_REMARKS').values({
            sqmp_status_remarks_id: uuidv4(),
            sqmp_id: existing.record.sqmp_id,
            remarks: remarks,
            request_status: SQMP_STAGE_CODE.SUPPLIER,
            remarks_by_id: userId,
            remarks_date: now
         }).execute();
      }

      return { success: true, data: { id }, message: 'Response requested from supplier' };
    });
  }

  async cancelRecord(id: string, userId: string, roleId: string, remarks?: string) {
    const roleName = await this.getRoleName(roleId);
    const existing = await sqmpRepository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('Record not found');

    await this.validateAccess(existing.record, existing.responses?.[existing.responses.length - 1] || null, roleName, userId);

    const now = new Date();
    return await sqmpRepository.executeTransaction(async (trx) => {
      await trx.updateTable('SQMP')
        .set({
          request_status: SQMP_STAGE_CODE.CANCELLED,
          issuer_remarks: remarks || existing.record.issuer_remarks,
          last_update: now,
          updateby: userId
        })
        .where('sqmp_id', '=', existing.record.sqmp_id)
        .execute();

      if (remarks) {
        await trx.insertInto('SQMP_STATUS_REMARKS').values({
          sqmp_status_remarks_id: uuidv4(),
          sqmp_id: existing.record.sqmp_id,
          remarks: remarks,
          request_status: SQMP_STAGE_CODE.CANCELLED,
          remarks_by_id: userId,
          remarks_date: now
        }).execute();
      }

      return { success: true, data: { id }, message: 'SQM Plan cancelled successfully' };
    });
  }

  async closeRecord(id: string, userId: string, roleId: string, remarks?: string) {
    const roleName = await this.getRoleName(roleId);
    const existing = await sqmpRepository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('Record not found');

    await this.validateAccess(existing.record, existing.responses?.[existing.responses.length - 1] || null, roleName, userId);

    const now = new Date();
    return await sqmpRepository.executeTransaction(async (trx) => {
      await trx.updateTable('SQMP')
        .set({
          request_status: SQMP_STAGE_CODE.CLOSED,
          last_update: now,
          updateby: userId
        })
        .where('sqmp_id', '=', existing.record.sqmp_id)
        .execute();

      if (remarks) {
        await trx.insertInto('SQMP_STATUS_REMARKS').values({
          sqmp_status_remarks_id: uuidv4(),
          sqmp_id: existing.record.sqmp_id,
          remarks,
          request_status: SQMP_STAGE_CODE.CLOSED,
          remarks_by_id: userId,
          remarks_date: now,
        }).execute();
      }

      return { success: true, data: { id }, message: 'Record closed successfully' };
    });
  }

  async downloadMainAttachment(attachmentId: string, userId?: string, roleId?: string) {
    const owner = await sqmpRepository.findMainAttachmentOwner(attachmentId);
    if (!owner) {
      throw new NotFoundError('Attachment not found');
    }

    const roleName = await this.getRoleName(roleId);
    const userObj = userId ? await userRepository.findById(userId) : null;
    const supplierIds = userId && this.isSupplierRole(roleName)
      ? await sqmpRepository.findSupplierIdsByUserId(userId)
      : [];
    const roleViewListForms = await this.resolveRoleViewListFormCodes(userId);
    const data = await sqmpRepository.findByIdDetailed(owner.sqmp_id);
    if (!data) {
      throw new NotFoundError('SQM Plan not found');
    }

    const latestResponse = data.responses?.[data.responses.length - 1];
    assertWorkflowRecordAccess({
      allowed: this.canReadRecord(
        data.record,
        latestResponse,
        userId,
        roleName,
        supplierIds,
        roleViewListForms,
        userObj?.site_id || null,
      ),
      action: 'view',
      moduleName: 'SQM Plan',
    });

    return attachmentService.downloadAttachment(owner.moduleType, attachmentId);
  }

  async downloadResponseAttachment(attachmentId: string, userId?: string, roleId?: string) {
    const owner = await sqmpRepository.findResponseAttachmentOwner(attachmentId);
    if (!owner) {
      throw new NotFoundError('Attachment not found');
    }

    const roleName = await this.getRoleName(roleId);
    const userObj = userId ? await userRepository.findById(userId) : null;
    const supplierIds = userId && this.isSupplierRole(roleName)
      ? await sqmpRepository.findSupplierIdsByUserId(userId)
      : [];
    const roleViewListForms = await this.resolveRoleViewListFormCodes(userId);
    const data = await sqmpRepository.findByIdDetailed(owner.sqmp_id);
    if (!data) {
      throw new NotFoundError('SQM Plan not found');
    }

    const latestResponse = data.responses?.[data.responses.length - 1];
    assertWorkflowRecordAccess({
      allowed: this.canReadRecord(
        data.record,
        latestResponse,
        userId,
        roleName,
        supplierIds,
        roleViewListForms,
        userObj?.site_id || null,
      ),
      action: 'view',
      moduleName: 'SQM Plan',
    });

    return attachmentService.downloadAttachment(owner.moduleType, attachmentId);
  }
}

export const mainSqmpService = new MainSqmpService();
