import { fiveM1ERepository } from './fiveM1E.repository.js';
import { db } from '../../shared/infrastructure/db.js';
import { sql } from 'kysely';
import { CreateFiveM1EInput, UpdateFiveM1EInput } from './fiveM1E.schema.js';
import { SmartMapper, MapperSchema } from '../../shared/infrastructure/SmartMapper.js';
import { FiveM1EApplicationTable, NewFiveM1EApp, FiveM1EAppUpdate } from './fiveM1E.db.types.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { v4 as uuidv4 } from 'uuid';
import { fiveM1EWorkflowService } from './workflow/fiveM1E-workflow.service.js';
import { FIVE_M1E_WORKFLOW_STAGE } from './workflow/fiveM1E-workflow.constants.js';

/**
 * 5M1E Domain Service
 * Encapsulates core business logic and mapping.
 */

// Define mapping explicitly to automate DTO to Database translations
// Maps frontend snake_case DTO keys → PascalCase DB column names
const applicationSchema: MapperSchema<any, FiveM1EApplicationTable> = {
  title: 'Title',
  supplier_id: 'SupplierID',
  supplier_cn: 'SupplierCN',
  vendor_id: 'VendorID',
  item_id: 'ItemID',
  site_id: 'SiteID',
  commodity_id: 'CommodityID',
  model_id: 'ModelID',
  report_no: 'ReportNo',
  date_register: 'DateRegister',
  class_id: 'Class',
  class_type_id: 'ClassType',
  impact_date: 'ImpactDate',
  engineer_remarks: 'EngineerRemarks',
  attribute_01: 'Attribute01',
  attribute_02: 'Attribute02',
  attribute_03: 'Attribute03',
  attribute_04: 'Attribute04',
  attribute_05: 'Attribute05',
  attribute_06: 'Attribute06',
  attribute_07: 'Attribute07',
  attribute_08: 'Attribute08',
  attribute_09: 'Attribute09',
  attribute_10: 'Attribute10',
  // Dedicated Evaluation Columns (new — replacing generic Attribute usage)
  rank_id: 'RankID',
  change_qc_process: 'ChangeQCProcess',
  change_supplier_spec: 'ChangeSupplierSpec',
  process_audit_result: 'ProcessAuditResult',
  // Note: environmental_approval is mapped manually to TBL_5M1E_Approval.EnviAppproverNecessary as YES/NO
};

/**
 * Normalize frontend field aliases before SmartMapper:
 * Frontend sends `class` and `class_type`, but SmartMapper expects `class_id` and `class_type_id`.
 */
function normalizeInput(data: any): any {
  const normalized = { ...data };
  // Frontend sends `class` → normalize to `class_id`
  if (normalized.class && !normalized.class_id) {
    normalized.class_id = normalized.class;
  }
  // Frontend sends `class_type` → normalize to `class_type_id`
  if (normalized.class_type && !normalized.class_type_id) {
    normalized.class_type_id = normalized.class_type;
  }
  return normalized;
}

export class FiveM1EService {
  
