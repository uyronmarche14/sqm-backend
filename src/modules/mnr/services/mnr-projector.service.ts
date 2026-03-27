import { mapStatusFromDB } from '../../../shared/utils/status-mapper.js';
import { buildMnrWorkflowMetadata, type MnrWorkflowActorContext } from '../workflow/mnr-workflow.utils.js';
import { MNR_WORKFLOW_STAGE, type MnrWorkflowStage } from '../workflow/mnr-workflow.constants.js';

export class MnrProjectorService {
  mapWorkflowStageToDisplayStatus(stage: MnrWorkflowStage): string {
    switch (stage) {
      case MNR_WORKFLOW_STAGE.DRAFT:
        return 'DRAFT';
      case MNR_WORKFLOW_STAGE.CHECKER:
        return 'AWAITING_CHECKED';
      case MNR_WORKFLOW_STAGE.APPROVER:
        return 'AWAITING_APPROVAL';
      case MNR_WORKFLOW_STAGE.REJECT_CHECKER:
      case MNR_WORKFLOW_STAGE.REJECT_APPROVER:
      case MNR_WORKFLOW_STAGE.REJECT_SUPPLIER:
        return 'REJECTED';
      case MNR_WORKFLOW_STAGE.ISSUER:
        return 'APPROVED';
      case MNR_WORKFLOW_STAGE.SUPPLIER:
        return 'ISSUED';
      case MNR_WORKFLOW_STAGE.INITIAL_RESPONSE:
        return 'IR';
      case MNR_WORKFLOW_STAGE.FINAL_RESPONSE:
        return 'FR';
      case MNR_WORKFLOW_STAGE.ISSUER_2ND:
        return 'RESPONSE_SUBMITTED';
      case MNR_WORKFLOW_STAGE.CHECKER_2ND:
      case MNR_WORKFLOW_STAGE.REJECT_CHECKER_2ND:
        return 'RESPONSE_AWAITING_CHECKED';
      case MNR_WORKFLOW_STAGE.APPROVER_2ND:
      case MNR_WORKFLOW_STAGE.REJECT_APPROVER_2ND:
        return 'RESPONSE_AWAITING_APPROVAL';
      case MNR_WORKFLOW_STAGE.ISSUER_3RD:
        return 'RESPONSE_RECEIVED';
      case MNR_WORKFLOW_STAGE.REJECT_ISSUER_2ND:
      case MNR_WORKFLOW_STAGE.NOT_ACCEPT:
        return 'RESPONSE_REJECTED';
      case MNR_WORKFLOW_STAGE.CANCEL:
        return 'CANCELLED';
      case MNR_WORKFLOW_STAGE.ACCEPT:
      case MNR_WORKFLOW_STAGE.LOT_TRACKING:
        return 'CLOSED';
      default:
        return mapStatusFromDB(String(stage));
    }
  }

  projectListRecord(
    record: Record<string, any>,
    latestResponse: Record<string, any> | null | undefined,
    actor: MnrWorkflowActorContext = {},
  ) {
    const workflow = buildMnrWorkflowMetadata({
      request_status: record.status,
      report_issuance_8d: record.report_issuance_8d,
      supplier_id: record.supplier_id,
      encoder_id: record.encoder_id,
      encoder_name: record.encoder_name,
      issuer_id: record.issuer_id,
      issuer_name: record.issuer_name,
      checker_id: record.checker_id,
      checker_name: record.checker_name,
      approver_id: record.approver_id,
      approver_name: record.approver_name,
      attention_id: record.attention_id,
    }, {
      latestResponse,
      actor,
    });

    return {
      id: record.id,
      control_no: record.control_no,
      status: this.mapWorkflowStageToDisplayStatus(workflow.workflowStage),
      workflowStage: workflow.workflowStage,
      workflowStageCode: workflow.workflowStageCode,
      workflowStageName: workflow.workflowStageName,
      workflowStageLabel: workflow.workflowStageLabel,
      availableActions: workflow.availableActions,
      nextApproverId: workflow.nextApproverId,
      nextApproverName: workflow.nextApproverName,
      response_checker_id: latestResponse?.checker_id || null,
      response_checker_name: latestResponse?.checker_name || null,
      response_approver_id: latestResponse?.approver_id || null,
      response_approver_name: latestResponse?.approver_name || null,
      created_at: record.date_created,
      supplier_name: record.supplier_name,
      model_name: record.model_name,
      product_name: record.product_name,
      site_name: record.site_name,
      encoder_name: record.encoder_name,
      issuer_name: record.issuer_name,
      checker_name: record.checker_name,
      approver_name: record.approver_name,
      mnr_type_name: record.mnr_type_name,
      category_name: record.category_name,
      attention_name: record.attention_name,
      site_id: record.site_id,
      mfg_sites: record.site_id,
      supplier_id: record.supplier_id,
      model_id: record.model_id,
      product_id: record.product_id,
      mfg_area_id: record.mfg_area_id,
      defectcategory_id: record.defectcategory_id,
      mnrtype_id: record.mnrtype_id,
      attention_id: record.attention_id,
      reference_no: record.reference_no,
      report_issuance_8d: record.report_issuance_8d === 1 || record.report_issuance_8d === true,
      recurrence_ref: record.recurrence_ref,
      issued_date: record.issued_date,
      initial_report_date: record.initial_report_date,
      due_date: record.due_date,
      part_name: record.part_name,
      part_code: record.part_code,
      last_update: record.last_update,
      updateby: record.updateby,
    };
  }

