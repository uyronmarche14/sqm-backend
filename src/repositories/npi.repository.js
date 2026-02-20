import { getPool as getDb, sql } from '../config/db.js';
import { BaseRepository } from './base.repository.js';
import { 
    NpiLotSchema, 
    NpiVisualCatSchema, 
    NpiDataCatSchema, 
    NpiCCSchema, 
    NpiAttachmentSchema 
} from '../db/schemas/npi.schema.js';

class NpiRepository extends BaseRepository {
    constructor() {
        super(NpiLotSchema);
        // Child Repos could be separate, but for simplicity we instantiate Helpers here
        this.visualRepo = new BaseRepository(NpiVisualCatSchema);
        this.dataRepo = new BaseRepository(NpiDataCatSchema);
        this.ccRepo = new BaseRepository(NpiCCSchema);
        this.attRepo = new BaseRepository(NpiAttachmentSchema);
    }
    
    // --- Reads (Custom Queries still needed for Joins) ---

    async findFullRecord(id) {
        const pool = await getDb();
        const result = await pool.request()
            .input('id', sql.VarChar, id)
            .query(`
                SELECT 
                n.npi_lot_id, n.control_no, n.datecreated, n.inspectioncat_id, n.site_id, 
                n.supplier_id, n.model_id, n.part_id, n.lot_no, n.lot_size, n.invoice_no, 
                n.po_no, n.sample_size, n.severity_id, n.severity_seq, n.inspectionmethod_id, 
                n.inspection_date, n.inspection_temp, n.inspection_hum, n.delivery_date, 
                n.rohs_verification, n.reference_mnr_no, n.disposition_id, n.inspected_by_id, 
                n.data_verified_by_id, n.remarks, n.inspector_remarks, n.inspector_id, 
                n.submitted_date, n.checker_remarks, n.checker_id, n.checked_date, 
                n.approver_remarks, n.approver_id, n.approved_date, n.last_update, n.updateby, 
                n.request_status, n.total_minor, n.total_major, n.total_critical, n.ssi_accept, 
                n.ogi_ref_no, n.judgment, n.starttime, n.endtime, n.receivetime, n.endorsetime, 
                n.visual_judgment,
                s.site_name,
                sup.supplier_name,
                p.part_name,
                p.part_code,
                p.partclass_id,
                p.parttype_id,
                m.model_name,
                pt.parttype_name,
                pc.partclass_name,
                im.inspectionmethod_name,
                ic.inspectioncat_name,
                sev.severity_name,
                disp.disposition_name,
                insp.inspector_name AS inspected_by_name,
                verifier.inspector_name AS data_verified_by_name
                FROM NPI_LOTS n
                LEFT JOIN MFG_SITES s ON n.site_id = s.site_id
                LEFT JOIN SUPPLIERS sup ON n.supplier_id = sup.supplier_id
                LEFT JOIN PARTS p ON n.part_id = p.part_id
                LEFT JOIN MODELS m ON n.model_id = m.model_id
                LEFT JOIN PARTTYPES pt ON p.parttype_id = pt.parttype_id
                LEFT JOIN PARTCLASS pc ON p.partclass_id = pc.partclass_id
                LEFT JOIN INSPECTIONMETHODS im ON n.inspectionmethod_id = im.inspectionmethod_id
                LEFT JOIN INSPECTIONCATEGORIES ic ON n.inspectioncat_id = ic.inspectioncat_id
                LEFT JOIN SEVERITY sev ON n.severity_id = sev.severity_id
                LEFT JOIN DISPOSITIONS disp ON n.disposition_id = disp.disposition_id
                LEFT JOIN INSPECTORS insp ON n.inspected_by_id = insp.inspector_id
                LEFT JOIN INSPECTORS verifier ON n.data_verified_by_id = verifier.inspector_id
                WHERE 
                    n.control_no = @id 
                    OR (TRY_CONVERT(UNIQUEIDENTIFIER, @id) IS NOT NULL AND n.npi_lot_id = @id)
            `);
        return result.recordset[0] || null;
    }

