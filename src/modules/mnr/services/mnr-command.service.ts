import { v4 as uuidv4 } from 'uuid';
import { controlNumberService } from '../../../shared/services/control-number.service.js';
import { assertWorkflowRecordAccess } from '../../../shared/utils/workflow-access.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';
import { mnrRepository } from '../mnr.repository.js';
import { MNRCreationInput, MNRUpdateInput } from '../mnr.schema.js';
import type { MnrWorkflowActorContext } from '../workflow/mnr-workflow.utils.js';
import { mnrAccessService } from './mnr-access.service.js';
import { mnrResponseService } from './mnr-response.service.js';

export class MnrCommandService {
  async saveResponseContent(
    id: string,
    responsePayload: Record<string, any>,
    actor: MnrWorkflowActorContext = {},
  ) {
    const now = new Date();
    const existingRecord = await mnrRepository.findByIdDetailed(id);
    if (!existingRecord) {
      throw new NotFoundError('MNR Record not found');
    }

    assertWorkflowRecordAccess({
      allowed: mnrAccessService.canMutateResponseRecord(existingRecord.record, existingRecord.response, actor),
      action: 'save',
      moduleName: 'MNR',
    });

    return await mnrRepository.executeTransaction(async (trx) => {
      const currentRecord = await trx.selectFrom('MNR_LOTS')
        .select(['mnr_id'])
        .where((eb) => eb.or([
          eb('mnr_id', '=', id),
          eb('control_no', '=', id),
        ]))
        .executeTakeFirst();

      if (!currentRecord) throw new NotFoundError('MNR Record not found');
      await mnrResponseService.persistResponseArtifacts(trx, currentRecord.mnr_id, responsePayload, actor.userId || 'SYSTEM', now);

      return {
        success: true,
        message: 'Response content saved successfully',
        data: {
          id: currentRecord.mnr_id,
        },
      };
    });
  }