  projectDetailRecord(
    data: {
      record: Record<string, any>;
      details: any[];
      response?: Record<string, any> | null;
      responseAttachments?: any[];
      verificationEntries?: any[];
      ccList: any[];
      attachments: any[];
    },
    actor: MnrWorkflowActorContext = {},
  ) {
    const main = data.record;
    const workflow = buildMnrWorkflowMetadata(main, {
      latestResponse: data.response || undefined,
      actor,
    });

    return {
      mainDetails: {
        id: main.mnr_id,
        controlNo: main.control_no,
        status: this.mapWorkflowStageToDisplayStatus(workflow.workflowStage),
        workflowStage: workflow.workflowStage,
        workflowStageCode: workflow.workflowStageCode,
        workflowStageName: workflow.workflowStageName,
        workflowStageLabel: workflow.workflowStageLabel,
        availableActions: workflow.availableActions,
        nextApproverId: workflow.nextApproverId,
        nextApproverName: workflow.nextApproverName,
        created_at: main.date_created,
        mfgSites: main.site_id,
        supplier: main.supplier_id,
        model: main.model_id,
        product: main.product_id,
        mfgAreas: main.mfg_area_id,
        category: main.defectcategory_id,
        mnrType: main.mnrtype_id,
        attention: main.attention_id,
        reference: main.reference_no,
        reportIssuance8D: main.report_issuance_8d === 1 || main.report_issuance_8d === true,
        recurrenceRef: main.recurrence_ref,
        issueDate: main.issued_date,
        initialReport: main.initial_report_date,
        dueDate: main.due_date,
        actualInitialReport: main.actual_initial_report_date,
        actualFinalReport: main.actual_final_report_date,
        remarks: main.remarks,
        encoder_id: main.encoder_id,
        issuer_id: main.issuer_id,
        checker_id: main.checker_id,
        approver_id: main.approver_id,
        issuer_date: main.issuer_date,
        issuer_remarks: main.issuer_remarks,
        checker_date: main.checker_date,
        checker_remarks: main.checker_remarks,
        approver_date: main.approver_date,
        approver_remarks: main.approver_remarks,
        site_name: main.site_name,
        supplier_name: main.supplier_name,
        product_name: main.product_name,
        model_name: main.model_name,
        model_no: main.model_no,
        mfg_area_name: main.mfg_area_name,
        category_name: main.category_name,
        mnr_type_name: main.mnr_type_name,
        encoder_name: main.encoder_name,
        issuer_name: main.issuer_name,
        checker_name: main.checker_name,
        approver_name: main.approver_name,
        attention_name: main.attention_name,
      },
      defects: data.details,
      response8D: data.response ? {
        ...data.response,
        attachments: data.responseAttachments,
      } : null,
      verificationEntries: data.verificationEntries || [],
      disposition: {
        rtv: { selected: main.rtv, qty: main.rtv_total_qty, remarks: main.rtv_remarks },
        sort: {
          selected: main.sort,
          sorted: main.sort_sorted,
          rejected: main.sort_rejected,
          rate: main.sort_reject_rate,
          rework: main.sort_rework,
          remarks: main.sort_remarks,
        },
        other: {
          selected: main.other,
          qty: main.other_affected_qty,
          doc: main.other_affected_doc,
          remarks: main.other_remarks,
        },
      },
      approval: {
        issuer: main.issuer_id,
        issuerName: main.issuer_name,
        checker: main.checker_id,
        checkerName: main.checker_name,
        approver: main.approver_id,
        approverName: main.approver_name,
        issuerDate: main.issuer_date,
        issuerRemarks: main.issuer_remarks,
        checkerDate: main.checker_date,
        checkerRemarks: main.checker_remarks,
        approverDate: main.approver_date,
        approverRemarks: main.approver_remarks,
      },
      workflow,
      copiedUsers: data.ccList.map((cc) => {
        const ccAny = cc as any;
        const fullName = ccAny.full_name || ccAny.fullName || ccAny.username ||
          ((ccAny.first_name || '') + ' ' + (ccAny.last_name || '')).trim() || '';
        console.log('[MNR CC] Raw CC entry:', JSON.stringify(cc));
        return { id: ccAny.user_id, value: ccAny.user_id, label: fullName, full_name: fullName, email: ccAny.email || '' };
      }),
      attachments: data.attachments,
      meta: {
        last_update: main.last_update,
        updateby: main.updateby,
      },
    };
  }
}

export const mnrProjectorService = new MnrProjectorService();
