/**
 * NPI CRUD Service
 * Handles basic CRUD operations for NPI records
 * Type-safe implementation with no 'any' types
 */

import { v4 as uuidv4 } from 'uuid';
import type { Transaction } from 'kysely';
import type { Database } from '../../../shared/infrastructure/db.types.js';
import { NpiRepository } from '../npi.repository.js';
import { NpiMapper } from './NpiMapper.js';
import { NPICreationInput, NPIUpdateInput } from '../npi.schema.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';
import { INpiService } from './INpiService.js';
import { 
  NpiListDTO, 
  NpiDetailDTO, 
  ServiceResponse, 
  CreateRecordResponse,
  CreatePayloadContext,
  NpiAttachmentInput,
  NpiVisualCategoryInput,
  NpiDataCategoryInput,
  NpiDimensionCategoryInput,
  NpiMaterialCertificateInput,
  NpiNoiseCategoryInput,
  NpiCcInput,
  NpiWorkflowActorContext,
  UploadedFile
} from '../types/npi.types.js';
import { NewNpiLot, NpiLotUpdate } from '../npi.db.types.js';
import { getNpiDbStatus } from '../workflow/npi-workflow.utils.js';
import { NPI_WORKFLOW_STAGE } from '../workflow/npi-workflow.constants.js';

export class NpiCrudService implements INpiService {
  constructor(
    private repository: NpiRepository,
    private mapper: NpiMapper
  ) {}

  private getActorId(
    payload: NPICreationInput | NPIUpdateInput,
    camelKey: 'inspectorId' | 'checkerId' | 'approverId',
    snakeKey: 'inspector_id' | 'checker_id' | 'approver_id',
  ) {
    return (payload[camelKey] || payload[snakeKey] || null) as string | null;
  }

  private getRemarks(
    payload: NPICreationInput | NPIUpdateInput,
    camelKey: 'inspectorRemarks' | 'checkerRemarks' | 'approverRemarks',
    snakeKey: 'inspector_remarks' | 'checker_remarks' | 'approver_remarks',
  ) {
    return (payload[camelKey] ?? payload[snakeKey] ?? null) as string | null;
  }

  private computeCorrectedLotVerificationForCreate(payload: NPICreationInput): number {
    if (payload.referenceMnrNo && payload.incrementCorrectedLotVerification) {
      return 1;
    }

    return 0;
  }

  private computeCorrectedLotVerificationForUpdate(
    payload: NPIUpdateInput,
    existingValue: number,
  ): number | undefined {
    if (payload.referenceMnrNo !== undefined && !payload.referenceMnrNo) {
      return 0;
    }

    if (payload.incrementCorrectedLotVerification && payload.referenceMnrNo) {
      return Math.min(existingValue + 1, 10);
    }

    if (payload.correctedLotVerification !== undefined) {
      return payload.correctedLotVerification;
    }

    return undefined;
  }

