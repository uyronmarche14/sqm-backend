export const mapStatusToDB = (status) => {
  if (!status) return 'DR';
  const map = { 'DRAFT': 'DR', 'PENDING': 'PD', 'APPROVED': 'AP', 'REJECTED': 'RJ' };
  return map[status] || 'DR';
};

export const mapStatusFromDB = (code) => {
  if (!code) return 'DRAFT';
  const map = { 'DR': 'DRAFT', 'PD': 'PENDING', 'AP': 'APPROVED', 'RJ': 'REJECTED' };
  return map[code] || 'DRAFT';
};

export const safeDate = (dateStr) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
};

export const mapToDTO = (record) => {
  if (!record) return null;
  return {
    // Main
    npi_lot_id: record.npi_lot_id,
    control_no: record.control_no,
    datecreated: record.datecreated,
    request_status: record.request_status,
    
    // Refs
    site_id: record.site_id,
    supplier_id: record.supplier_id,
    part_id: record.part_id,
    model_id: record.model_id,
    partclass_id: record.partclass_id,
    parttype_id: record.parttype_id,
    
    // Details
    lot_no: record.lot_no,
    lot_size: record.lot_size,
    invoice_no: record.invoice_no,
    po_no: record.po_no,
    sample_size: record.sample_size,
    
    // Inspection
    inspectioncat_id: record.inspectioncat_id,
    inspectionmethod_id: record.inspectionmethod_id,
    inspection_date: record.inspection_date,
    delivery_date: record.delivery_date, // Added
    inspection_temp: record.inspection_temp,
    inspection_hum: record.inspection_hum,
    severity_id: record.severity_id,
    severity_seq: record.severity_seq,
    
    // Times
    starttime: record.starttime, // Added
    endtime: record.endtime, // Added
    receivetime: record.receivetime, // Added
    endorsetime: record.endorsetime, // Added
    
    // Disposition
    disposition_id: record.disposition_id,
    rohs_verification: record.rohs_verification,
    reference_mnr_no: record.reference_mnr_no,
    
    // People
    inspected_by_id: record.inspected_by_id,
    data_verified_by_id: record.data_verified_by_id,
    
    // Joined Names
    site_name: record.site_name,
    supplier_name: record.supplier_name,
    part_name: record.part_name,
    part_code: record.part_code,
    model_name: record.model_name,
    parttype_name: record.parttype_name,
    partclass_name: record.partclass_name,
    inspectionmethod_name: record.inspectionmethod_name,
    inspectioncat_name: record.inspectioncat_name,
    severity_name: record.severity_name,
    disposition_name: record.disposition_name,
    inspected_by_name: record.inspected_by_name,
    data_verified_by_name: record.data_verified_by_name,
    checker_name: record.checker_name,
    approver_name: record.approver_name,
    
    // Child Arrays (if joined/stitched)
    attachments: record.attachments || [],
    visual_categories: record.visual_categories || [],
    data_categories: record.data_categories || [],
    cc_list: record.cc_list || []
  };
};
