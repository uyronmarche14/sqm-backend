import { fiveM1EService } from '../services/fiveM1E.service.js';

// TRIGGER HOT RELOAD (Removed)

export const createRecord = async (req, res) => {
    try {
        console.log('📝 [Backend] Create 5M1E Request Received:', JSON.stringify(req.body, null, 2));
        const userId = req.user?.id || 'SYSTEM';
        const data = req.body;
        
        const fullRecord = await fiveM1EService.createDraft(data, userId);
        
        res.status(201).json({ data: fullRecord, message: 'Draft created successfully' });
    } catch (error) {
        console.error('❌ [Backend] Error creating 5M1E record:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};

export const getAllRecords = async (req, res) => {
    try {
        const records = await fiveM1EService.getAllRecords();
        res.json({ data: records });
    } catch (error) {
        console.error('Error fetching records:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getRecordById = async (req, res) => {
    const { id } = req.params;
    try {
        const dto = await fiveM1EService.getRecord(id);
        if (!dto) return res.status(404).json({ error: 'Record not found' });
        res.json({ data: dto });
    } catch (error) {
        console.error('Error fetching record:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateRecord = async (req, res) => {
    const { id } = req.params;
    try {
        const userId = req.user?.id || 'SYSTEM';
        const result = await fiveM1EService.updateRecord(id, req.body, userId);
        
        if (!result) {
            return res.status(404).json({ error: 'Record not found' });
        }

        res.json({ message: 'Record updated successfully', id: result.controlNo });
    } catch (error) {
        console.error('Error updating record:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const exportRecords = async (req, res) => {
    // Moved to service later if needed
    res.status(501).json({ error: 'Export not implemented' });
};

export const deleteRecords = async (req, res) => {
    // Moved to service later if needed
    res.status(501).json({ error: 'Batch delete not implemented' });
};
