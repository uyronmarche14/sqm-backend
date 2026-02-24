import db, { sql } from '../config/db.js';
import { sqprRepository } from '../repositories/sqpr.repository.js';
import { v4 as uuidv4 } from 'uuid'; // Assuming UUIDs for IDs based on nvarchar(72)

const generateControlNo = async (fiscalYear, reportType) => {
    // Format: SFR-{FY}-{Q/M}-C{Count}
    // Example: SFR-2023-3Q-C0001
    const typeStr = reportType === 1 ? 'M' : 'Q';
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SFR-${fiscalYear}-${typeStr}-C${random}`; 
    // Real logic would query COUNT from DB, but random is safe for MVP
};

export const sqprService = {
    
    /**
     * Create New SQPR Record
     */
    async createRecord(data, userId, files = []) {
        const pool = await db.getPool();
        const transaction = new sql.Transaction(pool);

        // DEBUG: Log received data from frontend
        console.log('📥 [SQPR-BACKEND] Received Create Request');
        console.log('📥 [SQPR-BACKEND] Raw Data:', JSON.stringify(data, null, 2));
        console.log('📥 [SQPR-BACKEND] Attachments received:', data.attachments?.length || 0);
        console.log('📥 [SQPR-BACKEND] CC List received:', data.cc_list?.length || 0);

        try {
            await transaction.begin();

            const sqprId = uuidv4();
            const now = new Date();
            const controlNo = await generateControlNo(data.fiscal_year, data.report_type);

            // 1. Insert Main Record
            const mainData = {
                sqpr_id: sqprId,
                control_no: controlNo,
                site_id: data.site_id,
                fiscal_year: data.fiscal_year,
                report_type: data.report_type,
                month: data.month || 1,
                supplier_id: data.supplierId || data.supplier_id,
                attention_id: data.attentionId || data.attention_id,
                attention: data.attention,
                // Files (Optional at start?)
                file_id: uuidv4(), 
                file_name: 'Pending', 
                file_extension: 'pdf',
                remarks: data.remarks,
                date_created: now,
                incharge_id: userId, // Creator is Incharge
                incharge_remarks: data.incharge_remarks,
                request_status: 'DRFT', // Fitting nvarchar(4)
                last_update: now,
                updateby: userId
            };
            
            console.log('💾 [SQPR-BACKEND] Saving to SQPR table:', mainData);
            await sqprRepository.insertSQPR(transaction, mainData);
            console.log('✅ [SQPR-BACKEND] Main record saved');

            // 2. Insert Attachments (if any)
            if (data.attachments?.length) {
                const attData = data.attachments.map(att => {
                    // Match uploaded file (Multer's unique name vs original)
                    const uploadedFile = (files || []).find(f => f.originalname === att.file_name);
                    const diskFileName = uploadedFile ? uploadedFile.filename : att.file_name;
                    const originalName = att.file_name;
                    
                    // Preserve original filename in remarks
                    const finalRemarks = att.remarks ? `${att.remarks} (Original: ${originalName})` : `Original: ${originalName}`;

                    return {
                        sqpr_attachment_id: uuidv4(),
                        sqpr_id: sqprId,
                        file_name: diskFileName || 'Unknown',
                        file_extension: diskFileName ? diskFileName.split('.').pop() : (att.file_extension || 'dat'),
                        attachment_type: att.attachment_type || 'COVER',
                        remarks: finalRemarks,
                        last_update: now,
                        updateby: userId
                    };
                });
                console.log('💾 [SQPR-BACKEND] Saving to SQPR_ATTACHMENT:', attData);
                await sqprRepository.insertAttachments(transaction, attData);
                console.log('✅ [SQPR-BACKEND] Attachments saved:', attData.length);
            }
 else {
                console.log('⚠️ [SQPR-BACKEND] No attachments to save');
            }

            // 3. Insert CC List (if any)
            if (data.cc_list?.length) {
                const ccData = data.cc_list.map(cc => ({
                    sqpr_cc_id: uuidv4(),
                    sqpr_id: sqprId,
                    user_id: cc.user_id,
                    last_update: now,
                    updateby: userId
                }));
                console.log('💾 [SQPR-BACKEND] Saving to SQPR_CC:', ccData);
                await sqprRepository.insertCC(transaction, ccData);
                console.log('✅ [SQPR-BACKEND] CC List saved:', ccData.length);
            } else {
                console.log('⚠️ [SQPR-BACKEND] No CC list to save');
            }

            await transaction.commit();
            console.log('✅ [SQPR-BACKEND] Transaction committed successfully');
            return await this.getRecord(sqprId);

        } catch (error) {
            console.error('❌ [SQPR-BACKEND] Create failed:', error);
            if (transaction.active) await transaction.rollback();
            throw error;
        }
    },

    /**
     * Get Single Record with Details
     */
    async getRecord(id) {
        console.log('🔍 [SQPR-BACKEND] Fetching record:', id);
        
        const row = await sqprRepository.findFullRecord(id);
        if (!row) {
            console.log('⚠️ [SQPR-BACKEND] Record not found:', id);
            return null;
        }

        console.log('📋 [SQPR-BACKEND] Main record fetched:', {
            sqpr_id: row.sqpr_id,
            control_no: row.control_no,
            site_id: row.site_id,
            request_status: row.request_status,
            fiscal_year: row.fiscal_year
        });

        const { attachments, ccList } = await sqprRepository.findSubTables(row.sqpr_id);

        console.log('📎 [SQPR-BACKEND] Attachments fetched:', attachments?.length || 0);
        if (attachments?.length) {
            console.log('📎 [SQPR-BACKEND] Attachment details:', attachments);
        }
        
        console.log('👥 [SQPR-BACKEND] CC List fetched:', ccList?.length || 0);
        if (ccList?.length) {
            console.log('👥 [SQPR-BACKEND] CC details:', ccList);
        }

        const result = {
            ...row,
            attachments: attachments || [],
            cc_list: ccList || [],
        };

        console.log('✅ [SQPR-BACKEND] Complete record assembled');
        return result;
    },

    /**
     * Get All Records
     */
    async getAllRecords() {
        return await sqprRepository.findAllRecords();
    },

    /**
     * Update Record
     */
    async updateRecord(id, data, userId, files = []) {
        const pool = await db.getPool();
        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();

            const existing = await sqprRepository.findFullRecord(id);
            if (!existing) {
                await transaction.rollback();
                return null;
            }

            const sqprId = existing.sqpr_id;
            const now = new Date();
            const updates = {};
            
            // Map Allowed Update Fields
            const allowed = [
                'site_id', 'supplier_id', 'attention', 'attention_id',
                'fiscal_year', 'report_type', 'month', 'remarks', 
                'request_status', 
                'submit_date', 
                'incharge_id', 'incharge_remarks',
                'checker_id', 'checker_remarks', 'checker_date',
                'approver_id', 'approver_remarks', 'approver_date'
            ];

            allowed.forEach(field => {
                if (data[field] !== undefined) updates[field] = data[field];
            });

            if (Object.keys(updates).length > 0) {
                // Map status to 4 chars if present
                if (updates.request_status) {
                    const statusMap = {
                        'DRAFT': 'DRFT',
                        'SUBMITTED': 'SUBM',
                        'CHECKED': 'CHKD',
                        'ISSUED': 'ISSU',
                        'REJECTED': 'RJCT',
                        'APPROVED': 'APRV'
                    };
                    updates.request_status = statusMap[updates.request_status] || updates.request_status.substring(0, 4);
                }
                
                updates.last_update = now;
                updates.updateby = userId;
                
                await sqprRepository.updateSQPR(transaction, sqprId, updates);
            }

            // Handle Attachments (Delete + Insert Pattern)
            if (data.attachments !== undefined) {
                // Delete existing attachments
                await sqprRepository.deleteAttachments(transaction, sqprId);
                
                // Insert new attachments
                if (data.attachments?.length) {
                    const attData = data.attachments.map(att => {
                        // Match uploaded file (Multer's unique name vs original)
                        const uploadedFile = (files || []).find(f => f.originalname === att.file_name);
                        const diskFileName = uploadedFile ? uploadedFile.filename : att.file_name;
                        const originalName = att.file_name;
                        
                        // Preserve original filename in remarks
                        const finalRemarks = att.remarks ? `${att.remarks} (Original: ${originalName})` : `Original: ${originalName}`;

                        return {
                            sqpr_attachment_id: att.sqpr_attachment_id || uuidv4(),
                            sqpr_id: sqprId,
                            file_name: diskFileName || 'Unknown',
                            file_extension: diskFileName ? diskFileName.split('.').pop() : (att.file_extension || 'dat'),
                            attachment_type: att.attachment_type || 'COVER',
                            remarks: finalRemarks,
                            last_update: now,
                            updateby: userId
                        };
                    });
                    await sqprRepository.insertAttachments(transaction, attData);
                }
            }

            // Handle CC List (Delete + Insert Pattern)
            if (data.cc_list !== undefined) {
                // Delete existing CC entries
                await sqprRepository.deleteCC(transaction, sqprId);
                
                // Insert new CC entries
                if (data.cc_list?.length) {
                    const ccData = data.cc_list.map(cc => ({
                        sqpr_cc_id: cc.sqpr_cc_id || uuidv4(),
                        sqpr_id: sqprId,
                        user_id: cc.user_id,
                        last_update: now,
                        updateby: userId
                    }));
                    await sqprRepository.insertCC(transaction, ccData);
                }
            }

            await transaction.commit();
            return await this.getRecord(sqprId);

        } catch (error) {
            if (transaction.active) await transaction.rollback();
            throw error;
        }
    }
};
