import { fiveM1ERepository } from './fiveM1E.repository.js';
import { CreateFiveM1EInput, UpdateFiveM1EInput } from './fiveM1E.schema.js';
import { SmartMapper, MapperSchema } from '../../shared/infrastructure/SmartMapper.js';
import { FiveM1EApplicationTable, NewFiveM1EApp, FiveM1EAppUpdate } from './fiveM1E.db.types.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { v4 as uuidv4 } from 'uuid';

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
  async createApplication(data: CreateFiveM1EInput, userId: string) {
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
    if (data.envi_approver_necessary) approvalData.EnviAppproverNecessary = data.envi_approver_necessary;
    if (data.envi_approver_id) approvalData.EnviApproverID = data.envi_approver_id;
    if (data.envi_approve_name) approvalData.EnviApproveName = data.envi_approve_name;
    if (data.envi_checker_necessary) approvalData.EnviCheckerNecessary = data.envi_checker_necessary;
    if (data.qa_checker_id) approvalData.QACheckerID = data.qa_checker_id;
    if (data.qa_checker_name) approvalData.QACheckerName = data.qa_checker_name;
    if (data.final_approver) approvalData.FinalApprover = data.final_approver;
    if (data.fa_name) approvalData.FAName = data.fa_name;
    if (data.approval_seq !== undefined) approvalData.ApprovalSeq = data.approval_seq;

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
    if (data.attachments && data.attachments.length > 0) {
      await fiveM1ERepository.insertAttachments(cn, data.attachments);
    }
    if (data.action_items && data.action_items.length > 0) {
      await fiveM1ERepository.replaceActionItems(cn, data.action_items);
    }
    if (data.check_items && data.check_items.length > 0) {
      await fiveM1ERepository.replaceCheckItems(cn, data.check_items);
    }
    if (data.status_remarks && data.status_remarks.length > 0) {
      await fiveM1ERepository.replaceStatusRemarks(cn, data.status_remarks);
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
  async getAllApplications(status?: string) {
    const records = await fiveM1ERepository.findAllWithApproval(status);
    
    return records.map(record => {
      const dto = SmartMapper.toDTO(record as unknown as FiveM1EApplicationTable, applicationSchema);
      return {
        ...dto,
        id: record.ID,
        control_no: record.ControlNo,
        status: record.approval_status,
        mpd_pic: record.mpd_pic,
        mpd_approver: record.mpd_approver,
        created_at: record.CreateDate
      };
    });
  }

  /**
   * Retrieves a 5M1E Application with its full Approval + Child Tables
   */
  async getApplication(controlNo: string) {
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

    return {
      ...dto,
      id: record.ID,
      control_no: record.ControlNo,
      status: record.approval_status,
      // Approval fields (flat)
      mpd_pic: record.mpd_pic,
      mpd_approver: record.mpd_approver,
      mpd_approver_name: (record as any).MPDApproverName,
      mpd_checker: (record as any).MPDChecker,
      mpd_checker_name: (record as any).MPDCheckerName,
      hde_pic: (record as any).HDEPIC,
      evaluation_ic: (record as any).EvaluationIC,
      final_approver: (record as any).FinalApprover,
      fa_name: (record as any).FAName,
      approval_seq: (record as any).ApprovalSeq,
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
    };
  }

  /**
   * Updates an Application intelligently picking valid fields
   */
  async updateApplication(controlNo: string, data: UpdateFiveM1EInput) {
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
    if (data.status) approvalUpdates.Status = data.status;
    if (data.mpd_pic) approvalUpdates.MPDPIC = data.mpd_pic;
    if (data.mpd_approver) approvalUpdates.MPDApprover = data.mpd_approver;
    if (data.mpd_approver_name) approvalUpdates.MPDApproverName = data.mpd_approver_name;
    if (data.mpd_checker) approvalUpdates.MPDChecker = data.mpd_checker;
    if (data.mpd_checker_name) approvalUpdates.MPDCheckerName = data.mpd_checker_name;
    if (data.hde_pic) approvalUpdates.HDEPIC = data.hde_pic;
    if (data.evaluation_ic) approvalUpdates.EvaluationIC = data.evaluation_ic;
    if (data.final_approver) approvalUpdates.FinalApprover = data.final_approver;
    if (data.fa_name) approvalUpdates.FAName = data.fa_name;
    if (data.qa_checker_id) approvalUpdates.QACheckerID = data.qa_checker_id;
    if (data.qa_checker_name) approvalUpdates.QACheckerName = data.qa_checker_name;
    if (data.design_approver_id) approvalUpdates.DesignApproverID = data.design_approver_id;
    if (data.envi_approver_id) approvalUpdates.EnviApproverID = data.envi_approver_id;

    if (Object.keys(approvalUpdates).length > 0) {
      approvalUpdates.ModifiedDate = new Date();
      await fiveM1ERepository.updateApprovalStatus(existing.ControlNo, data.status || existing.approval_status || 'DRAFT', approvalUpdates);
    }

    // Sync child tables (replace strategy)
    const cn = existing.ControlNo;
    if (data.parts) {
      await fiveM1ERepository.replaceParts(cn, data.parts);
    }
    if (data.attachments) {
      await fiveM1ERepository.replaceAttachments(cn, data.attachments);
    }
    if (data.action_items) {
      await fiveM1ERepository.replaceActionItems(cn, data.action_items);
    }
    if (data.check_items) {
      await fiveM1ERepository.replaceCheckItems(cn, data.check_items);
    }
    if (data.status_remarks) {
      await fiveM1ERepository.replaceStatusRemarks(cn, data.status_remarks);
    }
    
    return {
      success: true,
      message: 'Application updated successfully',
      data: { controlNo }
    };
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
  async submitApplication(controlNo: string, userId: string) {
    const existing = await fiveM1ERepository.findWithApproval(controlNo);
    if (!existing) throw new NotFoundError(`5M1E Application ${controlNo} not found`);

    const currentStatus = existing.approval_status || 'DRAFT';
    if (currentStatus !== 'DRAFT') {
      throw new Error(`Cannot submit: application is in ${currentStatus}, expected DRAFT`);
    }

    await fiveM1ERepository.updateApprovalStatus(existing.ControlNo, 'SUBMITTED', {
      ModifiedDate: new Date(),
      ModifiedBy: userId,
    });
    return { success: true, message: 'Application submitted successfully', data: { controlNo } };
  }

  /**
   * Workflow: Approve application (SUBMITTED → APPROVED)
   */
  async approveApplication(controlNo: string, userId: string, remarks?: string) {
    const existing = await fiveM1ERepository.findWithApproval(controlNo);
    if (!existing) throw new NotFoundError(`5M1E Application ${controlNo} not found`);

    await fiveM1ERepository.updateApprovalStatus(existing.ControlNo, 'APPROVED', {
      ModifiedDate: new Date(),
      ModifiedBy: userId,
      ...(remarks ? { ApproverRemarks: remarks } : {}),
    });
    return { success: true, message: 'Application approved successfully', data: { controlNo } };
  }

  /**
   * Workflow: Reject application → REJECTED
   */
  async rejectApplication(controlNo: string, userId: string, remarks?: string) {
    const existing = await fiveM1ERepository.findWithApproval(controlNo);
    if (!existing) throw new NotFoundError(`5M1E Application ${controlNo} not found`);

    await fiveM1ERepository.updateApprovalStatus(existing.ControlNo, 'REJECTED', {
      ModifiedDate: new Date(),
      RejectedBy: userId,
      ...(remarks ? { RejectedRemarks: remarks } : {}),
    });
    return { success: true, message: 'Application rejected successfully', data: { controlNo } };
  }

  /**
   * Workflow: Release application (APPROVED → RELEASED)
   */
  async releaseApplication(controlNo: string, userId: string) {
    const existing = await fiveM1ERepository.findWithApproval(controlNo);
    if (!existing) throw new NotFoundError(`5M1E Application ${controlNo} not found`);

    await fiveM1ERepository.updateApprovalStatus(existing.ControlNo, 'RELEASED', {
      ModifiedDate: new Date(),
      ModifiedBy: userId,
    });
    return { success: true, message: 'Application released successfully', data: { controlNo } };
  }
}

export const fiveM1EService = new FiveM1EService();