  /**
   * Creates a new 5M1E Application and its initial Approval state
   */
  async createApplication(data: CreateFiveM1EInput, userId: string, files: any[] = []) {
    console.log('[5M1E Service] Create Application Payload:', JSON.stringify(data, null, 2));
    console.log(`[5M1E Service] Attached files count: ${files.length}`);
    
    const controlNo = '5M-' + uuidv4().split('-')[0].toUpperCase(); 

    // Normalize field aliases (class → class_id, class_type → class_type_id)
    const normalized = normalizeInput(data);

    // Automap Frontend Fields to DB Columns using SmartMapper
    const dbData = SmartMapper.toDB(normalized, applicationSchema) as NewFiveM1EApp;
    
    dbData.ControlNo = controlNo;
    dbData.CreatedBy = userId;
    dbData.CreateDate = new Date();

    // Build approval data from frontend payload
    const approvalData: Record<string, unknown> = {};
    if (data.mpd_pic) approvalData.MPDPIC = data.mpd_pic;
    if (data.mpd_checker) approvalData.MPDChecker = data.mpd_checker;
    if (data.mpd_checker_name) approvalData.MPDCheckerName = data.mpd_checker_name;
    if (data.mpd_approver) approvalData.MPDApprover = data.mpd_approver;
    if (data.mpd_approver_name) approvalData.MPDApproverName = data.mpd_approver_name;
    if (data.mpd_apr_dt_aprd) approvalData.MPDAprDtAprd = data.mpd_apr_dt_aprd;
    if (data.mpd_chkr_dt_aprd) approvalData.MPDChkrDtAprd = data.mpd_chkr_dt_aprd;
    if (data.hde_pic) approvalData.HDEPIC = data.hde_pic;
    if (data.evaluation_ic) approvalData.EvaluationIC = data.evaluation_ic;
    if (data.evaluation_ic_dt_aprd) approvalData.EvaluationICDtAprd = data.evaluation_ic_dt_aprd;
    if (data.ds_approver_necessary) approvalData.DSAppproverNecessary = data.ds_approver_necessary;
    if (data.design_approver_id) approvalData.DesignApproverID = data.design_approver_id;
    if (data.design_approver_name) approvalData.DesignApproverName = data.design_approver_name;
    if (data.ds_checker_necessary) approvalData.DSCheckerNecessary = data.ds_checker_necessary;
    
    // Environmental Approval Logic: Either from Final stage radio ('YES'/'NO') or Evaluation checkbox ('1'/'0')
    let enviNecessary = 'NO';
    if (data.envi_approver_necessary === 'YES' || data.environmental_approval === '1' || data.environmental_approval === 1 || data.environmental_approval === true) {
        enviNecessary = 'YES';
    }
    approvalData.EnviAppproverNecessary = enviNecessary;
    approvalData.EnviCheckerNecessary = enviNecessary; // Legacy sync
    
    if (data.envi_approver_id) approvalData.EnviApproverID = data.envi_approver_id;
    if (data.envi_approve_name) approvalData.EnviApproveName = data.envi_approve_name;
    if (data.envi_approve_dt_aprd) approvalData.EnviApproveDtAprd = data.envi_approve_dt_aprd;
    if (data.qa_checker_id) approvalData.QACheckerID = data.qa_checker_id;
    if (data.qa_checker_name) approvalData.QACheckerName = data.qa_checker_name;
    if (data.qa_checker_dt_aprd) approvalData.QACheckerDtAprd = data.qa_checker_dt_aprd;
    if (data.final_approver) approvalData.FinalApprover = data.final_approver;
    if (data.fa_name) approvalData.FAName = data.fa_name;
    if (data.fa_dt_aprd) approvalData.FADtAprd = data.fa_dt_aprd;
    
    if (data.design_approver_dt_aprd) approvalData.DesignApproverDtAprd = data.design_approver_dt_aprd;
    
    if (data.approval_seq !== undefined) approvalData.ApprovalSeq = data.approval_seq;
    
    // NEW: Add reviewer, checker, approver fields from approval section
    if (data.reviewer) approvalData.Reviewer = data.reviewer;
    if (data.checker) approvalData.Checker = data.checker;
    if (data.approver) approvalData.Approver = data.approver;
    if (data.issue_date) approvalData.IssueDate = data.issue_date;
    if (data.chkr_dt_aprd) approvalData.ChkrDtAprd = data.chkr_dt_aprd;
    if (data.approver_dt_aprd) approvalData.ApproverDtAprd = data.approver_dt_aprd;
    
    console.log('[5M1E Service] Approval data built:', Object.keys(approvalData));

    // Transactional Insert: Application + Approval + Child Tables
    const newRecord = await fiveM1ERepository.createWithApproval(
      dbData, 
      data.status || 'DRAFT', 
      approvalData
    );

    // Insert child tables
    const cn = newRecord.ControlNo;
    
    if (data.parts && data.parts.length > 0) {
      await fiveM1ERepository.insertParts(cn, data.parts);
    }
    
    // Process attachments with file uploads
    if (data.attachments && data.attachments.length > 0) {
      console.log(`[5M1E Service] Processing ${data.attachments.length} attachment(s) with ${files.length} file(s)`);
      await this.processAttachments(cn, data.attachments, files);
    }
    
    if (data.action_items && data.action_items.length > 0) {
      await fiveM1ERepository.replaceActionItems(cn, data.action_items);
    }
    if (data.check_items && data.check_items.length > 0) {
      if (files && files.length > 0) {
        data.check_items.forEach(item => {
          if (item.attribute_2 && typeof item.attribute_2 === 'string') {
             const uploadedFile = files.find(f => f.originalname === item.attribute_2);
             if (uploadedFile) {
               console.log(`[5M1E Service] Processing check_item attachment: ${item.attribute_2} -> ${uploadedFile.filename}`);
               item.attribute_2 = uploadedFile.path;
             }
          }
        });
      }
      await fiveM1ERepository.replaceCheckItems(cn, data.check_items);
    }
    if (data.status_remarks && data.status_remarks.length > 0) {
      await fiveM1ERepository.replaceStatusRemarks(cn, data.status_remarks);
    }

    // Insert CC Notification List
    if (data.cc_list && data.cc_list.length > 0) {
      for (const cc of data.cc_list) {
        const ccId = uuidv4();
        await db.insertInto('TBL_5M1E_CC' as any).values({
          ID: ccId,
          ControlNo: cn,
          UserID: cc.user_id,
          UpdateBy: userId,
          LastUpdate: new Date(),
        }).execute();
      }
    }

    return {
      success: true,
      message: 'Application created successfully',
      data: {
        id: newRecord.ID,
        control_no: newRecord.ControlNo,
      }
    };
  }

