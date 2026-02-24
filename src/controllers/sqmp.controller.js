import { sqmpService } from '../services/sqmp.service.js';
import path from 'path';
import fs from 'fs';

export const createRecord = async (req, res) => {
    console.log('▶️ [SQMP-CONTROLLER] createRecord called');
    try {
        const userId = req.user?.id || '6a15b66a-079b-433b-b70f-dc15dce25631'; // Fallback to valid Test User ID
        const result = await sqmpService.createRecord(req.body, userId, req.files);
        res.status(201).json({ data: result });
    } catch (error) {
        console.error('❌ [SQMP-CONTROLLER] Error creating record:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};

export const getAllRecords = async (req, res) => {
    const { status } = req.query;
    console.log('▶️ [SQMP-CONTROLLER] getAllRecords called, status filter:', status || 'ALL');
    try {
        const records = await sqmpService.getAllRecords(status);
        res.json({ data: records });
    } catch (error) {
        console.error('❌ [SQMP-CONTROLLER] Error fetching records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getRecordById = async (req, res) => {
    const { id } = req.params;
    console.log('▶️ [SQMP-CONTROLLER] getRecordById called:', id);
    try {
        const record = await sqmpService.getRecord(id);
        if (!record) return res.status(404).json({ error: 'Record not found' });
        res.json({ data: record });
    } catch (error) {
        console.error('❌ [SQMP-CONTROLLER] Error fetching record:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateRecord = async (req, res) => {
    const { id } = req.params;
    console.log('▶️ [SQMP-CONTROLLER] updateRecord called:', id);
    try {
        const userId = req.user?.id || '6a15b66a-079b-433b-b70f-dc15dce25631'; // Fallback to valid Test User ID
        const result = await sqmpService.updateRecord(id, req.body, userId, req.files);
        
        if (!result) return res.status(404).json({ error: 'Record not found' });
        res.json({ data: result });
    } catch (error) {
        console.error('❌ [SQMP-CONTROLLER] Error updating record:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Workflow Actions
export const submitRecord = async (req, res) => {
    const { id } = req.params;
    console.log('▶️ [SQMP-CONTROLLER] submitRecord called:', id);
    try {
        const userId = req.user?.id || '6a15b66a-079b-433b-b70f-dc15dce25631'; // Fallback to valid Test User ID
        const result = await sqmpService.updateRecord(id, { 
            request_status: 'SUBMITTED', 
        }, userId);
        
        if (!result) return res.status(404).json({ error: 'Record not found' });
        res.json({ data: result });
    } catch (error) {
        res.status(500).json({ error: 'Error submitting record' });
    }
};

export const approveRecord = async (req, res) => {
    const { id } = req.params;
    console.log('▶️ [SQMP-CONTROLLER] approveRecord called:', id);
    try {
        const userId = req.user?.id || 'SYSTEM';
        const result = await sqmpService.updateRecord(id, { 
            request_status: 'APPROVED',
            approver_id: userId,
            approver_date: new Date()
        }, userId);
        
        if (!result) return res.status(404).json({ error: 'Record not found' });
        res.json({ data: result });
    } catch (error) {
        res.status(500).json({ error: 'Error approving record' });
    }
};

export const rejectRecord = async (req, res) => {
    const { id } = req.params;
    const { remarks } = req.body;
    console.log('▶️ [SQMP-CONTROLLER] rejectRecord called:', id);
    try {
        const userId = req.user?.id || 'SYSTEM';
        const result = await sqmpService.updateRecord(id, { 
            request_status: 'REJECTED',
            approver_remarks: remarks, 
            approver_date: new Date()
        }, userId);
        
        if (!result) return res.status(404).json({ error: 'Record not found' });
        res.json({ data: result });
    } catch (error) {
        res.status(500).json({ error: 'Error rejecting record' });
    }
};

export const downloadAttachment = async (req, res) => {
    const { attachmentId } = req.params;
    console.log('▶️ [SQMP-CONTROLLER] downloadAttachment called:', attachmentId);

    try {
        const pool = await db.getPool();
        // Check for main documents
        let doc = await pool.request()
            .input('id', sql.UniqueIdentifier, attachmentId)
            .query('SELECT file_name FROM SQMP_DOCUMENT WHERE sqmp_document_id = @id');

        if (doc.recordset.length === 0) {
            // Check for appendix documents
            doc = await pool.request()
                .input('id', sql.UniqueIdentifier, attachmentId)
                .query('SELECT file_name FROM SQMP_APPENDIX WHERE sqmp_appendix_id = @id');
        }

        if (doc.recordset.length === 0) {
            return res.status(404).json({ error: 'Attachment not found' });
        }

        const fileName = doc.recordset[0].file_name;
        const filePath = path.join(process.cwd(), 'uploads/sqmp', fileName);

        if (!fs.existsSync(filePath)) {
            console.error('❌ [SQMP-CONTROLLER] File not found on disk:', filePath);
            return res.status(404).json({ error: 'File not found on disk' });
        }

        res.download(filePath);
    } catch (error) {
        console.error('❌ [SQMP-CONTROLLER] Download error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
