import { npiService } from '../services/npi.service.js';

/**
 * Get All Records
 */
export const getAllRecords = async (req, res) => {
  try {
    const filters = req.query || {};
    const records = await npiService.getAllRecords(filters);
    res.json(records);
  } catch (error) {
    console.error('Error fetching NPI records:', error);
    res.status(500).json({ message: 'Failed to fetch NPI records' });
  }
};

/**
 * Get Record By ID
 */
export const getRecordById = async (req, res) => {
  const { id } = req.params;
  try {
    const record = await npiService.getRecordById(id);
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }
    res.json(record);
  } catch (error) {
    console.error('Error fetching NPI record:', error);
    res.status(500).json({ message: 'Failed to fetch NPI record' });
  }
};

/**
 * Create Record
 */
export const createRecord = async (req, res) => {
    // DEBUG: Log incoming request
    console.log('------------------------------------------------');
    console.log('[NPI-BE] CREATE REQUEST RECEIVED');
    console.log('[NPI-BE] BODY:', JSON.stringify(req.body, null, 2));
    console.log('[NPI-BE] FILES:', req.files || req.file ? 'Files Present' : 'No Files');
    console.log('------------------------------------------------');

    try {
        const result = await npiService.createRecord(req.body);
        res.status(201).json(result);
    } catch (error) {
        console.error('Create NPI Error Detail:', error);
        res.status(500).json({ message: 'Failed to create', error: error.message, stack: error.stack });
    }
};

/**
 * Update Record
 */
export const updateRecord = async (req, res) => {
    const { id } = req.params;
    // DEBUG: Log incoming request
    console.log('------------------------------------------------');
    console.log('[NPI-BE] UPDATE REQUEST RECEIVED');
    console.log('[NPI-BE] ID:', id);
    console.log('[NPI-BE] BODY:', JSON.stringify(req.body, null, 2));
    console.log('------------------------------------------------');
    
    if (!id || id === 'undefined') {
        return res.status(400).json({ message: 'Invalid ID provided' });
    }

    try {
        const result = await npiService.updateRecord(id, req.body);
        res.json(result);
    } catch (error) {
        console.error('Update NPI Error Detail:', error);
        res.status(500).json({ message: 'Failed to update', error: error.message });
    }
};

/**
 * Get Stats
 */
export const getStats = async (req, res) => {
  try {
    const stats = await npiService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching NPI stats:', error);
    res.status(500).json({ message: 'Failed to fetch NPI stats' });
  }
};

/**
 * Generate Sequence
 */
export const generateSequence = async (req, res) => {
    try {
        const { siteId } = req.query;
        if (!siteId) return res.status(400).json({ message: 'Site Code required' });

        const sequence = await npiService.generateSequence(siteId);
        res.json({ sequence });
    } catch (error) {
        console.error('Error generating sequence:', error);
        res.status(500).json({ message: 'Failed to generate sequence' });
    }
};