  /**
   * Retrieves all 5M1E Applications
   */
  async getAllApplications(status?: string, actorUserId?: string) {
    const records = await fiveM1ERepository.findAllWithApproval(status);
    
    return Promise.all(records.map(async (record: any) => {
      const dto = SmartMapper.toDTO(record as unknown as FiveM1EApplicationTable, applicationSchema);
      const workflow = await fiveM1EWorkflowService.getWorkflowMetadata(record, actorUserId);
      const normalizedStatus =
        workflow.workflowStage === FIVE_M1E_WORKFLOW_STAGE.RELEASED ? 'RELEASE' : record.approval_status;
      return {
        ...dto,
        id: record.ID,
        control_no: record.ControlNo,
        status: normalizedStatus,
        workflowStage: workflow.workflowStage,
        workflowStageCode: workflow.workflowStageCode,
        workflowStageLabel: workflow.workflowStageLabel,
        availableActions: workflow.availableActions,
        nextApproverId: workflow.nextApproverId,
        nextApproverName: workflow.nextApproverName,
        ownerMode: workflow.ownerMode,
        mpd_pic: record.mpd_pic,
        mpd_approver: record.mpd_approver,
        created_at: record.CreateDate,
        reviewer_name: record.reviewer_full_name,
        checker_name: record.checker_full_name,
        approver_name: record.approver_full_name,
        supplier_name: record.supplier_name,
        site_name: record.site_name,
        attribute_03_name: record.attribute_03_name,
        mpd_pic_name: record.mpd_pic_name,
      };
    }));
  }