  async createRecord(payload: MNRCreationInput, userId: string, files: any[] = []) {
    const mnrId = uuidv4();
    const now = new Date();

    const main = {
      mfgSites: payload.site_id || '',
      supplier: payload.supplier_id || '',
      product: payload.product_id || '',
      model: payload.model_id || '',
      mfgAreas: payload.mfg_area_id || '',
      category: payload.defectcategory_id || '',
      mnrType: payload.mnrType || '',
      attention: payload.attention_id || '',
      reference: payload.reference || '',
      remarks: payload.remarks || '',
      reportIssuance8D: payload.reportIssuance8D,
      recurrenceReference: payload.recurrenceRef || '',
      issueDate: payload.issueDate || '',
      initialReport: payload.initialReport || '',
      dueDate: payload.dueDate || '',
      actualInitialReport: payload.actualInitialReport || '',
      actualFinalReport: payload.actualFinalReport || '',
    };
    const disp = payload.disposition || (payload as any).disposition_data || {};
    const approval = (payload as any).approval || {};

    console.log('[MNR CREATE] Received payload → defects:', JSON.stringify(payload.defects, null, 2));
    console.log('[MNR CREATE] Received payload → disposition:', JSON.stringify(disp, null, 2));
    console.log('[MNR CREATE] Received payload → disposition_data:', JSON.stringify((payload as any).disposition_data, null, 2));

    const { mapStatusToDB } = await import('../../../shared/utils/status-mapper.js');
    const dbStatus = mapStatusToDB('DRAFT');

    const rtvSelected = disp.rtv && typeof disp.rtv === 'object' ? disp.rtv.selected : !!disp.rtv;
    const sortSelected = disp.sort && typeof disp.sort === 'object' ? disp.sort.selected : !!disp.sort;
    const otherSelected = disp.other && typeof disp.other === 'object' ? disp.other.selected : !!disp.other;

    const dbLotsPayload: Record<string, any> = {
      mnr_id: mnrId,
      control_no: '',
      request_status: dbStatus,
      date_created: now,
      site_id: main.mfgSites,
      product_id: main.product,
      supplier_id: main.supplier,
      model_id: main.model,
      mfg_area_id: main.mfgAreas || '',
      defectcategory_id: main.category || '',
      mnrtype_id: main.mnrType || '',
      attention_id: main.attention || '',
      reference_no: main.reference || null,
      report_issuance_8d: main.reportIssuance8D ? 1 : 0,
      recurrence_ref: payload.recurrenceRef || null,
      issued_date: mnrResponseService.formatDate(main.issueDate),
      initial_report_date: mnrResponseService.formatDate(main.initialReport) || now,
      due_date: mnrResponseService.formatDate(main.dueDate) || now,
      actual_initial_report_date: mnrResponseService.formatDate(main.actualInitialReport),
      actual_final_report_date: mnrResponseService.formatDate(main.actualFinalReport),
      rtv: rtvSelected ? 1 : 0,
      rtv_total_qty: typeof disp.rtv === 'object' ? disp.rtv.qty : disp.rtvTotalQty || disp.rtvQty || 0,
      rtv_remarks: typeof disp.rtv === 'object' ? disp.rtv.remarks : disp.rtvRemarks || null,
      sort: sortSelected ? 1 : 0,
      sort_sorted: typeof disp.sort === 'object' ? disp.sort.sorted : disp.sortSorted || 0,
      sort_rejected: typeof disp.sort === 'object' ? disp.sort.rejected : disp.sortRejected || 0,
      sort_reject_rate: typeof disp.sort === 'object' ? disp.sort.rate : disp.sortRejectRate || 0,
      sort_remarks: typeof disp.sort === 'object' ? disp.sort.remarks : disp.sortRemarks || null,
      sort_rework: typeof disp.sort === 'object' ? (disp.sort.rework ? 1 : 0) : (disp.sortRework ? 1 : 0),
      other: otherSelected ? 1 : 0,
      other_affected_qty: typeof disp.other === 'object' ? disp.other.qty : disp.otherAffectedQty || 0,
      other_affected_doc: typeof disp.other === 'object' ? disp.other.doc : disp.otherAffectedDoc || null,
      other_remarks: typeof disp.other === 'object' ? disp.other.remarks : disp.otherRemarks || null,
      encoder_id: userId,
      encoder_date: now,
      issuer_id: approval.issuer || userId,
      checker_id: approval.checker || null,
      approver_id: approval.approver || null,
      issuer_date: mnrResponseService.formatDate(approval.submitDate) || null,
      issuer_remarks: approval.issuerRemarks || null,
      checker_date: mnrResponseService.formatDate(approval.approvedDate) || null,
      checker_remarks: approval.checkerRemarks || null,
      approver_date: mnrResponseService.formatDate(approval.approvedDate2) || null,
      approver_remarks: approval.approverRemarks || null,
      remarks: main.remarks || null,
      last_update: now,
      updateby: userId,
    };

    return await mnrRepository.executeTransaction(async (trx) => {
      const controlNo = await controlNumberService.buildMnrDraft(
        {
          siteId: main.mfgSites,
          date: now,
        },
        trx,
      );
      dbLotsPayload.control_no = controlNo;
      dbLotsPayload.attention_id = await mnrResponseService.resolveAttentionId(
        trx,
        dbLotsPayload.attention_id,
      );

      await trx.insertInto('MNR_LOTS').values(dbLotsPayload as any).execute();

      if (payload.defects && Array.isArray(payload.defects)) {
        for (const defect of payload.defects) {
          let resolvedClassId: string | null = defect.classId || null;
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (resolvedClassId && !uuidRegex.test(resolvedClassId)) {
            const classRow = await trx.selectFrom('DEFECTCLASS')
              .select('defectclass_id')
              .where('defectclass_name', '=', resolvedClassId)
              .executeTakeFirst();
            resolvedClassId = classRow?.defectclass_id || null;
            console.log(`[MNR] Resolved defectclass "${defect.classId}" → ${resolvedClassId}`);
          }

          await trx.insertInto('MNR_DETAILS').values({
            mnr_detail_id: uuidv4(),
            mnr_id: mnrId,
            part_id: defect.partId || '',
            defect_id: defect.defectId || '',
            defectclass_id: resolvedClassId,
            defect_qty: defect.qty || 0,
            ca: defect.ca ? 1 : 0,
            inspection_date: mnrResponseService.formatDate(defect.inspectionDate),
            invoice_no: defect.invoiceNo,
            invoice_qty: defect.invoiceQty,
            lot_no: defect.lotNo,
            lot_size: defect.lotSize,
            sample_size: defect.sampleSize,
            group_line: defect.groupLine,
            area_defect: defect.areaDefect,
            cavity_no: defect.cavityNo,
            tray_no: defect.trayNo,
            encounter_date: mnrResponseService.formatDate(defect.encounterDate),
            verification_date: mnrResponseService.formatDate(defect.verificationDate),
            verified_by: defect.verifiedBy,
            last_update: now,
            updateby: userId,
          }).execute();
        }
      } else {
        await trx.insertInto('MNR_DETAILS').values({
          mnr_detail_id: uuidv4(),
          mnr_id: mnrId,
          part_id: '',
          defect_id: '',
          defect_qty: 0,
          ca: 0,
          last_update: now,
          updateby: userId,
        }).execute();
      }

      const responsePayload = (payload as any).response8D || {};
      await mnrResponseService.persistResponseArtifacts(trx, mnrId, responsePayload, userId, now);

      const ccUsers: string[] = [];
      if (payload.copiedUsers && Array.isArray(payload.copiedUsers)) {
        ccUsers.push(...payload.copiedUsers);
      } else if ((payload as any).ccList && Array.isArray((payload as any).ccList)) {
        for (const cc of (payload as any).ccList) {
          if (typeof cc === 'string') ccUsers.push(cc);
          else if (cc.id) ccUsers.push(cc.id);
        }
      }
      for (const ccId of ccUsers) {
        if (!ccId) continue;
        await trx.insertInto('MNR_CC').values({
          mnr_cc_id: uuidv4(),
          mnr_id: mnrId,
          user_id: ccId,
          last_update: now,
          updateby: userId,
        }).execute();
      }

      if (payload.attachments && Array.isArray(payload.attachments)) {
        for (const att of payload.attachments) {
          const originalName = att.file_name || att.name;
          if (!originalName) {
            console.warn('[MNR] Skipping attachment missing file_name:', att);
            continue;
          }

          const uploadedFile = files.find((file) => file.originalname === originalName);
          const diskFileName = uploadedFile ? uploadedFile.filename : originalName;
          const originalLabel = uploadedFile?.originalname || originalName;
          const remarkBase = (att.remarks || '').trim();
          const withOriginalMarker = remarkBase.includes('(Original:')
            ? remarkBase
            : `${remarkBase}${remarkBase ? ' ' : ''}(Original: ${originalLabel})`;

          await trx.insertInto('MNR_ATTACHMENT').values({
            mnr_attachment_id: att.id || uuidv4(),
            mnr_id: mnrId,
            file_name: diskFileName,
            file_extension: diskFileName.split('.').pop() || att.extension || 'bin',
            remarks: withOriginalMarker || null,
            last_update: now,
            updateby: userId,
          }).execute();
        }
      }

      return {
        success: true,
        data: {
          id: mnrId,
          recordId: mnrId,
          controlNo,
          controlNoState: controlNumberService.getControlNoState(controlNo),
        },
        mnr_id: mnrId,
        message: 'Record created successfully',
      };
    });
  }

