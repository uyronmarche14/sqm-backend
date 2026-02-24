import { getPool as getDb } from '../config/db.js';
import sql from 'mssql';
import crypto from 'crypto'; // Needed for randomUUID if not using uuid v4

// Status Mapping Helpers (Matching MNR Pattern for consistency)
const mapStatusToDB = (status) => {
  if (!status) return 'DR';
  const map = {
      'DRAFT': 'DR',
      'SUBMITTED': 'SB'
  };
  return map[status] || 'DR';
};

const mapStatusFromDB = (code) => {
  if (!code) return 'DRAFT';
  const map = {
      'DR': 'DRAFT',
      'SB': 'SUBMITTED'
  };
  return map[code] || 'DRAFT';
};

/**
 * Safely parses a JSON string field from FormData.
 * Multer doesn't parse JSON strings automatically.
 */
const parseJsonField = (field) => {
    if (typeof field === 'string') {
        try {
            return JSON.parse(field);
        } catch (e) {
            console.error('❌ [OGI Controller] Failed to parse JSON field:', e.message);
            return [];
        }
    }
    return field || [];
};

const mapToDTO = (record) => {
  if (!record) return null;
  return {
    ogi_id: record.ogi_id,
    control_no: record.control_no,
    request_status: mapStatusFromDB(record.request_status), 
    
    // Controls
    upload_date: record.upload_date,
    submit_date: record.submit_date,
    
    // Main Details
    site_id: record.site_id,
    supplier_id: record.supplier_id,
    part_id: record.part_id, 
    remarks: record.remarks,

    // Joined Fields (Names)
    site_name: record.site_name,
    supplier_name: record.supplier_name,
    part_code: record.part_code,
    part_name: record.part_name,
    
    // Audit 
    incharge_id: record.incharge_id, 
    last_update: record.last_update,
    updateby: record.updateby,
    
    // Nested Data 
    lots: record.lots || [],
    attachments: record.attachments || []
  };
};

export const getAllRecords = async (req, res) => {
  try {
    const pool = await getDb();
    
    // 1. Fetch Main Records (Limited to last 100 for performance if needed, but fetching all for now)
    const result = await pool.request().query(`
      SELECT 
        o.*,
        s.site_name as site_name,
        sup.supplier_name as supplier_name,
        p.part_code as part_code,
        p.part_name as part_name
      FROM OGI o
      LEFT JOIN MFG_SITES s ON o.site_id = s.site_id
      LEFT JOIN SUPPLIERS sup ON o.supplier_id = sup.supplier_id
      LEFT JOIN PARTS p ON o.part_id = p.part_id
      ORDER BY o.upload_date DESC
    `);
    
    let records = result.recordset;
    
    if (records.length > 0) {
        // 2. Fetch Children in Bulk (Efficiency)
        // Note: For very large datasets, pagination is preferred.
        // Given this is a draft/list, we assume reasonable size or will add limit later.
        
        // Fetch Lots
        const lotsResult = await pool.request().query(`
            SELECT * FROM OGI_LOTS 
            WHERE ogi_id IN (SELECT ogi_id FROM OGI)
            ORDER BY ogi_id
        `);
        const allLots = lotsResult.recordset;

        // Fetch Attachments
        const attsResult = await pool.request().query(`
            SELECT * FROM OGI_ATTACHMENT
            WHERE ogi_id IN (SELECT ogi_id FROM OGI)
        `);
        const allAtts = attsResult.recordset;

        // 3. Stitch Data
        records = records.map(r => {
            const rLots = allLots.filter(l => l.ogi_id === r.ogi_id).map(l => ({
                ogi_lot_id: l.ogi_lot_id,
                lot_no: l.lot_no,
                invoice_no: l.invoice_no,
                lot_size: l.lot_size
            }));
            
            const rAtts = allAtts.filter(a => a.ogi_id === r.ogi_id).map(a => ({
                ogi_attachment_id: a.ogi_attachment_id,
                file_name: a.file_name,
                updateby: a.updateby,
                remarks: a.remarks
            }));

            return {
                ...r,
                lots: rLots,
                attachments: rAtts
            };
        });
    }

    const dtos = records.map(mapToDTO);
    res.json(dtos);
  } catch (error) {
    console.error('Error fetching OGI records:', error);
    res.status(500).json({ message: 'Failed to fetch OGI records' });
  }
};

