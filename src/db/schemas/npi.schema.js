import { sql } from '../../config/db.js';

export const NpiLotSchema = {
    tableName: 'NPI_LOTS',
    primaryKey: 'npi_lot_id',
    columns: {
        npi_lot_id: { type: sql.VarChar, required: true },
        control_no: { type: sql.VarChar },
        datecreated: { type: sql.DateTime },
        site_id: { type: sql.VarChar },
        supplier_id: { type: sql.VarChar },
        part_id: { type: sql.VarChar },
        model_id: { type: sql.VarChar },
        lot_no: { type: sql.VarChar },
        lot_size: { type: sql.Int },
        invoice_no: { type: sql.VarChar },
        po_no: { type: sql.VarChar },
        inspectionmethod_id: { type: sql.VarChar },
        inspection_temp: { type: sql.Decimal },
        inspection_hum: { type: sql.Decimal },
        starttime: { type: sql.Int },
        endtime: { type: sql.Int },
        severity_id: { type: sql.VarChar },
        sample_size: { type: sql.Int },
        disposition_id: { type: sql.VarChar },
        inspection_date: { type: sql.DateTime },
        delivery_date: { type: sql.DateTime },
        inspected_by_id: { type: sql.VarChar },
        inspectioncat_id: { type: sql.VarChar },
        receivetime: { type: sql.Int },
        endorsetime: { type: sql.Int },
        data_verified_by_id: { type: sql.VarChar },
        inspector_id: { type: sql.VarChar },
        total_minor: { type: sql.Int },
        total_major: { type: sql.Int },
        total_critical: { type: sql.Int },
        ssi_accept: { type: sql.Bit },
        request_status: { type: sql.VarChar },
        last_update: { type: sql.DateTime },
        updateby: { type: sql.VarChar },
        rohs_verification: { type: sql.NVarChar },
        reference_mnr_no: { type: sql.NVarChar },
        inspector_remarks: { type: sql.NVarChar },
        checker_remarks: { type: sql.NVarChar },
        approver_remarks: { type: sql.NVarChar }
    }
};

export const NpiVisualCatSchema = {
    tableName: 'NPI_VISUALCAT',
    primaryKey: 'npi_visualcat_id',
    columns: {
        npi_visualcat_id: { type: sql.VarChar, required: true },
        npi_lot_id: { type: sql.VarChar, required: true }, // Parent
        defectclass_id: { type: sql.VarChar },
        defect_id: { type: sql.VarChar },
        quantity: { type: sql.Int },
        last_update: { type: sql.DateTime },
        updateby: { type: sql.VarChar }
    }
};

export const NpiDataCatSchema = {
    tableName: 'NPI_DATACAT',
    primaryKey: 'npi_datacat_id',
    columns: {
        npi_datacat_id: { type: sql.VarChar, required: true },
        npi_lot_id: { type: sql.VarChar, required: true },
        partdatacategory_name: { type: sql.VarChar },
        std_min: { type: sql.Decimal },
        std_max: { type: sql.Decimal },
        actual_min: { type: sql.Decimal },
        actual_max: { type: sql.Decimal },
        cpk: { type: sql.Decimal },
        remarks: { type: sql.NVarChar },
        last_update: { type: sql.DateTime },
        updateby: { type: sql.VarChar }
    }
};

export const NpiCCSchema = {
    tableName: 'NPI_CC',
    primaryKey: 'npi_cc_id',
    columns: {
        npi_cc_id: { type: sql.VarChar, required: true },
        npi_lot_id: { type: sql.VarChar, required: true },
        user_id: { type: sql.VarChar },
        last_update: { type: sql.DateTime },
        updateby: { type: sql.VarChar }
    }
};

export const NpiAttachmentSchema = {
    tableName: 'NPI_ATTACHMENT',
    primaryKey: 'npi_attachment_id',
    columns: {
        npi_attachment_id: { type: sql.VarChar, required: true },
        npi_lot_id: { type: sql.VarChar, required: true },
        file_name: { type: sql.NVarChar },
        remarks: { type: sql.NVarChar },
        last_update: { type: sql.DateTime },
        updateby: { type: sql.VarChar }
    }
};