  /**
   * Retrieves a 5M1E Application with its full Approval + Child Tables
   */
  async getApplication(controlNo: string, actorUserId?: string) {
    const record = await fiveM1ERepository.findWithApproval(controlNo);
    
    if (!record) {
      throw new NotFoundError(`5M1E Application ${controlNo} not found`);
    }

    // SmartMap back to frontend standard DTO payload
    const dto = SmartMapper.toDTO(record as unknown as FiveM1EApplicationTable, applicationSchema);
    
    // Fetch child tables
    const cn = record.ControlNo;
    const [parts, attachments, actionItems, checkItems, statusRemarks] = await Promise.all([
      fiveM1ERepository.findParts(cn),
      fiveM1ERepository.findAttachments(cn),
      fiveM1ERepository.findActionItems(cn),
      fiveM1ERepository.findCheckItems(cn),
      fiveM1ERepository.findStatusRemarks(cn),
    ]);

    // Fetch CC list with user names
    const ccResult = await sql`
      SELECT cc.ID as id, cc.ControlNo as control_no, cc.UserID as user_id,
             u.full_name, u.email
      FROM TBL_5M1E_CC cc
      LEFT JOIN USERS u ON cc.UserID = u.user_id
      WHERE cc.ControlNo = ${cn}
    `.execute(db);
    const ccList = ccResult.rows;
    const workflow = await fiveM1EWorkflowService.getWorkflowMetadata(record as any, actorUserId);
    const normalizedStatus =
      workflow.workflowStage === FIVE_M1E_WORKFLOW_STAGE.RELEASED ? 'RELEASE' : record.approval_status;

    return {
      ...dto,
      id: record.ID,
      control_no: record.ControlNo,
      status: normalizedStatus,
      workflowStage: workflow.workflowStage,
      workflowStageCode: workflow.workflowStageCode,
      workflowStageLabel: workflow.workflowStageLabel,
      availableActions: workflow.availableActions,
      nextApproverId: workflow.nextApproverId,
      nextApproverName: workflow.nextApproverName,
      ownerMode: workflow.ownerMode,
      workflow,
      // Human-readable display names resolved via USERS table JOIN
      created_by_name: (record as any).created_by_name,
      reviewer_name: (record as any).reviewer_full_name,
      checker_name: (record as any).checker_full_name,
      approver_name: (record as any).approver_full_name,
      supplier_name: (record as any).supplier_name,
      supplier_company_name: (record as any).supplier_company_name,
      site_name: (record as any).site_name,
      model_name: (record as any).model_name,
      part_type_name: (record as any).part_type_name,
      attribute_03_name: (record as any).attribute_03_name,
      mpd_approver_name: (record as any).mpd_approver_name,
      mpd_pic_name: (record as any).mpd_pic_name,
      // Approval fields (flat)
      reviewer: (record as any).reviewer,
      checker: (record as any).checker,
      approver: (record as any).approver,
      issue_date: (record as any).issue_date,
      chkr_dt_aprd: (record as any).chkr_dt_aprd,
      approver_dt_aprd: (record as any).approver_dt_aprd,
      mpd_pic: record.mpd_pic,
      mpd_approver: record.mpd_approver,
      mpd_checker: (record as any).MPDChecker,
      mpd_checker_name: (record as any).MPDCheckerName,
      hde_pic: (record as any).HDEPIC,
      evaluation_ic: (record as any).EvaluationIC,
      final_approver: (record as any).FinalApprover,
      fa_name: (record as any).FAName,
      approval_seq: (record as any).ApprovalSeq,
      // Environment Approval fields (human-readable names resolved via USERS JOINs)
      envi_checker_necessary: (record as any).envi_checker_necessary,
      envi_checker_id: (record as any).envi_checker_id,
      envi_checker_name: (record as any).envi_checker_full_name || (record as any).envi_checker_name,
      envi_checker_status: (record as any).envi_checker_status,
      envi_checker_dt_aprd: (record as any).envi_checker_dt_aprd,
      envi_approver_necessary: (record as any).envi_approver_necessary,
      envi_approver_id: (record as any).envi_approver_id,
      envi_approve_name: (record as any).envi_approver_full_name || (record as any).envi_approve_name,
      envi_approve_status: (record as any).envi_approve_status,
      envi_approve_dt_aprd: (record as any).envi_approve_dt_aprd,
      // Child tables
      parts: parts.map((p: any) => ({ part_id: p.part_id })),
      attachments: attachments.map((a: any) => ({
        id: a.ID, file_name: a.FileName,
        attribute_1: a.Attribute1, attribute_2: a.Attribute2,
      })),
      action_items: actionItems.map((ai: any) => ({
        id: ai.ID, action_item: ai.ActionItem, pic: ai.PIC, pic_name: ai.PICName,
        first_target_dt: ai.FirstTargetDt, second_target_dt: ai.SecondTargetDt, third_target_dt: ai.ThirdTargetDt,
        verification_result: ai.VerificationResult, remarks: ai.Remarks,
        attribute_01: ai.Attribute01, attribute_02: ai.Attribute02, attribute_03: ai.Attribute03,
        attribute_04: ai.Attribute04, attribute_05: ai.Attribute05,
      })),
      check_items: checkItems.map((ci: any) => ({
        id: ci.ID, check_item: ci.CheckItem, judgement: ci.Judgement,
        remarks: ci.Remarks, attribute_1: ci.Attribute1, attribute_2: ci.Attribute2,
        attribute_3: ci.Attribute3, attribute_4: ci.Attribute4, attribute_5: ci.Attribute5,
      })),
      status_remarks: statusRemarks.map((sr: any) => ({
        id: sr.ID, remarks: sr.Remarks, remark_by: sr.RemarkBy, status: sr.Status,
        create_date: sr.CreateDate,
        attribute1: sr.attribute1, attribute2: sr.attribute2, attribute3: sr.attribute3,
        attribute4: sr.attribute4, attribute5: sr.attribute5,
      })),
      cc_list: (ccList as any[]).map((cc: any) => ({
        id: cc.id,
        user_id: cc.user_id,
        full_name: cc.full_name || '',
        email: cc.email || '',
      })),
    };
  }