  async updateRecord(id: string, payload: MNRUpdateInput, actor: MnrWorkflowActorContext, files: any[] = []) {
    const updates = payload.updates || payload;
    const now = new Date();

    return await mnrRepository.executeTransaction(async (trx) => {
      const currentRecord = await trx.selectFrom('MNR_LOTS')
        .select(['mnr_id', 'request_status', 'report_issuance_8d'])
        .where((eb) => eb.or([
          eb('mnr_id', '=', id),
          eb('control_no', '=', id),
        ]))
        .executeTakeFirst();

      if (!currentRecord) throw new NotFoundError('MNR Record not found');
      const realId = currentRecord.mnr_id;
      const existingRecord = await mnrRepository.findByIdDetailed(realId);
      assertWorkflowRecordAccess({
        allowed: mnrAccessService.canMutateMainRecord(existingRecord?.record || {}, actor),
        action: 'update',
        moduleName: 'MNR',
      });

      const dbUpdates: any = {
        last_update: now,
        updateby: actor.userId,
      };

      if (updates.site_id) dbUpdates.site_id = updates.site_id;
      if (updates.supplier_id) dbUpdates.supplier_id = updates.supplier_id;
      if (updates.model_id) dbUpdates.model_id = updates.model_id;
      if (updates.mfg_area_id) dbUpdates.mfg_area_id = updates.mfg_area_id;
      if (updates.defectcategory_id) dbUpdates.defectcategory_id = updates.defectcategory_id;
      if (updates.mnrType) dbUpdates.mnrtype_id = updates.mnrType;
      const typedUpdates = updates as any;
      const requestedAttentionId =
        typedUpdates.attention_id ??
        typedUpdates.attention ??
        typedUpdates.mainDetails?.attention;
      if (requestedAttentionId !== undefined) {
        dbUpdates.attention_id = await mnrResponseService.resolveAttentionId(trx, requestedAttentionId);
      }
      if (updates.reference !== undefined) dbUpdates.reference_no = updates.reference;
      if (updates.reportIssuance8D !== undefined) dbUpdates.report_issuance_8d = updates.reportIssuance8D ? 1 : 0;
      if (updates.recurrenceRef !== undefined) dbUpdates.recurrence_ref = updates.recurrenceRef;
      if (updates.issueDate) dbUpdates.issued_date = mnrResponseService.formatDate(updates.issueDate);
      if (updates.initialReport) dbUpdates.initial_report_date = mnrResponseService.formatDate(updates.initialReport);
      if (updates.dueDate) dbUpdates.due_date = mnrResponseService.formatDate(updates.dueDate);
      if (updates.actualInitialReport) dbUpdates.actual_initial_report_date = mnrResponseService.formatDate(updates.actualInitialReport);
      if (updates.actualFinalReport) dbUpdates.actual_final_report_date = mnrResponseService.formatDate(updates.actualFinalReport);
      if (updates.remarks !== undefined) dbUpdates.remarks = updates.remarks;

      const disp: any = updates.disposition || (updates as any).disposition_data || {};
      if (disp.rtv !== undefined) {
        dbUpdates.rtv = typeof disp.rtv === 'object' ? (disp.rtv.selected ? 1 : 0) : (disp.rtv ? 1 : 0);
        if (typeof disp.rtv === 'object') {
          if (disp.rtv.qty !== undefined) dbUpdates.rtv_total_qty = disp.rtv.qty;
          if (disp.rtv.remarks !== undefined) dbUpdates.rtv_remarks = disp.rtv.remarks;
        } else {
          const updatePayload: any = updates;
          if (disp.rtvTotalQty !== undefined) dbUpdates.rtv_total_qty = disp.rtvTotalQty;
          else if (updatePayload.rtvTotalQty !== undefined) dbUpdates.rtv_total_qty = updatePayload.rtvTotalQty;
          if (disp.rtvRemarks !== undefined) dbUpdates.rtv_remarks = disp.rtvRemarks;
          else if (updatePayload.rtvRemarks !== undefined) dbUpdates.rtv_remarks = updatePayload.rtvRemarks;
        }
      }
      if (disp.sort !== undefined) {
        dbUpdates.sort = typeof disp.sort === 'object' ? (disp.sort.selected ? 1 : 0) : (disp.sort ? 1 : 0);
        if (typeof disp.sort === 'object') {
          if (disp.sort.sorted !== undefined) dbUpdates.sort_sorted = disp.sort.sorted;
          if (disp.sort.rejected !== undefined) dbUpdates.sort_rejected = disp.sort.rejected;
          if (disp.sort.rate !== undefined) dbUpdates.sort_reject_rate = disp.sort.rate;
          if (disp.sort.rework !== undefined) dbUpdates.sort_rework = disp.sort.rework ? 1 : 0;
          if (disp.sort.remarks !== undefined) dbUpdates.sort_remarks = disp.sort.remarks;
        } else {
          const updatePayload: any = updates;
          if (disp.sortSorted !== undefined) dbUpdates.sort_sorted = disp.sortSorted;
          else if (updatePayload.sortSorted !== undefined) dbUpdates.sort_sorted = updatePayload.sortSorted;
          if (disp.sortRejected !== undefined) dbUpdates.sort_rejected = disp.sortRejected;
          else if (updatePayload.sortRejected !== undefined) dbUpdates.sort_rejected = updatePayload.sortRejected;
          if (disp.sortRejectRate !== undefined) dbUpdates.sort_reject_rate = disp.sortRejectRate;
          else if (updatePayload.sortRejectRate !== undefined) dbUpdates.sort_reject_rate = updatePayload.sortRejectRate;
          if (disp.sortRework !== undefined) dbUpdates.sort_rework = disp.sortRework ? 1 : 0;
          else if (updatePayload.sortRework !== undefined) dbUpdates.sort_rework = updatePayload.sortRework ? 1 : 0;
          if (disp.sortRemarks !== undefined) dbUpdates.sort_remarks = disp.sortRemarks;
          else if (updatePayload.sortRemarks !== undefined) dbUpdates.sort_remarks = updatePayload.sortRemarks;
        }
      }
      if (disp.other !== undefined) {
        dbUpdates.other = typeof disp.other === 'object' ? (disp.other.selected ? 1 : 0) : (disp.other ? 1 : 0);
        if (typeof disp.other === 'object') {
          if (disp.other.qty !== undefined) dbUpdates.other_affected_qty = disp.other.qty;
          if (disp.other.doc !== undefined) dbUpdates.other_affected_doc = disp.other.doc;
          if (disp.other.remarks !== undefined) dbUpdates.other_remarks = disp.other.remarks;
        } else {
          const updatePayload: any = updates;
          if (disp.otherAffectedQty !== undefined) dbUpdates.other_affected_qty = disp.otherAffectedQty;
          else if (updatePayload.otherAffectedQty !== undefined) dbUpdates.other_affected_qty = updatePayload.otherAffectedQty;
          if (disp.otherAffectedDoc !== undefined) dbUpdates.other_affected_doc = disp.otherAffectedDoc;
          else if (updatePayload.otherAffectedDoc !== undefined) dbUpdates.other_affected_doc = updatePayload.otherAffectedDoc;
          if (disp.otherRemarks !== undefined) dbUpdates.other_remarks = disp.otherRemarks;
          else if (updatePayload.otherRemarks !== undefined) dbUpdates.other_remarks = updatePayload.otherRemarks;
        }
      }

      const updateAtts = (updates as any).attachments;
      if (updateAtts !== undefined && Array.isArray(updateAtts)) {
        console.log(`[MNR Update] Syncing ${updateAtts.length} attachments for record ${id}`);
        const existingAttachments = await trx.selectFrom('MNR_ATTACHMENT')
          .select(['mnr_attachment_id', 'file_name', 'remarks'])
          .where('mnr_id', '=', realId)
          .execute();
        const existingById = new Map(existingAttachments.map((attachment) => [attachment.mnr_attachment_id, attachment]));
        await trx.deleteFrom('MNR_ATTACHMENT').where('mnr_id', '=', realId).execute();
        for (const att of updateAtts) {
          const originalName = att.file_name || att.name;
          const existing = att.id ? existingById.get(att.id) : undefined;
          if (!originalName && !existing?.file_name) continue;

          const uploadedFile = originalName
            ? files.find((file) => file.originalname === originalName)
            : undefined;
          const diskFileName = uploadedFile
            ? uploadedFile.filename
            : (existing?.file_name || originalName);
          const originalLabel = uploadedFile?.originalname || originalName || existing?.file_name || '';
          const remarkBase = (att.remarks || existing?.remarks || '').replace(/\s*\(Original:\s.*?\)\s*$/, '').trim();
          const withOriginalMarker = originalLabel
            ? `${remarkBase}${remarkBase ? ' ' : ''}(Original: ${originalLabel})`
            : remarkBase;

          await trx.insertInto('MNR_ATTACHMENT').values({
            mnr_attachment_id: att.id || uuidv4(),
            mnr_id: realId,
            file_name: diskFileName,
            file_extension: diskFileName.split('.').pop() || att.extension || 'bin',
            remarks: withOriginalMarker || null,
            last_update: now,
            updateby: actor.userId || 'SYSTEM',
          }).execute();
        }
      }

      const updateCcList = (updates as any).ccList;
      const updateDefects = Array.isArray((updates as any).defects) ? (updates as any).defects : undefined;

      if (Object.keys(dbUpdates).length > 2) {
        await trx.updateTable('MNR_LOTS')
          .set(dbUpdates)
          .where((eb) => eb.or([
            eb('mnr_id', '=', id),
            eb('control_no', '=', id),
          ]))
          .execute();
      }

      if (updateDefects) {
        await trx.deleteFrom('MNR_DETAILS').where('mnr_id', '=', realId).execute();

        for (const defect of updateDefects) {
          let resolvedClassId: string | null = defect.classId || null;
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (resolvedClassId && !uuidRegex.test(resolvedClassId)) {
            const classRow = await trx.selectFrom('DEFECTCLASS')
              .select('defectclass_id')
              .where('defectclass_name', '=', resolvedClassId)
              .executeTakeFirst();
            resolvedClassId = classRow?.defectclass_id || null;
          }

          await trx.insertInto('MNR_DETAILS').values({
            mnr_detail_id: defect.id || uuidv4(),
            mnr_id: realId,
            part_id: defect.partId || '',
            defect_id: defect.defectId || '',
            defectclass_id: resolvedClassId,
            defect_qty: defect.qty || 0,
            ca: defect.ca ? 1 : 0,
            inspection_date: mnrResponseService.formatDate(defect.inspectionDate),
            invoice_no: defect.invoiceNo || null,
            invoice_qty: defect.invoiceQty || null,
            lot_no: defect.lotNo || null,
            lot_size: defect.lotSize || null,
            sample_size: defect.sampleSize || null,
            group_line: defect.groupLine || null,
            area_defect: defect.areaDefect || null,
            cavity_no: defect.cavityNo || null,
            tray_no: defect.trayNo || null,
            encounter_date: mnrResponseService.formatDate(defect.encounterDate),
            verification_date: mnrResponseService.formatDate(defect.verificationDate),
            verified_by: defect.verifiedBy || null,
            last_update: now,
            updateby: actor.userId || 'SYSTEM',
          }).execute();
        }
      }

      if (updateCcList !== undefined) {
        await trx.deleteFrom('MNR_CC').where('mnr_id', '=', realId).execute();
        for (const cc of updateCcList) {
          const ccId = typeof cc === 'string' ? cc : cc?.id;
          if (!ccId) continue;
          await trx.insertInto('MNR_CC').values({
            mnr_cc_id: uuidv4(),
            mnr_id: realId,
            user_id: ccId,
            last_update: now,
            updateby: actor.userId || 'SYSTEM',
          }).execute();
        }
      }

      return { success: true, message: 'Record updated successfully' };
    });
  }