  /**
   * Get all NPI records with related data
   */
  async getAllRecords(
    actor?: NpiWorkflowActorContext,
    filters?: {
      status?: string;
      siteId?: string;
      supplierId?: string;
      keyword?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<NpiListDTO[]> {
    const records = await this.repository.findAllDetailed(filters);
    return this.mapper.toListDTOs(records, actor);
  }

  /**
   * Get single NPI record by ID with all related data
   */
  async getRecordById(id: string, actor?: NpiWorkflowActorContext): Promise<NpiDetailDTO> {
    const data = await this.repository.findByIdDetailed(id);
    if (!data) {
      throw new NotFoundError('NPI Record not found');
    }
    return this.mapper.toDetailDTO(data, actor);
  }

  /**
   * Create new NPI record with related data
   */
  async createRecord(
    payload: NPICreationInput, 
    userId: string, 
    files: UploadedFile[] = []
  ): Promise<ServiceResponse<CreateRecordResponse>> {
    const npiId = uuidv4();
    const now = new Date();
    const defaultUserId = '6a15b66a-079b-433b-b70f-dc15dce25631'; // System Fallback
    const effectiveUserId = userId && userId !== 'current_user' ? userId : defaultUserId;
    
    console.log('[NPI createRecord] User IDs:', {
      userId,
      effectiveUserId,
      payloadInspectorId: payload.inspectorId || (payload as any).inspector_id,
    });
    
    const defaultInspector = await this.repository.findDefaultInspector();
    
    // Generate control number if not provided
    let controlNo = payload.controlNo;
    if (!controlNo && payload.siteId) {
      controlNo = await this.generateSequence(payload.siteId);
    } else if (!controlNo) {
      controlNo = `NPI-DRAFT-${Date.now()}`;
    }

    const dbPayload = this.buildCreatePayload(payload, {
      npiId,
      controlNo,
      now,
      effectiveUserId,
      defaultInspector
    });

    return await this.repository.executeTransaction(async (trx) => {
      // 1. Insert Main Record
      await trx.insertInto('NPI_LOTS').values(dbPayload).execute();

      // 2. Insert Related Data
      await this.insertAttachments(trx, npiId, payload.attachments, files, effectiveUserId, now);
      await this.insertVisualCategories(trx, npiId, payload.visual_categories, effectiveUserId, now);
      await this.insertDataCategories(trx, npiId, payload.data_categories, effectiveUserId, now);
      await this.insertDimensionCategories(trx, npiId, payload.dimension_categories, effectiveUserId, now);
      await this.insertNoiseCategories(trx, npiId, payload.noise_categories, effectiveUserId, now);
      await this.insertMaterialCertificates(trx, npiId, payload.material_certificates, effectiveUserId, now);
      await this.insertCCList(trx, npiId, payload.cc_list, effectiveUserId, now);

      return { 
        success: true, 
        data: { id: npiId }, 
        message: 'Record created successfully' 
      };
    });
  }

  /**
   * Update existing NPI record
   */
  async updateRecord(
    id: string, 
    payload: NPIUpdateInput, 
    userId: string, 
    files: UploadedFile[] = []
  ): Promise<ServiceResponse<{ id: string }>> {
    const existing = await this.repository.findByIdDetailed(id);
    if (!existing) {
      throw new NotFoundError('Record not found');
    }
    
    const now = new Date();
    const effectiveUserId = userId || 'SYSTEM';
    const npiLotId = existing.record.npi_lot_id;

    const dbUpdates = this.buildUpdatePayload(
      payload,
      effectiveUserId,
      now,
      existing.record.corrected_lot_verification ?? 0,
    );

    return await this.repository.executeTransaction(async (trx) => {
      // 1. Update Base Record
      if (Object.keys(dbUpdates).length > 2) { // More than just last_update and updateby
        await trx.updateTable('NPI_LOTS')
          .set(dbUpdates)
          .where('npi_lot_id', '=', npiLotId)
          .execute();
      }

      // 2. Update Related Data (delete and re-insert pattern)
      if (payload.attachments !== undefined) {
        await trx.deleteFrom('NPI_ATTACHMENT').where('npi_lot_id', '=', npiLotId).execute();
        await this.insertAttachments(trx, npiLotId, payload.attachments, files, effectiveUserId, now);
      }

      if (payload.visual_categories !== undefined) {
        await trx.deleteFrom('NPI_VISUALCAT').where('npi_lot_id', '=', npiLotId).execute();
        await this.insertVisualCategories(trx, npiLotId, payload.visual_categories, effectiveUserId, now);
      }

      if (payload.data_categories !== undefined) {
        await trx.deleteFrom('NPI_DATACAT').where('npi_lot_id', '=', npiLotId).execute();
        await this.insertDataCategories(trx, npiLotId, payload.data_categories, effectiveUserId, now);
      }

      if (payload.dimension_categories !== undefined) {
        await trx.deleteFrom('NPI_DIMENSIONCAT').where('npi_lot_id', '=', npiLotId).execute();
        await this.insertDimensionCategories(trx, npiLotId, payload.dimension_categories, effectiveUserId, now);
      }

      if (payload.noise_categories !== undefined) {
        await trx.deleteFrom('NPI_NOISECAT').where('npi_lot_id', '=', npiLotId).execute();
        await this.insertNoiseCategories(trx, npiLotId, payload.noise_categories, effectiveUserId, now);
      }

      if (payload.material_certificates !== undefined) {
        await trx.deleteFrom('NPI_MATERIALCERT').where('npi_lot_id', '=', npiLotId).execute();
        await this.insertMaterialCertificates(trx, npiLotId, payload.material_certificates, effectiveUserId, now);
      }

      if (payload.cc_list !== undefined) {
        await trx.deleteFrom('NPI_CC').where('npi_lot_id', '=', npiLotId).execute();
        await this.insertCCList(trx, npiLotId, payload.cc_list, effectiveUserId, now);
      }

      return { 
        success: true, 
        data: { id }, 
        message: 'Record updated successfully' 
      };
    });
  }

  /**
   * Delete NPI record and all related data
   */
  async deleteRecord(id: string): Promise<ServiceResponse<{ id: string }>> {
    const existing = await this.repository.findByIdDetailed(id);
    if (!existing) {
      throw new NotFoundError('NPI Record not found');
    }

    const npiLotId = existing.record.npi_lot_id;

    return await this.repository.executeTransaction(async (trx) => {
      // Delete in reverse order of foreign key dependencies
      await trx.deleteFrom('NPI_ATTACHMENT').where('npi_lot_id', '=', npiLotId).execute();
      await trx.deleteFrom('NPI_VISUALCAT').where('npi_lot_id', '=', npiLotId).execute();
      await trx.deleteFrom('NPI_DATACAT').where('npi_lot_id', '=', npiLotId).execute();
      await trx.deleteFrom('NPI_DIMENSIONCAT').where('npi_lot_id', '=', npiLotId).execute();
      await trx.deleteFrom('NPI_NOISECAT').where('npi_lot_id', '=', npiLotId).execute();
      await trx.deleteFrom('NPI_MATERIALCERT').where('npi_lot_id', '=', npiLotId).execute();
      await trx.deleteFrom('NPI_CC').where('npi_lot_id', '=', npiLotId).execute();
      await trx.deleteFrom('NPI_LOTS').where('npi_lot_id', '=', npiLotId).execute();
      
      return { 
        success: true, 
        data: { id }, 
        message: 'NPI Record deleted successfully' 
      };
    });
  }

  /**
   * Generate sequence number for control_no
   */
  async generateSequence(siteId: string): Promise<string> {
    const d = new Date();
    const year = d.getFullYear().toString().slice(-2);
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `NPI-${siteId}-${year}-${month}-`;

    const lastSeq = await this.repository.getNextSequence(prefix);
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

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Build payload for creating new record
   */
  private buildCreatePayload(payload: NPICreationInput, context: CreatePayloadContext): NewNpiLot {
    const { npiId, controlNo, now, effectiveUserId, defaultInspector } = context;
    const inspectorId = this.getActorId(payload, 'inspectorId', 'inspector_id');
    const checkerId = this.getActorId(payload, 'checkerId', 'checker_id');
    const approverId = this.getActorId(payload, 'approverId', 'approver_id');

    // IMPORTANT: If inspector_id is not explicitly provided, use the current user (effectiveUserId)
    // This ensures the creator becomes the inspector/originator
    const finalInspectorId = inspectorId || effectiveUserId;
    
    console.log('[NPI buildCreatePayload] Inspector ID resolution:', {
      payloadInspectorId: inspectorId,
      effectiveUserId,
      finalInspectorId,
    });

    const correctedLotVerification = this.computeCorrectedLotVerificationForCreate(payload);

    return {
      npi_lot_id: npiId,
      control_no: controlNo,
      datecreated: now,
      site_id: (payload.siteId || '') as string,
      supplier_id: (payload.supplierId || '') as string,
      part_id: (payload.partId || '') as string,
      model_id: (payload.model || '') as string,
      lot_no: payload.lotNo || '',
      lot_size: payload.lotSize || 0,
      invoice_no: payload.invoiceNo || '',
      po_no: payload.poNo || '',
      inspectionmethod_id: payload.inspectionMethod || '',
      inspection_temp: payload.inspectionTemp || 0,
      inspection_hum: payload.inspectionHum || 0,
      starttime: payload.startTime || 0,
      endtime: payload.endTime || 0,
      severity_id: payload.severity || '',
      severity_seq: payload.severity_seq || null,
      sample_size: payload.sampleSize || 0,
      disposition_id: payload.disposition || '',
      inspection_date: this.mapper.parseDate(payload.inspectionDate) ?? now,
      delivery_date: this.mapper.parseDate(payload.deliveryDate) ?? now,
      inspected_by_id: defaultInspector || effectiveUserId,
      inspectioncat_id: payload.inspectionCategory || '',
      receivetime: payload.receivedTime || 0,
      endorsetime: payload.endorseTime || 0,
      data_verified_by_id: payload.dataVerifiedBy || '',
      inspector_id: finalInspectorId,
      checker_id: checkerId,
      approver_id: approverId,
      total_minor: payload.total_minor || 0,
      total_major: payload.total_major || 0,
      total_critical: payload.total_critical || 0,
      ssi_accept: payload.ssiAccept ?? 1, // Legacy default
      judgment: payload.judgment || null,
      request_status: getNpiDbStatus(NPI_WORKFLOW_STAGE.DRAFT),
      last_update: now,
      updateby: effectiveUserId,
      rohs_verification: payload.rohsVerification || null,
      reference_mnr_no: payload.referenceMnrNo || null,
      corrected_lot_verification: correctedLotVerification,
      inspector_remarks: this.getRemarks(payload, 'inspectorRemarks', 'inspector_remarks'),
      // Additional required fields with defaults
      remarks: payload.remarks || null,
      submitted_date: null,
      checker_remarks: this.getRemarks(payload, 'checkerRemarks', 'checker_remarks'),
      checked_date: null,
      approver_remarks: this.getRemarks(payload, 'approverRemarks', 'approver_remarks'),
      approved_date: null,
      ogi_ref_no: payload.ogiRefNo || null,
      visual_judgment: null
    };
  }

  /**
   * Build payload for updating record
   */
  private buildUpdatePayload(
    payload: NPIUpdateInput,
    userId: string,
    now: Date,
    existingCorrectedLotVerification: number,
  ): NpiLotUpdate {
    const dbUpdates: NpiLotUpdate = {
      last_update: now,
      updateby: userId
    };
    const inspectorId = this.getActorId(payload, 'inspectorId', 'inspector_id');
    const checkerId = this.getActorId(payload, 'checkerId', 'checker_id');
    const approverId = this.getActorId(payload, 'approverId', 'approver_id');

    // Map all possible update fields
    if (payload.siteId) dbUpdates.site_id = payload.siteId;
    if (payload.supplierId) dbUpdates.supplier_id = payload.supplierId;
    if (payload.partId) dbUpdates.part_id = payload.partId;
    if (payload.model) dbUpdates.model_id = payload.model;
    if (payload.lotNo !== undefined) dbUpdates.lot_no = payload.lotNo;
    if (payload.lotSize !== undefined) dbUpdates.lot_size = payload.lotSize;
    if (payload.invoiceNo !== undefined) dbUpdates.invoice_no = payload.invoiceNo;
    if (payload.poNo !== undefined) dbUpdates.po_no = payload.poNo;
    if (payload.inspectionMethod) dbUpdates.inspectionmethod_id = payload.inspectionMethod;
    if (payload.inspectionTemp !== undefined) dbUpdates.inspection_temp = payload.inspectionTemp;
    if (payload.inspectionHum !== undefined) dbUpdates.inspection_hum = payload.inspectionHum;
    if (payload.startTime !== undefined) dbUpdates.starttime = payload.startTime;
    if (payload.endTime !== undefined) dbUpdates.endtime = payload.endTime;
    if (payload.receivedTime !== undefined) dbUpdates.receivetime = payload.receivedTime;
    if (payload.endorseTime !== undefined) dbUpdates.endorsetime = payload.endorseTime;
    if (payload.severity) dbUpdates.severity_id = payload.severity;
    if (payload.severity_seq !== undefined) dbUpdates.severity_seq = payload.severity_seq;
    if (payload.sampleSize !== undefined) dbUpdates.sample_size = payload.sampleSize;
    if (payload.disposition) dbUpdates.disposition_id = payload.disposition;
    if (payload.inspectionDate) {
      const parsedDate = this.mapper.parseDate(payload.inspectionDate);
      if (parsedDate) dbUpdates.inspection_date = parsedDate;
    }
    if (payload.deliveryDate) {
      const parsedDate = this.mapper.parseDate(payload.deliveryDate);
      if (parsedDate) dbUpdates.delivery_date = parsedDate;
    }
    if (payload.inspectedBy) dbUpdates.inspected_by_id = payload.inspectedBy;
    if (payload.inspectionCategory) dbUpdates.inspectioncat_id = payload.inspectionCategory;
    if (payload.dataVerifiedBy) dbUpdates.data_verified_by_id = payload.dataVerifiedBy;
    if (payload.checkerId !== undefined || (payload as any).checker_id !== undefined) dbUpdates.checker_id = checkerId;
    if (payload.approverId !== undefined || (payload as any).approver_id !== undefined) dbUpdates.approver_id = approverId;
    if (payload.total_minor !== undefined) dbUpdates.total_minor = payload.total_minor;
    if (payload.total_major !== undefined) dbUpdates.total_major = payload.total_major;
    if (payload.total_critical !== undefined) dbUpdates.total_critical = payload.total_critical;
    if (payload.judgment !== undefined) dbUpdates.judgment = payload.judgment;
    if (payload.rohsVerification !== undefined) dbUpdates.rohs_verification = payload.rohsVerification;
    if (payload.referenceMnrNo !== undefined) dbUpdates.reference_mnr_no = payload.referenceMnrNo || null;
    const nextCorrectedLotVerification = this.computeCorrectedLotVerificationForUpdate(
      payload,
      existingCorrectedLotVerification,
    );
    if (nextCorrectedLotVerification !== undefined) {
      dbUpdates.corrected_lot_verification = nextCorrectedLotVerification;
    }
    if (payload.inspectorRemarks !== undefined || (payload as any).inspector_remarks !== undefined) {
      dbUpdates.inspector_remarks = this.getRemarks(payload, 'inspectorRemarks', 'inspector_remarks');
    }
    if (payload.checkerRemarks !== undefined || (payload as any).checker_remarks !== undefined) {
      dbUpdates.checker_remarks = this.getRemarks(payload, 'checkerRemarks', 'checker_remarks');
    }
    if (payload.approverRemarks !== undefined || (payload as any).approver_remarks !== undefined) {
      dbUpdates.approver_remarks = this.getRemarks(payload, 'approverRemarks', 'approver_remarks');
    }
    if (payload.inspectorId !== undefined || (payload as any).inspector_id !== undefined) {
      dbUpdates.inspector_id = inspectorId ?? undefined;
    }
    if (payload.ssiAccept !== undefined) dbUpdates.ssi_accept = payload.ssiAccept;
    if (payload.ogiRefNo !== undefined) dbUpdates.ogi_ref_no = payload.ogiRefNo;
    if (payload.remarks !== undefined) dbUpdates.remarks = payload.remarks;

    return dbUpdates;
  }

  /**
   * Insert attachments
   */
  private async insertAttachments(
    trx: Transaction<Database>, 
    npiLotId: string, 
    attachments: NpiAttachmentInput[] | undefined, 
    files: UploadedFile[], 
    userId: string, 
    now: Date
  ): Promise<void> {
    if (!attachments || attachments.length === 0) return;

    for (const att of attachments) {
      const originalName = att.file_name || att.fileName;
      if (!originalName) continue;
      
      const uploadedFile = files.find(f => f.originalname === originalName);
      const diskFileName = uploadedFile ? uploadedFile.filename : originalName;
      const finalRemarks = att.remarks 
        ? `${att.remarks} (Original: ${originalName})` 
        : `Original: ${originalName}`;

      await trx.insertInto('NPI_ATTACHMENT').values({
        npi_attachment_id: att.npi_attachment_id || uuidv4(),
        npi_lot_id: npiLotId,
        file_name: diskFileName || 'Unknown',
        file_extension: diskFileName ? diskFileName.split('.').pop()! : (att.file_extension || null),
        remarks: finalRemarks,
        last_update: now,
        updateby: userId
      }).execute();
    }
  }

  /**
   * Insert visual categories
   */
  private async insertVisualCategories(
    trx: Transaction<Database>, 
    npiLotId: string, 
    categories: NpiVisualCategoryInput[] | undefined, 
    userId: string, 
    now: Date
  ): Promise<void> {
    if (!categories || categories.length === 0) return;

    for (const vis of categories) {
      await trx.insertInto('NPI_VISUALCAT').values({
        npi_visualcat_id: uuidv4(),
        npi_lot_id: npiLotId,
        defectclass_id: vis.defectclass_id,
        defect_id: vis.defect_id,
        quantity: vis.quantity,
        last_update: now,
        updateby: userId
      }).execute();
    }
  }

  /**
   * Insert data categories
   */
  private async insertDataCategories(
    trx: Transaction<Database>, 
    npiLotId: string, 
    categories: NpiDataCategoryInput[] | undefined, 
    userId: string, 
    now: Date
  ): Promise<void> {
    if (!categories || categories.length === 0) return;

    for (const dat of categories) {
      await trx.insertInto('NPI_DATACAT').values({
        npi_datacat_id: uuidv4(),
        npi_lot_id: npiLotId,
        partdatacategory_name: dat.partdatacategory_name,
        std_min: dat.std_min,
        std_max: dat.std_max,
        actual_min: dat.actual_min ?? null,
        actual_max: dat.actual_max ?? null,
        cpk: dat.cpk ?? null,
        remarks: dat.remarks || null,
        last_update: now,
        updateby: userId
      }).execute();
    }
  }

  /**
   * Insert dimension categories
   */
  private async insertDimensionCategories(
    trx: Transaction<Database>, 
    npiLotId: string, 
    categories: NpiDimensionCategoryInput[] | undefined, 
    userId: string, 
    now: Date
  ): Promise<void> {
    if (!categories || categories.length === 0) return;

    for (const dim of categories) {
      await trx.insertInto('NPI_DIMENSIONCAT').values({
        npi_dimensioncat_id: uuidv4(),
        npi_lot_id: npiLotId,
        partdimensioncategory_name: dim.partdimensioncategory_name,
        std_min: dim.std_min,
        std_max: dim.std_max,
        actual_min: dim.actual_min ?? null,
        actual_max: dim.actual_max ?? null,
        cpk: dim.cpk ?? null,
        remarks: dim.remarks || null,
        last_update: now,
        updateby: userId
      }).execute();
    }
  }

  private async insertNoiseCategories(
    trx: Transaction<Database>,
    npiLotId: string,
    categories: NpiNoiseCategoryInput[] | undefined,
    userId: string,
    now: Date,
  ): Promise<void> {
    if (!categories || categories.length === 0) return;

    for (const category of categories) {
      await trx
        .insertInto('NPI_NOISECAT')
        .values({
          npi_noisecat_id: uuidv4(),
          npi_lot_id: npiLotId,
          partnoisecategory_name: category.partnoisecategory_name,
          std_min: category.std_min,
          std_max: category.std_max,
          actual_min: category.actual_min ?? null,
          actual_max: category.actual_max ?? null,
          cpk: category.cpk ?? null,
          remarks: category.remarks || null,
          last_update: now,
          updateby: userId,
        })
        .execute();
    }
  }

  private async insertMaterialCertificates(
    trx: Transaction<Database>,
    npiLotId: string,
    certificates: NpiMaterialCertificateInput[] | undefined,
    userId: string,
    now: Date,
  ): Promise<void> {
    if (!certificates || certificates.length === 0) return;

    for (const certificate of certificates) {
      await trx
        .insertInto('NPI_MATERIALCERT')
        .values({
          npi_materialcert_id: uuidv4(),
          npi_lot_id: npiLotId,
          component: certificate.component,
          description: certificate.description,
          required_data: certificate.required_data,
          judgement: Number(Boolean(certificate.judgement)),
          remarks: certificate.remarks || null,
          last_update: now,
          updateby: userId,
        })
        .execute();
    }
  }

  /**
   * Insert CC list
   */
  private async insertCCList(
    trx: Transaction<Database>, 
    npiLotId: string, 
    ccList: NpiCcInput[] | undefined, 
    userId: string, 
    now: Date
  ): Promise<void> {
    if (!ccList || ccList.length === 0) return;

    const { userRepository } = await import('../../users/user.repository.js');

    for (const cc of ccList) {
      // Resolve email to user_id if needed
      let resolvedUserId = cc.user_id;
      
      if (!resolvedUserId && cc.email) {
        const user = await userRepository.findByEmail(cc.email);
        resolvedUserId = user?.user_id ?? undefined;
      }
      
      if (!resolvedUserId) continue; // Skip if can't resolve

      await trx.insertInto('NPI_CC').values({
        npi_cc_id: uuidv4(),
        npi_lot_id: npiLotId,
        user_id: resolvedUserId,
        last_update: now,
        updateby: userId
      }).execute();
    }
  }
}