    async findChildren(npiId) {
        const pool = await getDb();
        // We could genericize Select * too in base repo, but filters are specific
        const atts = await pool.request().input('id', npiId).query('SELECT * FROM NPI_ATTACHMENT WHERE npi_lot_id = @id');
        const visual = await pool.request().input('id', npiId).query('SELECT * FROM NPI_VISUALCAT WHERE npi_lot_id = @id');
        const dataCat = await pool.request().input('id', npiId).query('SELECT * FROM NPI_DATACAT WHERE npi_lot_id = @id');
        const ccList = await pool.request().input('id', npiId).query(`
            SELECT cc.*, i.inspector_name as user_name 
            FROM NPI_CC cc 
            LEFT JOIN INSPECTORS i ON cc.user_id = i.inspector_id 
            WHERE cc.npi_lot_id = @id
        `);
        
        return {
            attachments: atts.recordset,
            visual_categories: visual.recordset,
            data_categories: dataCat.recordset,
            cc_list: ccList.recordset
        };
    }

    async findAllRecords(filters = {}) {
        const pool = await getDb();
        const request = pool.request();

        console.log('[NPI-BE] findAllRecords filters:', filters);

        let whereClause = '1=1';

        if (filters.siteId && filters.siteId !== 'all') {
            whereClause += ' AND n.site_id = @siteId';
            request.input('siteId', sql.VarChar, filters.siteId);
        }
        if (filters.supplierId && filters.supplierId !== 'all') {
             whereClause += ' AND n.supplier_id = @supplierId';
             request.input('supplierId', sql.VarChar, filters.supplierId);
        }
        if (filters.partCode && filters.partCode !== 'all') {
             whereClause += ' AND (p.part_code = @partCode OR n.part_id = @partCode)';
             request.input('partCode', sql.VarChar, filters.partCode);
        }
        // Date Logic (Generic Start/End)
        if (filters.startDate) {
            whereClause += ' AND n.datecreated >= @startDate';
            request.input('startDate', sql.DateTime, new Date(filters.startDate));
        }
        if (filters.endDate) {
            whereClause += ' AND n.datecreated <= @endDate';
            request.input('endDate', sql.DateTime, new Date(filters.endDate));
        }

        const query = `
            SELECT 
                n.npi_lot_id, n.control_no, n.datecreated, n.inspectioncat_id, n.site_id, 
                n.supplier_id, n.model_id, n.part_id, n.lot_no, n.lot_size, n.invoice_no, 
                n.po_no, n.sample_size, n.severity_id, n.severity_seq, n.inspectionmethod_id, 
                n.inspection_date, n.inspection_temp, n.inspection_hum, n.delivery_date, 
                n.rohs_verification, n.reference_mnr_no, n.disposition_id, n.inspected_by_id, 
                n.data_verified_by_id, n.remarks, n.inspector_remarks, n.inspector_id, 
                n.submitted_date, n.checker_remarks, n.checker_id, n.checked_date, 
                n.approver_remarks, n.approver_id, n.approved_date, n.last_update, n.updateby, 
                n.request_status, n.total_minor, n.total_major, n.total_critical, n.ssi_accept, 
                n.ogi_ref_no, n.judgment, n.starttime, n.endtime, n.receivetime, n.endorsetime, 
                n.visual_judgment,
                (
                    SELECT 
                        vc.npi_visualcat_id, vc.defectclass_id, vc.defect_id, vc.quantity 
                    FROM NPI_VISUALCAT vc 
                    WHERE vc.npi_lot_id = n.npi_lot_id 
                    FOR JSON PATH
                ) AS visual_categories_json,
                (
                    SELECT 
                        dc.npi_datacat_id, dc.partdatacategory_name, dc.std_min, dc.std_max, 
                        dc.actual_min, dc.actual_max, dc.cpk, dc.remarks 
                    FROM NPI_DATACAT dc 
                    WHERE dc.npi_lot_id = n.npi_lot_id 
                    FOR JSON PATH
                ) AS data_categories_json,
                (
                    SELECT 
                        dic.npi_dimensioncat_id, dic.partdimensioncategory_name, dic.std_min, dic.std_max, 
                        dic.actual_min, dic.actual_max, dic.cpk, dic.remarks 
                    FROM NPI_DIMENSIONCAT dic 
                    WHERE dic.npi_lot_id = n.npi_lot_id 
                    FOR JSON PATH
                ) AS dimension_categories_json,
                s.site_name,
                sup.supplier_name,
                p.part_name,
                p.part_code,
                p.partclass_id,
                p.parttype_id,
                m.model_name,
                pt.parttype_name,
                   pc.partclass_name,
                im.inspectionmethod_name,
                ic.inspectioncat_name,
                sev.severity_name,
                disp.disposition_name,
                insp.inspector_name AS inspected_by_name,
                verifier.inspector_name AS data_verified_by_name,
                checker.inspector_name AS checker_name,
                approver.inspector_name AS approver_name
            FROM NPI_LOTS n
            LEFT JOIN MFG_SITES s ON n.site_id = s.site_id
            LEFT JOIN SUPPLIERS sup ON n.supplier_id = sup.supplier_id
            LEFT JOIN PARTS p ON n.part_id = p.part_id
            LEFT JOIN MODELS m ON n.model_id = m.model_id
            LEFT JOIN PARTTYPES pt ON p.parttype_id = pt.parttype_id
            LEFT JOIN PARTCLASS pc ON p.partclass_id = pc.partclass_id
            LEFT JOIN INSPECTIONMETHODS im ON n.inspectionmethod_id = im.inspectionmethod_id
            LEFT JOIN INSPECTIONCATEGORIES ic ON n.inspectioncat_id = ic.inspectioncat_id
            LEFT JOIN SEVERITY sev ON n.severity_id = sev.severity_id
            LEFT JOIN DISPOSITIONS disp ON n.disposition_id = disp.disposition_id
            LEFT JOIN INSPECTORS insp ON n.inspected_by_id = insp.inspector_id
            LEFT JOIN INSPECTORS verifier ON n.data_verified_by_id = verifier.inspector_id
            LEFT JOIN INSPECTORS checker ON n.checker_id = checker.inspector_id
            LEFT JOIN INSPECTORS approver ON n.approver_id = approver.inspector_id
            WHERE ${whereClause}
            ORDER BY n.datecreated DESC
        `;

        const result = await request.query(query);
        
        return result.recordset.map(row => ({
            ...row,
            visual_categories: row.visual_categories_json ? JSON.parse(row.visual_categories_json) : [],
            data_categories: row.data_categories_json ? JSON.parse(row.data_categories_json) : [],
            dimension_categories: row.dimension_categories_json ? JSON.parse(row.dimension_categories_json) : []
        }));
    }

    async getNextSequence(prefix) {
        const pool = await getDb();
        const result = await pool.request()
            .input('prefix', sql.VarChar, `${prefix}%`)
            .query(`SELECT TOP 1 control_no FROM NPI_LOTS WHERE control_no LIKE @prefix ORDER BY control_no DESC`);
        return result.recordset[0]?.control_no || null;
    }
    
    async findDefaultInspector() {
        const pool = await getDb();
        const result = await pool.request().query('SELECT TOP 1 inspector_id FROM dbo.INSPECTORS WHERE active_flag = 1');
        return result.recordset[0]?.inspector_id || null;
    }

    async resolveId(transaction, idOrControl) {
        const request = new sql.Request(transaction);
        request.input('q', idOrControl);
        const result = await request.query('SELECT npi_lot_id FROM NPI_LOTS WHERE npi_lot_id = @q OR control_no = @q');
        return result.recordset[0]?.npi_lot_id;
    }
    
    // --- Stats ---
    async getStats() {
        const pool = await getDb();
        const result = await pool.request().query(`
            SELECT request_status AS status, COUNT(*) AS count 
            FROM NPI_LOTS GROUP BY request_status
        `);
        return result.recordset;
    }
}

export const npiRepository = new NpiRepository();