  /**
   * Updates an Application intelligently picking valid fields
   */
  async updateApplication(controlNo: string, data: UpdateFiveM1EInput, files: any[] = [], _userId: string = 'SYSTEM') {
    console.log('[5M1E Service] Update Application Payload:', JSON.stringify(data, null, 2));
    console.log(`[5M1E Service] Attached files count: ${files.length}`);
    
    const existing = await fiveM1ERepository.findWithApproval(controlNo);
    if (!existing) {
      throw new NotFoundError(`5M1E Application ${controlNo} not found`);
    }

    const normalized = normalizeInput(data);
    const updateDbData = SmartMapper.toDB(normalized, applicationSchema) as FiveM1EAppUpdate;
    
    if (Object.keys(updateDbData).length > 0) {
      await fiveM1ERepository.updateByControlNo(controlNo, updateDbData);
    }

    // Update Approval table fields (status + any approval workflow data)
    const approvalUpdates: Record<string, unknown> = {};
    if (data.mpd_pic) approvalUpdates.MPDPIC = data.mpd_pic;
    if (data.mpd_approver) approvalUpdates.MPDApprover = data.mpd_approver;
    if (data.mpd_approver_name) approvalUpdates.MPDApproverName = data.mpd_approver_name;
    if (data.mpd_checker) approvalUpdates.MPDChecker = data.mpd_checker;
    if (data.mpd_checker_name) approvalUpdates.MPDCheckerName = data.mpd_checker_name;
    if (data.hde_pic) approvalUpdates.HDEPIC = data.hde_pic;
    if (data.evaluation_ic) approvalUpdates.EvaluationIC = data.evaluation_ic;
    if (data.evaluation_ic_dt_aprd) approvalUpdates.EvaluationICDtAprd = data.evaluation_ic_dt_aprd;
    
    if (data.final_approver) approvalUpdates.FinalApprover = data.final_approver;
    if (data.fa_name) approvalUpdates.FAName = data.fa_name;
    if (data.fa_dt_aprd) approvalUpdates.FADtAprd = data.fa_dt_aprd;
    
    if (data.qa_checker_id) approvalUpdates.QACheckerID = data.qa_checker_id;
    if (data.qa_checker_name) approvalUpdates.QACheckerName = data.qa_checker_name;
    if (data.qa_checker_dt_aprd) approvalUpdates.QACheckerDtAprd = data.qa_checker_dt_aprd;
    
    if (data.ds_approver_necessary) approvalUpdates.DSAppproverNecessary = data.ds_approver_necessary;
    if (data.design_approver_id) approvalUpdates.DesignApproverID = data.design_approver_id;
    if (data.design_approver_name) approvalUpdates.DesignApproverName = data.design_approver_name;
    if (data.design_approver_dt_aprd) approvalUpdates.DesignApproverDtAprd = data.design_approver_dt_aprd;
    if (data.ds_checker_necessary) approvalUpdates.DSCheckerNecessary = data.ds_checker_necessary;
    
    // Environmental Approval Logic: Either from Final stage radio ('YES'/'NO') or Evaluation checkbox ('1'/'0')
    if (data.envi_approver_necessary !== undefined || data.environmental_approval !== undefined) {
        let enviNecessary = existing.envi_approver_necessary || 'NO';
        if (data.envi_approver_necessary === 'YES' || data.envi_approver_necessary === 'NO') {
            enviNecessary = data.envi_approver_necessary;
        } else if (data.environmental_approval === '1' || data.environmental_approval === 1 || data.environmental_approval === true) {
            enviNecessary = 'YES';
        } else if (data.environmental_approval === '0' || data.environmental_approval === 0 || data.environmental_approval === false) {
            enviNecessary = 'NO';
        }
        approvalUpdates.EnviAppproverNecessary = enviNecessary;
        approvalUpdates.EnviCheckerNecessary = enviNecessary; // Legacy sync
    }
    
    if (data.envi_approver_id) approvalUpdates.EnviApproverID = data.envi_approver_id;
    if (data.envi_approve_name) approvalUpdates.EnviApproveName = data.envi_approve_name;
    if (data.envi_approve_dt_aprd) approvalUpdates.EnviApproveDtAprd = data.envi_approve_dt_aprd;
    
    // NEW: Add reviewer, checker, approver updates
    if (data.reviewer) approvalUpdates.Reviewer = data.reviewer;
    if (data.checker) approvalUpdates.Checker = data.checker;
    if (data.approver) approvalUpdates.Approver = data.approver;
    if (data.issue_date) approvalUpdates.IssueDate = data.issue_date;
    if (data.chkr_dt_aprd) approvalUpdates.ChkrDtAprd = data.chkr_dt_aprd;
    if (data.approver_dt_aprd) approvalUpdates.ApproverDtAprd = data.approver_dt_aprd;
    
    console.log('[5M1E Service] Approval updates built:', Object.keys(approvalUpdates));

    if (Object.keys(approvalUpdates).length > 0) {
      approvalUpdates.ModifiedDate = new Date();
      await fiveM1ERepository.updateApprovalStatus(
        existing.ControlNo,
        existing.approval_status || 'DRAFT',
        approvalUpdates,
      );
    }

    // Sync child tables (replace strategy)
    const cn = existing.ControlNo;
    if (data.parts) {
      await fiveM1ERepository.replaceParts(cn, data.parts);
    }
    if (data.attachments) {
      console.log(`[5M1E Service] Update - Processing ${data.attachments.length} attachment(s) with ${files.length} file(s)`);
      await fiveM1ERepository.replaceAttachments(cn, []); // Clear existing
      await this.processAttachments(cn, data.attachments, files); // Insert new with files
    }
    if (data.action_items) {
      await fiveM1ERepository.replaceActionItems(cn, data.action_items);
    }
    if (data.check_items) {
      if (files && files.length > 0) {
        data.check_items.forEach(item => {
          if (item.attribute_2 && typeof item.attribute_2 === 'string') {
             const uploadedFile = files.find(f => f.originalname === item.attribute_2);
             if (uploadedFile) {
               console.log(`[5M1E Service] Processing check_item attachment: ${item.attribute_2} -> ${uploadedFile.filename}`);
               item.attribute_2 = uploadedFile.path;
             }
          }
        });
      }
      await fiveM1ERepository.replaceCheckItems(cn, data.check_items);
    }
    if (data.status_remarks) {
      await fiveM1ERepository.replaceStatusRemarks(cn, data.status_remarks);
    }

    // Replace CC Notification List (delete & re-insert)
    if (data.cc_list !== undefined) {
      await db.deleteFrom('TBL_5M1E_CC' as any).where('ControlNo' as any, '=', cn).execute();
      for (const cc of data.cc_list) {
        const ccId = uuidv4();
        await db.insertInto('TBL_5M1E_CC' as any).values({
          ID: ccId,
          ControlNo: cn,
          UserID: cc.user_id,
          UpdateBy: _userId,
          LastUpdate: new Date(),
        }).execute();
      }
    }
    
    return {
      success: true,
      message: 'Application updated successfully',
      data: { controlNo }
    };
  }