  async deleteRecord(id: string, actor: MnrWorkflowActorContext = {}) {
    return await mnrRepository.executeTransaction(async (trx) => {
      const record = await trx.selectFrom('MNR_LOTS')
        .select('mnr_id')
        .where((eb) => eb.or([
          eb('mnr_id', '=', id),
          eb('control_no', '=', id),
        ]))
        .executeTakeFirst();

      if (!record) return { success: false, message: 'Record not found' };
      const realId = record.mnr_id;
      const existingRecord = await mnrRepository.findByIdDetailed(realId);
      assertWorkflowRecordAccess({
        allowed: mnrAccessService.canDeleteRecord(existingRecord?.record || {}, actor),
        action: 'delete',
        moduleName: 'MNR',
      });

      await trx.deleteFrom('MNR_CC').where('mnr_id', '=', realId).execute();
      await trx.deleteFrom('MNR_ATTACHMENT').where('mnr_id', '=', realId).execute();
      await trx.deleteFrom('MNR_VERIFICATION').where('mnr_id', '=', realId).execute();
      const responses = await trx.selectFrom('MNR_RESPONSE').select('mnr_response_id').where('mnr_id', '=', realId).execute();
      for (const response of responses) {
        await trx.deleteFrom('MNR_RESPONSE_ATTACHMENT').where('mnr_response_id', '=', response.mnr_response_id).execute();
      }
      await trx.deleteFrom('MNR_RESPONSE').where('mnr_id', '=', realId).execute();
      await trx.deleteFrom('MNR_DETAILS').where('mnr_id', '=', realId).execute();
      await trx.deleteFrom('MNR_LOTS').where('mnr_id', '=', realId).execute();
      return { success: true, message: 'Record and all associated data deleted successfully' };
    });
  }
}

export const mnrCommandService = new MnrCommandService();
