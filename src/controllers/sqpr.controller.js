import { sqprService } from '../services/sqpr.service.js';

export const createRecord = async (req, res) => {
    try {
        const userId = req.user?.id || 'SYSTEM';
        const result = await sqprService.createRecord(req.body, userId, req.files);
        res.status(201).json({ data: result });
    } catch (error) {
        console.error('Error creating SQPR record:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};

export const getAllRecords = async (req, res) => {
    try {
        const records = await sqprService.getAllRecords();
        res.json({ data: records });
    } catch (error) {
        console.error('Error fetching SQPR records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getRecordById = async (req, res) => {
    const { id } = req.params;
    try {
        const record = await sqprService.getRecord(id);
        if (!record) return res.status(404).json({ error: 'Record not found' });
        res.json({ data: record });
    } catch (error) {
        console.error('Error fetching SQPR record:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateRecord = async (req, res) => {
    const { id } = req.params;
    try {
        const userId = req.user?.id || 'SYSTEM';
        const result = await sqprService.updateRecord(id, req.body, userId, req.files);
        
        if (!result) return res.status(404).json({ error: 'Record not found' });
        res.json({ data: result });
    } catch (error) {
        console.error('Error updating SQPR record:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const submitRecord = async (req, res) => {
    const { id } = req.params;
    try {
        const userId = req.user?.id || 'SYSTEM';
        // Submit acts as update with status=SUBMITTED
        const result = await sqprService.updateRecord(id, { 
            request_status: 'SUBMITTED', 
            submit_date: new Date() 
        }, userId);
        
        if (!result) return res.status(404).json({ error: 'Record not found' });
        res.json({ data: result });
    } catch (error) {
        res.status(500).json({ error: 'Error submitting record' });
    }
};

export const issueRecord = async (req, res) => {
    const { id } = req.params;
    try {
        const userId = req.user?.id || 'SYSTEM';
        const result = await sqprService.updateRecord(id, { 
            request_status: 'ISSUED', 
            // Issue action logic... 
        }, userId);
        if (!result) return res.status(404).json({ error: 'Record not found' });
        res.json({ data: result });
    } catch (error) {
        res.status(500).json({ error: 'Error issuing record' });
    }
};

export const rejectRecord = async (req, res) => {
    const { id } = req.params;
    try {
        const userId = req.user?.id || 'SYSTEM';
        const { remarks } = req.body;
        const result = await sqprService.updateRecord(id, { 
            request_status: 'REJECTED', 
            checker_remarks: remarks, // Or appropriate remarks field
            last_update: new Date()
        }, userId);
        if (!result) return res.status(404).json({ error: 'Record not found' });
        res.json({ data: result });
    } catch (error) {
        res.status(500).json({ error: 'Error rejecting record' });
    }
};