export const getRecordById = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getDb();
    
    // Main Record
    const result = await pool.request()
        .input('id', sql.VarChar, id)
        .query(`
            SELECT 
                o.*,
                s.site_name as site_name,
                sup.supplier_name as supplier_name,
                p.part_code as part_code,
                p.part_name as part_name
            FROM OGI o
            LEFT JOIN MFG_SITES s ON o.site_id = s.site_id
            LEFT JOIN SUPPLIERS sup ON o.supplier_id = sup.supplier_id
            LEFT JOIN PARTS p ON o.part_id = p.part_id
            WHERE o.ogi_id = @id OR o.control_no = @id
        `);

    if (result.recordset.length === 0) {
        return res.status(404).json({ message: 'Record not found' });
    }

    const row = result.recordset[0];
    const recordId = row.ogi_id;

    // Fetch Lots
    const lotsResult = await pool.request()
        .input('ogi_id', sql.VarChar, recordId)
        .query(`SELECT * FROM OGI_LOTS WHERE ogi_id = @ogi_id`);

    // Fetch Attachments
    const attachmentsResult = await pool.request()
        .input('ogi_id', sql.VarChar, recordId)
        .query(`SELECT * FROM OGI_ATTACHMENT WHERE ogi_id = @ogi_id`);

    const dto = mapToDTO(row);
    // Map Lots DTO
    dto.lots = lotsResult.recordset.map(l => ({
        id: l.ogi_lot_id,
        lotNo: l.lot_no,
        invoiceNo: l.invoice_no,
        lotSize: l.lot_size
    }));

    // Map Attachments DTO
    dto.attachments = attachmentsResult.recordset.map(a => ({
        id: a.ogi_attachment_id, 
        fileName: a.file_name,
        uploadedBy: a.updateby, 
        remarks: a.remarks
    }));

    res.json(dto);
  } catch (error) {
    console.error('Error fetching OGI record:', error);
    res.status(500).json({ message: 'Failed to fetch OGI record' });
  }
};

