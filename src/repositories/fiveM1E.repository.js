import db, { sql } from '../config/db.js';
import { FIVE_M1E_QUERIES } from './queries/fiveM1E.queries.js';

export const fiveM1ERepository = {
    /**
     * Get next ID for a table
     * @param {string} tableName 
     * @param {sql.Transaction} transaction 
     * @param {string} idColumn 
     */
    async getNextId(tableName, transaction, idColumn = 'ID') {
        const request = new sql.Request(transaction);
        const query = `SELECT MAX(${idColumn}) as maxId FROM ${tableName}`;
        const result = await request.query(query);
        return (result.recordset[0].maxId || 0) + 1;
    },

    /**
     * Insert Application Record
     * @param {sql.Transaction} transaction 
     * @param {Object} data - SQL mapped object 
     */
    async insertApplication(transaction, data) {
        const request = new sql.Request(transaction);
        // Bind inputs
        Object.keys(data).forEach((key, index) => {
            request.input(`p${index}`, data[key]);
        });
        
        // Dynamic Insert assuming data keys match column order or explicit mapping
        // To be safe and aligned with legacy controller, we map explicitly:
        const requestExplicit = new sql.Request(transaction);
        requestExplicit.input('p1', data.ID);
        requestExplicit.input('p2', data.ControlNo);
        requestExplicit.input('p3', data.Title || 'Untitled');
        requestExplicit.input('p4', data.SupplierCN || 'UNK');
        requestExplicit.input('p5', data.ReportNo || '');
        requestExplicit.input('p6', data.SupplierID || null);
        requestExplicit.input('p7', data.VendorID || 'UNK');
        requestExplicit.input('p8', data.ItemID || 'UNK');
        requestExplicit.input('p9', data.SiteID || null);
        requestExplicit.input('p10', data.CommodityID || null);
        requestExplicit.input('p11', data.ImpactDate || 'N/A');
        requestExplicit.input('p12', data.DateRegister || null);
        requestExplicit.input('p13', data.CreatedBy);
        requestExplicit.input('p14', data.CreateDate);
        requestExplicit.input('p15', data.ModifiedDate);
        requestExplicit.input('p16', data.Attribute01 || '');
        requestExplicit.input('p17', data.EngineerRemarks || '');
        requestExplicit.input('p18', data.ModelID || null);
        requestExplicit.input('p19', data.Class || null);
        requestExplicit.input('p20', data.ClassType || null);

        await requestExplicit.query(`
            INSERT INTO TBL_5M1E_Application (
                ID, ControlNo, Title, SupplierCN, ReportNo, SupplierID,
                VendorID, ItemID, SiteID, CommodityID, 
                ImpactDate, DateRegister, CreatedBy, CreateDate, ModifiedDate,
                Attribute01, EngineerRemarks, ModelID, Class, ClassType
            ) VALUES (@p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8, @p9, @p10, @p11, @p12, @p13, @p14, @p15, @p16, @p17, @p18, @p19, @p20)
        `);
    },

    /**
     * Insert Approval Record
     * @param {sql.Transaction} transaction 
     * @param {Object} data 
     */
    async insertApproval(transaction, data) {
        const request = new sql.Request(transaction);
        request.input('a1', data.ID);
        request.input('a2', data.ControlNo);
        request.input('a3', data.Status);
        request.input('a4', data.CreateDate);
        request.input('a5', data.ModifiedDate);
        request.input('a6', data.DSCheckerNecessary);
        request.input('a7', data.DSAppproverNecessary);
        request.input('a8', data.EnviCheckerNecessary);
        request.input('a9', data.EnviAppproverNecessary);

        await request.query(`
            INSERT INTO TBL_5M1E_Approval (
                ID, ControlNo, Status, CreateDate, ModifiedDate,
                DSCheckerNecessary, DSAppproverNecessary,
                EnviCheckerNecessary, EnviAppproverNecessary
            ) VALUES (@a1, @a2, @a3, @a4, @a5, @a6, @a7, @a8, @a9)
        `);
    },

    /**
     * Insert Parts (Batch)
     * @param {sql.Transaction} transaction 
     * @param {Array} parts 
     */
    async insertParts(transaction, parts) {
        for (const part of parts) {
            const request = new sql.Request(transaction);
            request.input('pt1', part.TagID);
            request.input('pt2', part.ControlNo);
            request.input('pt3', part.part_id);
            request.input('pt4', part.DateAdded);
            await request.query(`INSERT INTO TBL_5M1E_PartsPerReport (TagID, PartsTag, part_id, DateAdded) VALUES (@pt1, @pt2, @pt3, @pt4)`);
        }
    },

    /**
     * Insert Attachments (Batch)
     * @param {sql.Transaction} transaction 
     * @param {Array} attachments 
     */
    async insertAttachments(transaction, attachments) {
        for (const att of attachments) {
            const request = new sql.Request(transaction);
            request.input('at1', att.ID);
            request.input('at2', att.ControlNo);
            request.input('at3', att.FileName);
            request.input('at4', att.CreateDate);
            request.input('at5', att.Attribute1);
            request.input('at6', att.Attribute2);
            await request.query(`INSERT INTO TBL_5M1E_Attachment (ID, ControlNo, FileName, CreateDate, Attribute1, Attribute2) VALUES (@at1, @at2, @at3, @at4, @at5, @at6)`);
        }
    },


// ... (methods)

    /**
     * Fetch Full Record (Joined with Master Tables)
     * @param {string} idOrControlNo 
     */
    async findFullRecord(idOrControlNo) {
        const [rows] = await db.query(FIVE_M1E_QUERIES.FIND_FULL_RECORD, [idOrControlNo, String(idOrControlNo)]);
        return rows[0] || null;
    },

    async findSubTables(controlNo) {
        const [parts] = await db.query(`
            SELECT ppr.*, p.part_code, p.part_name 
            FROM TBL_5M1E_PartsPerReport ppr
            LEFT JOIN dbo.PARTS p ON ppr.part_id = p.part_id
            WHERE ppr.PartsTag = ?
        `, [controlNo]);
        const [attachments] = await db.query('SELECT * FROM TBL_5M1E_Attachment WHERE ControlNo = ?', [controlNo]);
        const [actionItems] = await db.query('SELECT * FROM TBL_5M1E_ActionItems WHERE ControlNo = ?', [controlNo]);
        const [checkItems] = await db.query('SELECT * FROM TBL_5M1E_CheckItems WHERE ControlNo = ?', [controlNo]);
        return { parts, attachments, actionItems, checkItems };
    },

    async findAllRecords() {
        const [rows] = await db.query(FIVE_M1E_QUERIES.FIND_ALL_RECORDS);
        return rows;
    },

    async checkRecordExists(transaction, id) {
        const request = new sql.Request(transaction);
        request.input('id', id);
        const result = await request.query('SELECT ControlNo FROM TBL_5M1E_Application WHERE ControlNo = @id OR CAST(ID AS VARCHAR(50)) = @id');
        return result.recordset[0] || null;
    },

    async updateApplication(transaction, controlNo, updates) {
        const appUpdates = [];
        const request = new sql.Request(transaction);
        let pIndex = 0;

        Object.keys(updates).forEach(col => {
            if (updates[col] !== undefined) {
                appUpdates.push(`${col} = @ap${pIndex}`);
                request.input(`ap${pIndex}`, updates[col]);
                pIndex++;
            }
        });

        if (appUpdates.length > 0) {
            request.input('cn', controlNo);
            await request.query(`UPDATE TBL_5M1E_Application SET ${appUpdates.join(', ')} WHERE ControlNo = @cn`);
        }
    },

    async updateApproval(transaction, controlNo, updates) {
        const approvalUpdates = [];
        const request = new sql.Request(transaction);
        let pIndex = 0;

        Object.keys(updates).forEach(col => {
            if (updates[col] !== undefined) {
                approvalUpdates.push(`${col} = @apr${pIndex}`);
                request.input(`apr${pIndex}`, updates[col]);
                pIndex++;
            }
        });

        if (approvalUpdates.length > 0) {
            request.input('cn', controlNo);
            await request.query(`UPDATE TBL_5M1E_Approval SET ${approvalUpdates.join(', ')} WHERE ControlNo = @cn`);
        }
    },

    async insertCheckItems(transaction, checkItems) {
        for (const ci of checkItems) {
            const request = new sql.Request(transaction);
            request.input('ci1', ci.ID);
            request.input('ci2', ci.ControlNo);
            request.input('ci3', ci.CheckItem);
            request.input('ci4', ci.Judgement);
            request.input('ci5', ci.Remarks);
            request.input('ci6', ci.CreateDate);
            request.input('ci7', ci.Attribute1);
            request.input('ci8', ci.Attribute2);
            await request.query(`
                INSERT INTO TBL_5M1E_CheckItems (ID, ControlNo, CheckItem, Judgement, Remarks, CreateDate, Attribute1, Attribute2)
                VALUES (@ci1, @ci2, @ci3, @ci4, @ci5, @ci6, @ci7, @ci8)
            `);
        }
    },

    async insertActionItems(transaction, actionItems) {
        for (const ai of actionItems) {
            const request = new sql.Request(transaction);
            request.input('ai1', ai.ID);
            request.input('ai2', ai.ControlNo);
            request.input('ai3', ai.ActionItem);
            request.input('ai4', ai.FirstTargetDt);
            request.input('ai5', ai.PIC);
            request.input('ai6', ai.PICName);
            request.input('ai7', ai.VerificationResult);
            request.input('ai8', ai.Remarks);
            request.input('ai9', ai.CreateDate);
            await request.query(`
                INSERT INTO TBL_5M1E_ActionItems (ID, ControlNo, ActionItem, FirstTargetDt, PIC, PICName, VerificationResult, Remarks, CreateDate)
                VALUES (@ai1, @ai2, @ai3, @ai4, @ai5, @ai6, @ai7, @ai8, @ai9)
            `);
        }
    },

    async deleteChildRecords(transaction, tableName, controlNo, controlCol = 'ControlNo') {
        const request = new sql.Request(transaction);
        request.input('cn', controlNo);
        await request.query(`DELETE FROM ${tableName} WHERE ${controlCol} = @cn`);
    }
};
