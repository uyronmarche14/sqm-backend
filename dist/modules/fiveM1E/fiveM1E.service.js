import { fiveM1ERepository } from './fiveM1E.repository.js';
import { SmartMapper } from '../../shared/infrastructure/SmartMapper.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
/**
 * 5M1E Domain Service
 * Encapsulates core business logic and mapping.
 */
// Define mapping explicitly to automate DTO to Database translations
// We map input to TBL_5M1E_Application (omitting status, which belongs to Approval)
const applicationSchema = {
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
};
export class FiveM1EService {
    /**
     * Creates a new 5M1E Application and its initial Approval state
     */
    async createApplication(data, userId) {
        // 1. Generate temp control number (In production, a sequence system replaces this)
        const controlNo = '5M-' + process.hrtime()[1];
        // 2. Automap Frontend Fields to DB Columns using SmartMapper
        const dbData = SmartMapper.toDB(data, applicationSchema);
        dbData.ControlNo = controlNo;
        dbData.CreatedBy = userId;
        dbData.CreateDate = new Date();
        // 3. Transactional Insert across tables
        const newRecord = await fiveM1ERepository.createWithApproval(dbData, data.status || 'DRAFT');
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
    async getAllApplications(status) {
        const records = await fiveM1ERepository.findAllWithApproval(status);
        return records.map(record => {
            const dto = SmartMapper.toDTO(record, applicationSchema);
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
     * Retrieves a 5M1E Application with its Status
     */
    async getApplication(controlNo) {
        const record = await fiveM1ERepository.findWithApproval(controlNo);
        if (!record) {
            throw new NotFoundError(`5M1E Application ${controlNo} not found`);
        }
        // SmartMap back to frontend standard DTO payload
        const dto = SmartMapper.toDTO(record, applicationSchema);
        return {
            ...dto,
            id: record.ID,
            control_no: record.ControlNo,
            status: record.approval_status,
            mpd_pic: record.mpd_pic,
            mpd_approver: record.mpd_approver,
        };
    }
    /**
     * Updates an Application intelligently picking valid fields
     */
    async updateApplication(controlNo, data) {
        const existing = await fiveM1ERepository.findWithApproval(controlNo);
        if (!existing) {
            throw new NotFoundError(`5M1E Application ${controlNo} not found`);
        }
        const updateDbData = SmartMapper.toDB(data, applicationSchema);
        // Only execute update if there are fields to change
        if (Object.keys(updateDbData).length > 0) {
            await fiveM1ERepository.updateByControlNo(controlNo, updateDbData);
        }
        return {
            success: true,
            message: 'Application updated successfully'
        };
    }
}
export const fiveM1EService = new FiveM1EService();