export const createRecord = async (req, res) => {
  const { 
    id, controlNo, status,
    siteId, supplierId, partId,
    remarks, createdBy 
  } = req.body;

  // Parse JSON-stringified arrays from FormData
  const lots = parseJsonField(req.body.lots);
  const attachments = parseJsonField(req.body.attachments);

  const transaction = new sql.Transaction(await getDb());
  
  try {
    await transaction.begin();

    const userId = createdBy || req.user?.id || 'SYSTEM'; 
    const dbStatus = mapStatusToDB(status || 'DRAFT');

    // 1. Insert Main Record
    const request = new sql.Request(transaction);
    await request
      .input('ogi_id', sql.VarChar, id || crypto.randomUUID())
      .input('control_no', sql.VarChar, controlNo)
      .input('request_status', sql.VarChar, dbStatus)
      .input('site_id', sql.VarChar, siteId)
      .input('supplier_id', sql.VarChar, supplierId)
      .input('part_id', sql.VarChar, partId) 
      .input('remarks', sql.VarChar, remarks)
      .input('incharge_id', sql.VarChar, userId)
      .input('updateby', sql.VarChar, userId)
      .query(`
        INSERT INTO OGI (
            ogi_id, control_no, request_status,
            site_id, supplier_id, part_id, remarks,
            incharge_id, updateby, 
            upload_date, last_update, submit_date
        ) VALUES (
            @ogi_id, @control_no, @request_status,
            @site_id, @supplier_id, @part_id, @remarks,
            @incharge_id, @updateby, 
            GETDATE(), GETDATE(), NULL
        )
      `);

    const recordId = id; 

    // 2. Insert Lots
    if (lots && lots.length > 0) {
        for (const lot of lots) {
            const lotReq = new sql.Request(transaction);
            await lotReq
                .input('ogi_lot_id', sql.VarChar, lot.id || crypto.randomUUID())
                .input('ogi_id', sql.VarChar, recordId)
                .input('lot_no', sql.VarChar, lot.lotNo)
                .input('invoice_no', sql.VarChar, lot.invoiceNo)
                .input('lot_size', sql.Int, lot.lotSize)
                .input('updateby', sql.VarChar, userId)
                .query(`
                    INSERT INTO OGI_LOTS (ogi_lot_id, ogi_id, lot_no, invoice_no, lot_size, last_update, updateby)
                    VALUES (@ogi_lot_id, @ogi_id, @lot_no, @invoice_no, @lot_size, GETDATE(), @updateby)
                `);
        }
    }

    // 3. Insert Attachments
    if (attachments && attachments.length > 0) {
        for (const att of attachments) {
             // Find matching file in req.files (Multer's disk name vs original name)
             const uploadedFile = (req.files || []).find(f => f.originalname === att.fileName);
             const diskFileName = uploadedFile ? uploadedFile.filename : att.fileName;
             const originalName = att.fileName;
             const finalRemarks = att.remarks ? `${att.remarks} (Original: ${originalName})` : `Original: ${originalName}`;

             const attReq = new sql.Request(transaction);
             await attReq
                .input('ogi_attachment_id', sql.VarChar, att.id || crypto.randomUUID())
                .input('ogi_id', sql.VarChar, recordId)
                .input('file_name', sql.VarChar, diskFileName)
                .input('updateby', sql.VarChar, userId)
                .input('remarks', sql.VarChar, finalRemarks)
                .query(`
                    INSERT INTO OGI_ATTACHMENT (ogi_attachment_id, ogi_id, file_name, updateby, remarks, last_update)
                    VALUES (@ogi_attachment_id, @ogi_id, @file_name, @updateby, @remarks, GETDATE())
                `);
        }
    }

    await transaction.commit();
    res.status(201).json({ message: 'Record created successfully', id: recordId });

  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('Error creating OGI record:', error);
    res.status(500).json({ message: 'Failed to create record', error: error.message });
  }
};

