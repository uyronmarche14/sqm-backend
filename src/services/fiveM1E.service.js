import db, { sql } from '../config/db.js';
import { fiveM1ERepository } from '../repositories/fiveM1E.repository.js';
import { mapToDTO, mapToSQL } from '../utils/fiveM1E.mapper.js';

const generateControlNo = async () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TMP-${year}-${random}`;
};

export const fiveM1EService = {
    /**
     * Create a new Draft Record
     */
    async createDraft(data, userId) {
        const pool = await db.getPool();
        const transaction = new sql.Transaction(pool);
        
        try {
            await transaction.begin();
            
            // 1. Prepare Data
            const appId = await fiveM1ERepository.getNextId('TBL_5M1E_Application', transaction, 'ID');
            const approvalId = await fiveM1ERepository.getNextId('TBL_5M1E_Approval', transaction);
            const controlNo = await generateControlNo();
            const now = new Date();
            
            const initialDto = { ...data, control_no: controlNo };
            const { app: mapApp } = mapToSQL(initialDto);

            // 2. Insert Application
            const appData = {
                ID: appId,
                ControlNo: controlNo,
                Title: mapApp.Title || 'Untitled',
                SupplierCN: mapApp.SupplierCN || 'UNK',
                ReportNo: mapApp.ReportNo || '',
                SupplierID: mapApp.SupplierID || null,
                VendorID: mapApp.VendorID || 'UNK',
                ItemID: mapApp.ItemID || 'UNK',
                SiteID: mapApp.SiteID || null,
                CommodityID: mapApp.CommodityID || null,
                ImpactDate: mapApp.ImpactDate || 'N/A',
                DateRegister: mapApp.DateRegister || null,
                CreatedBy: userId,
                CreateDate: now,
                ModifiedDate: now,
                Attribute01: mapApp.Attribute01 || '',
                EngineerRemarks: mapApp.EngineerRemarks || '',
                ModelID: mapApp.ModelID || null,
                Class: mapApp.Class || null,
                ClassType: mapApp.ClassType || null
            };
            await fiveM1ERepository.insertApplication(transaction, appData);

            // 3. Insert Approval (Default Draft)
            const approvalData = {
                ID: approvalId,
                ControlNo: controlNo,
                Status: 'DRAFT',
                CreateDate: now,
                ModifiedDate: now,
                DSCheckerNecessary: 'NO',
                DSAppproverNecessary: 'NO',
                EnviCheckerNecessary: 'NO',
                EnviAppproverNecessary: 'NO'
            };
            await fiveM1ERepository.insertApproval(transaction, approvalData);

            // 4. Insert Parts
            if (data.parts && Array.isArray(data.parts)) {
                let nextPartId = await fiveM1ERepository.getNextId('TBL_5M1E_PartsPerReport', transaction, 'TagID');
                const partsData = data.parts.map(p => ({
                    TagID: nextPartId++,
                    ControlNo: controlNo,
                    part_id: p.part_id || 'UNK',
                    DateAdded: now
                }));
                await fiveM1ERepository.insertParts(transaction, partsData);
            }

            // 5. Insert Attachments
            if (data.attachments && Array.isArray(data.attachments)) {
                let nextAttId = await fiveM1ERepository.getNextId('TBL_5M1E_Attachment', transaction, 'ID');
                const attData = data.attachments.map(att => ({
                    ID: nextAttId++,
                    ControlNo: controlNo,
                    FileName: att.file_name || 'Unknown',
                    CreateDate: now,
                    Attribute1: att.attribute_1 || '',
                    Attribute2: att.attribute_2 || ''
                }));
                await fiveM1ERepository.insertAttachments(transaction, attData);
            }

            // 6. Insert Check Items (Multi-type)
            if (data.check_items && Array.isArray(data.check_items)) {
                let nextCheckId = await fiveM1ERepository.getNextId('TBL_5M1E_CheckItems', transaction, 'ID');
                const checkData = data.check_items.map(ci => ({
                    ID: nextCheckId++,
                    ControlNo: controlNo,
                    CheckItem: ci.check_item,
                    Judgement: ci.judgement || 'NA',
                    Remarks: ci.remarks || '',
                    CreateDate: now,
                    Attribute1: ci.attribute_1 || 'REVIEW',
                    Attribute2: ci.attribute_2 || ''
                }));
                await fiveM1ERepository.insertCheckItems(transaction, checkData);
            }

            // 7. Insert Action Items
            if (data.action_items && Array.isArray(data.action_items)) {
                let nextActionId = await fiveM1ERepository.getNextId('TBL_5M1E_ActionItems', transaction, 'ID');
                const actionData = data.action_items.map(ai => ({
                    ID: nextActionId++,
                    ControlNo: controlNo,
                    ActionItem: ai.action_item,
                    FirstTargetDt: ai.first_target_dt,
                    PIC: ai.pic,
                    PICName: ai.pic_name,
                    VerificationResult: ai.verification_result || 'PENDING',
                    Remarks: ai.remarks || '',
                    CreateDate: now
                }));
                await fiveM1ERepository.insertActionItems(transaction, actionData);
            }

            await transaction.commit();
            
            // 8. Return Full Record
            return await this.getRecord(controlNo);

        } catch (error) {
            if (transaction.active) await transaction.rollback();
            throw error;
        }
    },

    /**
     * Get Record by ID or Control No
     */
    async getRecord(idOrControlNo) {
        const row = await fiveM1ERepository.findFullRecord(idOrControlNo);
        if (!row) return null;

        // Clean up row mapping (array check from legacy code)
        const cleanRow = {};
        Object.keys(row).forEach(key => {
            cleanRow[key] = Array.isArray(row[key]) ? row[key][0] : row[key];
        });

        const subTables = await fiveM1ERepository.findSubTables(cleanRow.ControlNo);
        
        return mapToDTO(
            cleanRow, 
            subTables.parts, 
            cleanRow, 
            subTables.attachments, 
            subTables.actionItems, 
            subTables.checkItems
        );
    },

    /**
     * Get All Records
     */
    async getAllRecords() {
        const rows = await fiveM1ERepository.findAllRecords();
        return rows.map(row => mapToDTO(row, [], row, []));
    },

    /**
     * Update Existing Record
     */
    async updateRecord(id, data, userId) {
        const pool = await db.getPool();
        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();

            // 1. Check Existence
            const existing = await fiveM1ERepository.checkRecordExists(transaction, id);
            if (!existing) {
                await transaction.rollback();
                return null; // Check for null in controller
            }
            const controlNo = existing.ControlNo;
            const now = new Date();

            // 2. Process Data
            const { app: mapApp, approval: mapApproval } = mapToSQL(data);
            
            // --- Application Updates ---
            const appAllowedCols = [
                'Title', 'SupplierCN', 'ReportNo', 'SupplierID', 'ItemID', 'ImpactDate', 'DateRegister',
                'SiteID', 'CommodityID', 'EngineerRemarks', 'Attribute01', 'Attribute02', 'Attribute03', 
                'Attribute04', 'Attribute05', 'Attribute06', 'Attribute07', 'Attribute08', 'Attribute09', 'Attribute10',
                'ModelID', 'Class', 'ClassType'
            ];

            const appUpdates = {};
            appAllowedCols.forEach(col => {
                if (mapApp[col] !== undefined) {
                    appUpdates[col] = mapApp[col];
                }
            });

            // --- Approval Updates ---
            const approvalAllowedCols = [
                'Status', 'ModifiedDate', 
                'MPDPIC', 'MPDChecker', 'MPDCheckerName', 'MPDCheckerStatus', 'MPDChkrDtAprd',
                'MPDApprover', 'MPDApproverName', 'MPDApproverStatus', 'MPDAprDtAprd',
                'HDEPIC', 'Reviewer', 'ReviewerName', 'ReviewerStatus', 'IssueDate',
                'Checker', 'CheckerName', 'ChkrDtAprd', 'ChkrStatus',
                'Approver', 'ApproverName', 'ApproverDtAprd', 'AprStatus',
                'FinalApprover', 'FAName', 'FADtAprd', 'FAStatus',
                'ApprovalSeq', 'RevisedSequence', 'CR',
                'RejectedBy', 'RejectedDate',
                'DSCheckerNecessary', 'DesignCheckerID', 'DesignCheckerName', 'DesignCheckerStatus', 'DesignCheckerDtAprd',
                'DSAppproverNecessary', 'DesignApproverID', 'DesignApproverName', 'DesignApproverStatus', 'DesignApproverDtAprd',
                'EnviCheckerNecessary', 'EnviCheckerID', 'EnviCheckerName', 'EnviCheckerStatus', 'EnviCheckerDtAprd',
                'EnviAppproverNecessary', 'EnviApproverID', 'EnviApproveName', 'EnviApproveStatus', 'EnviApproveDtAprd',
                'QACheckerID', 'QACheckerName', 'QACheckerStatus', 'QACheckerDtAprd',
                'EvaluationIC', 'EvaluationICName', 'EvaluationICDtAprd', 'EvaluationICStatus'
            ];

            const approvalUpdates = { ...mapApproval, ModifiedDate: now };

            // 3. Execute Core Updates
            if (Object.keys(appUpdates).length > 0) {
                await fiveM1ERepository.updateApplication(transaction, controlNo, appUpdates);
            }
            await fiveM1ERepository.updateApproval(transaction, controlNo, approvalUpdates);

            // 4. Sync Child Tables (Pattern: Clear and Re-insert)
            
            // Sync Parts
            if (data.parts) {
                await fiveM1ERepository.deleteChildRecords(transaction, 'TBL_5M1E_PartsPerReport', controlNo, 'PartsTag');
                let nextPartId = await fiveM1ERepository.getNextId('TBL_5M1E_PartsPerReport', transaction, 'TagID');
                const partsData = data.parts.map(p => ({
                    TagID: nextPartId++,
                    ControlNo: controlNo,
                    part_id: p.part_id,
                    DateAdded: now
                }));
                if (partsData.length > 0) await fiveM1ERepository.insertParts(transaction, partsData);
            }

            // Sync Attachments
            if (data.attachments) {
                await fiveM1ERepository.deleteChildRecords(transaction, 'TBL_5M1E_Attachment', controlNo);
                let nextAttId = await fiveM1ERepository.getNextId('TBL_5M1E_Attachment', transaction, 'ID');
                const attData = data.attachments.map(att => ({
                    ID: nextAttId++,
                    ControlNo: controlNo,
                    FileName: att.file_name,
                    CreateDate: now,
                    Attribute1: att.attribute_1,
                    Attribute2: att.attribute_2
                }));
                if (attData.length > 0) await fiveM1ERepository.insertAttachments(transaction, attData);
            }

            // Sync Check Items
            if (data.check_items) {
                await fiveM1ERepository.deleteChildRecords(transaction, 'TBL_5M1E_CheckItems', controlNo);
                let nextCheckId = await fiveM1ERepository.getNextId('TBL_5M1E_CheckItems', transaction, 'ID');
                const checkData = data.check_items.map(ci => ({
                    ID: nextCheckId++,
                    ControlNo: controlNo,
                    CheckItem: ci.check_item,
                    Judgement: ci.judgement || 'NA',
                    Remarks: ci.remarks || '',
                    CreateDate: now,
                    Attribute1: ci.attribute_1,
                    Attribute2: ci.attribute_2
                }));
                if (checkData.length > 0) await fiveM1ERepository.insertCheckItems(transaction, checkData);
            }

            // Sync Action Items
            if (data.action_items) {
                await fiveM1ERepository.deleteChildRecords(transaction, 'TBL_5M1E_ActionItems', controlNo);
                let nextActionId = await fiveM1ERepository.getNextId('TBL_5M1E_ActionItems', transaction, 'ID');
                const actionData = data.action_items.map(ai => ({
                    ID: nextActionId++,
                    ControlNo: controlNo,
                    ActionItem: ai.action_item,
                    FirstTargetDt: ai.first_target_dt,
                    PIC: ai.pic,
                    PICName: ai.pic_name,
                    VerificationResult: ai.verification_result || 'PENDING',
                    Remarks: ai.remarks || '',
                    CreateDate: now
                }));
                if (actionData.length > 0) await fiveM1ERepository.insertActionItems(transaction, actionData);
            }

            await transaction.commit();
            return { controlNo };

        } catch (error) {
            if (transaction.active) await transaction.rollback();
            throw error;
        }
    }
};