  /**
   * Process attachments with file uploads
   * Matches uploaded files to attachment metadata by original filename
   */
  private async processAttachments(
    controlNo: string,
    attachments: Array<{ file_name?: string; fileName?: string; attribute_1?: string; attribute_2?: string; id?: string }>,
    files: any[]
  ) {
    for (const att of attachments) {
      const originalName = att.file_name || att.fileName;
      if (!originalName) {
        console.log('[5M1E Service] Skipping attachment with no filename');
        continue;
      }
      
      // Find the uploaded file that matches this attachment's original name
      const uploadedFile = files.find(f => f.originalname === originalName);
      const diskFileName = uploadedFile ? uploadedFile.filename : originalName;
      
      // Build remarks with original filename reference
      const baseRemarks = att.attribute_2 || '';
      const finalRemarks = baseRemarks 
        ? `${baseRemarks} (Original: ${originalName})`.slice(0, 200)
        : `Original: ${originalName}`.slice(0, 200);
      
      console.log(`[5M1E Service] Processing attachment: ${originalName} -> ${diskFileName}`);

      await fiveM1ERepository.insertAttachments(controlNo, [{
        id: att.id || undefined,
        file_name: diskFileName || 'Unknown',
        attribute_1: uploadedFile ? uploadedFile.path : (att.attribute_1 || null), // Store file path or URL
        attribute_2: finalRemarks,
      }]);
    }
  }