export const updateRecord = async (req, res) => {
    const { id } = req.params;
    const { 
        status, 
        siteId, supplierId, partId,
        remarks, updatedBy 
    } = req.body;

    // Parse JSON-stringified arrays from FormData
    const lots = parseJsonField(req.body.lots);
    const attachments = parseJsonField(req.body.attachments);

    const transaction = new sql.Transaction(await getDb());

    try {
        await transaction.begin();

        // 0. Resolve the actual ogi_id (URL param may be control_no or ogi_id)
        const lookupReq = new sql.Request(transaction);
        const lookupResult = await lookupReq
            .input('param_id', sql.VarChar, id)
            .query(`SELECT ogi_id FROM OGI WHERE ogi_id = @param_id OR control_no = @param_id`);

        if (lookupResult.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Record not found' });
        }

        const realOgiId = lookupResult.recordset[0].ogi_id;
        const userId = updatedBy || req.user?.id || 'SYSTEM';
        const dbStatus = mapStatusToDB(status);

        // 1. Update Main Record (using resolved ogi_id)
        const request = new sql.Request(transaction);
        await request
            .input('ogi_id', sql.VarChar, realOgiId)
            .input('request_status', sql.VarChar, dbStatus)
            .input('site_id', sql.VarChar, siteId)
            .input('supplier_id', sql.VarChar, supplierId)
            .input('part_id', sql.VarChar, partId)
            .input('remarks', sql.VarChar, remarks)
            .input('updateby', sql.VarChar, userId)
            .query(`
                UPDATE OGI SET 
                    request_status = @request_status,
                    site_id = @site_id,
                    supplier_id = @supplier_id,
                    part_id = @part_id,
                    remarks = @remarks,
                    updateby = @updateby,
                    last_update = GETDATE(),
                    submit_date = CASE WHEN @request_status = 'SB' THEN GETDATE() ELSE submit_date END
                WHERE ogi_id = @ogi_id
            `);

        // 2. Refresh Lots (using resolved ogi_id)
        const deleteLots = new sql.Request(transaction);
        await deleteLots.input('ogi_id', sql.VarChar, realOgiId).query(`DELETE FROM OGI_LOTS WHERE ogi_id = @ogi_id`);

        if (lots && lots.length > 0) {
            for (const lot of lots) {
                const lotReq = new sql.Request(transaction);
                await lotReq
                    .input('ogi_lot_id', sql.VarChar, lot.id || crypto.randomUUID())
                    .input('ogi_id', sql.VarChar, realOgiId)
                    .input('lot_no', sql.VarChar, lot.lotNo)
                    .input('invoice_no', sql.VarChar, lot.invoiceNo)
                    .input('lot_size', sql.Int, lot.lotSize)
                    .input('updateby', sql.VarChar, userId)
                    .query(`
                        INSERT INTO OGI_LOTS (ogi_lot_id, ogi_id, lot_no, invoice_no, lot_size, last_update, updateby)
                        VALUES (@ogi_lot_id, @ogi_id, @lot_no, @invoice_no, @lot_size, GETDATE(), @updateby)
                    `);
            }
        }

        // 3. Attachments (using resolved ogi_id)
        const deleteAtts = new sql.Request(transaction);
        await deleteAtts.input('ogi_id', sql.VarChar, realOgiId).query(`DELETE FROM OGI_ATTACHMENT WHERE ogi_id = @ogi_id`);

         if (attachments && attachments.length > 0) {
            for (const att of attachments) {
                 // Match uploaded file (Multer's unique name vs original)
                 const uploadedFile = (req.files || []).find(f => f.originalname === att.fileName);
                 const diskFileName = uploadedFile ? uploadedFile.filename : att.fileName;
                 const originalName = att.fileName;
                 
                 // If it's a new upload (has diskFileName different from original name), or if it's existing
                 // Note: If att.fileName already contains a timestamp (existing), uploadedFile will be undefined
                 const finalRemarks = att.remarks ? `${att.remarks} (Original: ${originalName})` : `Original: ${originalName}`;

                 const attReq = new sql.Request(transaction);
                 await attReq
                    .input('ogi_attachment_id', sql.VarChar, att.id || crypto.randomUUID())
                    .input('ogi_id', sql.VarChar, realOgiId)
                    .input('file_name', sql.VarChar, diskFileName)
                    .input('updateby', sql.VarChar, userId)
                    .input('remarks', sql.VarChar, finalRemarks)
                    .query(`
                        INSERT INTO OGI_ATTACHMENT (ogi_attachment_id, ogi_id, file_name, updateby, remarks, last_update)
                        VALUES (@ogi_attachment_id, @ogi_id, @file_name, @updateby, @remarks, GETDATE())
                    `);
            }
        }

        await transaction.commit();
        res.json({ message: 'Record updated successfully' });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error updating OGI record:', error);
        res.status(500).json({ message: 'Failed to update record', error: error.message });
    }
};

/**
 * GET /api/ogi/attachments/:attachmentId
 * Download attachment file
 */
export const downloadAttachment = async (req, res) => {
    try {
        const { attachmentId } = req.params;

        // Get attachment metadata
        const pool = await getDb();
        const result = await pool.request()
            .input('attachmentId', sql.VarChar, attachmentId)
            .query('SELECT * FROM OGI_ATTACHMENT WHERE ogi_attachment_id = @attachmentId');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Attachment not found' });
        }

        const attachment = result.recordset[0];
        const fileName = attachment.file_name;
        
        // Construct file path - OGI files are in uploads/ogi/
        const fs = await import('fs');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'uploads', 'ogi', fileName);

        if (!fs.existsSync(filePath)) {
            console.error(`❌ [OGI Controller] File not found on disk: ${filePath}`);
            return res.status(404).json({ message: 'File not found on server' });
        }

        // Set appropriate headers
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/octet-stream');

        // Stream file to response
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('❌ [OGI Controller] Download Error:', error);
        res.status(500).json({ message: 'Failed to download attachment', error: error.message });
    }
};