  /**
   * Deletes a 5M1E Application and all child tables
   */
  async deleteApplication(controlNo: string) {
    const existing = await fiveM1ERepository.findWithApproval(controlNo);
    if (!existing) {
      throw new NotFoundError(`5M1E Application ${controlNo} not found`);
    }

    const cn = existing.ControlNo;

    // Delete child tables first, then approval, then application
    await fiveM1ERepository.replaceParts(cn, []);
    await fiveM1ERepository.replaceAttachments(cn, []);
    await fiveM1ERepository.replaceActionItems(cn, []);
    await fiveM1ERepository.replaceCheckItems(cn, []);
    await fiveM1ERepository.deleteApproval(cn);
    await fiveM1ERepository.deleteByControlNo(cn);

    return { success: true, message: 'Application deleted successfully', data: { controlNo } };
  }

  /**
   * Workflow: Submit application (DRAFT → SUBMITTED)
   */
  async submitApplication(controlNo: string, _userId: string) {
    return fiveM1EWorkflowService.submitApplication(controlNo, _userId);
  }

  /**
   * Workflow: Check application (SUBMITTED → CHECKED)
   * Two-stage approval: Checker marks as reviewed, record stays on Awaiting Approval page
   */
  async checkApplication(controlNo: string, userId: string, remarks?: string) {
    return fiveM1EWorkflowService.checkApplication(controlNo, userId, remarks);
  }

  /**
   * Workflow: Approve application (SUBMITTED → APPROVED)
   */
  async approveApplication(controlNo: string, userId: string, remarks?: string, status: string = 'APPROVED') {
    return fiveM1EWorkflowService.approveApplication(controlNo, userId, remarks, status);
  }

  /**
   * Workflow: Reject application → REJECTED
   */
  async rejectApplication(controlNo: string, userId: string, remarks?: string) {
    return fiveM1EWorkflowService.rejectApplication(controlNo, userId, remarks);
  }

  /**
   * Workflow: Release application (APPROVED → RELEASE)
   */
  async releaseApplication(controlNo: string, _userId: string) {
    return fiveM1EWorkflowService.releaseApplication(controlNo, _userId);
  }
}

export const fiveM1EService = new FiveM1EService();
