import db, { sql } from '../config/db.js';
import { sqmpRepository } from '../repositories/sqmp.repository.js';
import { v4 as uuidv4 } from 'uuid';

const generateControlNo = async (fiscalYear, semester) => {
    // Format: SQMP-{FY}-{SEM}-C{RAND}
    // Example: SQMP-2023-1ST-C0001
    const fy = fiscalYear || new Date().getFullYear();
    const sem = semester || '1ST';
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `SQMP-${fy}-${sem}-C${random}`; 
};

// Data Transformation Helpers
const toDBSemester = (sem) => {
    if (sem === '1ST') return 1;
    if (sem === '2ND') return 2;
    return 1; // Default
};

const fromDBSemester = (sem) => {
    if (sem === 1) return '1ST';
    if (sem === 2) return '2ND';
    return '1ST';
};

const toDBStatus = (status) => {
    const statusMap = {
        'DRAFT': 'DR',
        'SUBMITTED': 'SU',
        'CHECKED': 'CH',
        'ISSUED': 'IS',
        'REJECTED': 'RJ',
        'APPROVED': 'AP',
        'AWAITING_APPROVAL': 'AW',
        'CANCELLED': 'CN',
        'CLOSED': 'CL',
        // Response statuses
        'RESPONSE_AWAITING_APPROVAL': 'RA',
        'RESPONSE_REJECTED': 'RR'
    };
    return statusMap[status] || status?.substring(0, 2) || 'DR';
};

const fromDBStatus = (status) => {
    const invMap = {
        'DR': 'DRAFT',
        'SU': 'SUBMITTED',
        'CH': 'CHECKED',
        'IS': 'ISSUED',
        'RJ': 'REJECTED',
        'AP': 'APPROVED',
        'AW': 'AWAITING_APPROVAL',
        'CN': 'CANCELLED',
        'CL': 'CLOSED',
        // Response statuses
        'RA': 'RESPONSE_AWAITING_APPROVAL',
        'RR': 'RESPONSE_REJECTED'
    };
    return invMap[status] || status;
};

export const sqmpService = {
    
    /**
     * Create New SQMP Record
     */
    async createRecord(data, userId) {
        const pool = await db.getPool();
        const transaction = new sql.Transaction(pool);

        console.log('---------------------------------------------------');
        console.log('📥 [SQMP-SERVICE] Create Record Request');
        console.log('---------------------------------------------------');
        console.log('📦 Data Payload Keys:', Object.keys(data));
        
        if (data.main_documents?.length) {
            console.log('📎 Main Documents Received:', data.main_documents.length);
            data.main_documents.forEach((d, i) => console.log(`   [${i}] ${d.file_name} (${d.file_extension})`));
        } else {
            console.log('📎 No Main Documents');
        }

        try {
            await transaction.begin();

            const sqmpId = uuidv4();
            const now = new Date();
            const controlNo = await generateControlNo(data.fiscal_year, data.semester);

            // 1. Insert Main Record
            console.log('⚙️ [SQMP-SERVICE] Generating ID:', sqmpId);
            console.log('⚙️ [SQMP-SERVICE] Generated Control No:', controlNo);

            const mainData = {
                sqmp_id: sqmpId,
                control_no: controlNo,
                registration_date: data.registration_date || now,
                site_id: data.site_id,
                supplier_id: data.supplier_id,
                attention_id: data.attention_id,
                fiscal_year: data.fiscal_year,
                semester: toDBSemester(data.semester), // Map Semester
                issued_date: data.issued_date,
                due_date: data.due_date,
                model_id: data.model_id,
                revision: data.revision || 0,
                remarks: data.remarks,
                main_document_remarks: data.main_document_remarks,
                appendix_sheet_remarks: data.appendix_sheet_remarks,
                
                encoder_id: userId,
                encoder_date: now,
                issuer_id: userId, 
                issuer_remarks: null,
                issuer_date: null,
                
                request_status: toDBStatus('DRAFT'), // Map Status
                last_update: now,
                updateby: userId
            };

            await sqmpRepository.insertSQMP(transaction, mainData);

            // 2. Insert Documents
            if (data.main_documents?.length) {
                console.log('🔄 [SQMP-SERVICE] Processing Main Documents...');
                const docs = data.main_documents.map(doc => ({
                    sqmp_document_id: uuidv4(),
                    sqmp_id: sqmpId,
                    file_name: doc.file_name,
                    file_extension: doc.file_extension || 'dat',
                    remarks: doc.remarks,
                    last_update: now,
                    updateby: userId
                }));
                await sqmpRepository.insertDocuments(transaction, docs);
            }

            // 3. Insert Appendices
            if (data.appendix_documents?.length) {
                console.log('🔄 [SQMP-SERVICE] Processing Appendices...');
                const apps = data.appendix_documents.map(app => ({
                    sqmp_appendix_id: uuidv4(),
                    sqmp_id: sqmpId,
                    file_name: app.file_name,
                    file_extension: app.file_extension || 'dat',
                    remarks: app.remarks,
                    last_update: now,
                    updateby: userId
                }));
                await sqmpRepository.insertAppendices(transaction, apps);
            }

            // 4. Insert CC List
            if (data.cc_list?.length) {
                console.log('🔄 [SQMP-SERVICE] Processing CC List...');
                const ccs = data.cc_list.map(cc => ({
                    sqmp_cc_id: uuidv4(),
                    sqmp_id: sqmpId,
                    user_id: cc.user_id,
                    last_update: now,
                    updateby: userId
                }));
                await sqmpRepository.insertCC(transaction, ccs);
            }

            await transaction.commit();
            console.log('✅ [SQMP-SERVICE] Transaction Committed.');
            return await this.getRecord(sqmpId);

        } catch (error) {
            console.error('❌ [SQMP-SERVICE] Transaction Failed:', error);
            if (transaction.active) await transaction.rollback();
            throw error;
        }
    },

    /**
     * Get Single Record with full details for Edit Form
     * Returns human-readable data with camelCase field names
     */
    async getRecord(id) {
        console.log('🔍 [SQMP-SERVICE] Getting Record:', id);
        const row = await sqmpRepository.findFullRecord(id);
        if (!row) return null;

        const subs = await sqmpRepository.findSubTables(row.sqmp_id);
        
        // Map DB snake_case to frontend camelCase with human-readable data
        return {
            // Primary Keys
            id: row.sqmp_id,
            sqmpId: row.sqmp_id,
            
            // Control Info
            controlNo: row.control_no,
            registrationDate: row.registration_date,
            
            // Related Names (Human Readable from JOINs)
            siteName: row.site_name || '',
            supplierName: row.supplier_name || '',
            modelName: row.model_name || '',
            
            // Related IDs (for form dropdowns)
            siteId: row.site_id,
            mfgSiteId: row.site_id,  // Alias for form
            supplierId: row.supplier_id,
            modelId: row.model_id,
            attentionId: row.attention_id,
            
            // Timeline
            fiscalYear: row.fiscal_year,
            semester: fromDBSemester(row.semester),
            issuedDate: row.issued_date,
            dueDate: row.due_date,
            
            // Document Info
            revision: row.revision,
            remarks: row.remarks,
            mainDocumentRemarks: row.main_document_remarks,
            appendixSheetRemarks: row.appendix_sheet_remarks,
            
            // Status (Human Readable)
            status: fromDBStatus(row.request_status),
            requestStatus: fromDBStatus(row.request_status),
            
            // Workflow Users (Human Readable from JOINs)
            encoderId: row.encoder_id,
            encoderName: row.encoder_name || '',
            encoderDate: row.encoder_date,
            
            issuerId: row.issuer_id,
            issuerName: row.issuer_name || '',
            issuerDate: row.issuer_date,
            issuerRemarks: row.issuer_remarks,
            
            checkerId: row.checker_id,
            checkerName: row.checker_name || '',
            checkerDate: row.checker_date,
            checkerRemarks: row.checker_remarks,
            
            approverId: row.approver_id,
            approverName: row.approver_name || '',
            approverDate: row.approver_date,
            approverRemarks: row.approver_remarks,
            
            // Timestamps
            lastUpdate: row.last_update,
            updatedBy: row.updateby,
            createdAt: row.registration_date,
            updatedAt: row.last_update,
            
            // Sub-tables (mapped to camelCase)
            mainDocuments: (subs.documents || []).map(doc => ({
                id: doc.sqmp_doc_id,
                fileName: doc.file_name,
                fileUrl: doc.file_url,
                fileExtension: doc.file_extension,
                remarks: doc.remarks
            })),
            appendixDocuments: (subs.appendices || []).map(app => ({
                id: app.sqmp_app_id,
                fileName: app.file_name,
                fileUrl: app.file_url,
                fileExtension: app.file_extension,
                remarks: app.remarks
            })),
            ccList: (subs.ccList || []).map(cc => ({
                id: cc.sqmp_cc_id,
                userId: cc.user_id,
                fullName: cc.full_name || '',
                email: cc.email || ''
            }))
        };
    },

    /**
     * Get All Records (with optional status filter)
     * Returns human-readable data with camelCase field names for frontend
     */
    async getAllRecords(status) {
        const records = await sqmpRepository.findAllRecords();
        
        // Map DB snake_case to frontend camelCase with human-readable data
        const mapped = records.map(row => ({
            // Primary Keys
            id: row.sqmp_id,
            sqmpId: row.sqmp_id,
            
            // Control Info
            controlNo: row.control_no,
            registrationDate: row.registration_date,
            
            // Related Names (Human Readable from JOINs)
            siteName: row.site_name || 'N/A',
            supplierName: row.supplier_name || 'N/A',
            modelName: row.model_name || 'N/A',
            
            // Related IDs (for lookups)
            siteId: row.site_id,
            supplierId: row.supplier_id,
            modelId: row.model_id,
            attentionId: row.attention_id,
            
            // Timeline
            fiscalYear: row.fiscal_year,
            semester: fromDBSemester(row.semester),
            issuedDate: row.issued_date,
            dueDate: row.due_date,
            
            // Document Info
            revision: row.revision,
            remarks: row.remarks,
            mainDocumentRemarks: row.main_document_remarks,
            appendixSheetRemarks: row.appendix_sheet_remarks,
            
            // Status (Human Readable)
            status: fromDBStatus(row.request_status),
            requestStatus: fromDBStatus(row.request_status),
            
            // Workflow Users (Human Readable from JOINs)
            encoderId: row.encoder_id,
            encoderName: row.encoder_name || 'N/A',
            encoderDate: row.encoder_date,
            
            issuerId: row.issuer_id,
            issuerName: row.issuer_name || 'N/A',
            issuerDate: row.issuer_date,
            issuerRemarks: row.issuer_remarks,
            
            checkerName: row.checker_name,
            approverName: row.approver_name,
            
            // Timestamps
            lastUpdate: row.last_update,
            updatedBy: row.updateby,
            createdAt: row.registration_date,
            updatedAt: row.last_update
        }));

        // Filter by status if provided
        if (status) {
            const normalizedStatus = status.toUpperCase().replace(/_/g, '_');
            console.log('🔍 [SQMP-SERVICE] Filtering by status:', normalizedStatus, 'from', mapped.length, 'records');
            return mapped.filter(record => {
                const recordStatus = (record.status || '').toUpperCase();
                // Handle various status name formats
                return recordStatus === normalizedStatus ||
                       recordStatus === status.toUpperCase() ||
                       recordStatus.replace(/_/g, '') === normalizedStatus.replace(/_/g, '');
            });
        }

        return mapped;
    },

    /**
     * Update Record
     */
    async updateRecord(id, data, userId) {
        console.log('📥 [SQMP-SERVICE] Update Request:', id);
        const pool = await db.getPool();
        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();

            const existing = await sqmpRepository.findFullRecord(id);
            if (!existing) {
                await transaction.rollback();
                return null;
            }

            const sqmpId = existing.sqmp_id;
            const now = new Date();
            const updates = {};
            
            // Allowlist
            const allowed = [
                'site_id', 'supplier_id', 'attention_id',
                'fiscal_year', 'semester', 'issued_date', 'due_date',
                'model_id', 'revision', 'remarks', 
                'main_document_remarks', 'appendix_sheet_remarks',
                'request_status',
                'issuer_id', 'issuer_remarks', 'issuer_date',
                'checker_id', 'checker_remarks', 'checker_date',
                'approver_id', 'approver_remarks', 'approver_date'
            ];

            allowed.forEach(field => {
                if (data[field] !== undefined) {
                    if (field === 'semester') updates[field] = toDBSemester(data[field]);
                    else if (field === 'request_status') updates[field] = toDBStatus(data[field]);
                    else updates[field] = data[field];
                }
            });

            if (Object.keys(updates).length > 0) {
                updates.last_update = now;
                updates.updateby = userId;
                await sqmpRepository.updateSQMP(transaction, sqmpId, updates);
            }

            // Handle SubTables (Delete + Insert Pattern)
            
            // Documents
            if (data.main_documents !== undefined) {
                console.log('🔄 [SQMP-SERVICE] Updating Documents...');
                await sqmpRepository.deleteSubTable(transaction, sqmpId, 'SQMP_DOCUMENT');
                if (data.main_documents.length) {
                    const docs = data.main_documents.map(doc => ({
                        sqmp_document_id: uuidv4(),
                        sqmp_id: sqmpId,
                        file_name: doc.file_name,
                        file_extension: doc.file_extension || 'dat',
                        remarks: doc.remarks,
                        last_update: now,
                        updateby: userId
                    }));
                    await sqmpRepository.insertDocuments(transaction, docs);
                }
            }

            // Appendices
            if (data.appendix_documents !== undefined) {
                console.log('🔄 [SQMP-SERVICE] Updating Appendices...');
                await sqmpRepository.deleteSubTable(transaction, sqmpId, 'SQMP_APPENDIX');
                if (data.appendix_documents.length) {
                    const apps = data.appendix_documents.map(app => ({
                        sqmp_appendix_id: uuidv4(),
                        sqmp_id: sqmpId,
                        file_name: app.file_name,
                        file_extension: app.file_extension || 'dat',
                        remarks: app.remarks,
                        last_update: now,
                        updateby: userId
                    }));
                    await sqmpRepository.insertAppendices(transaction, apps);
                }
            }

            // CC List
            if (data.cc_list !== undefined) {
                console.log('🔄 [SQMP-SERVICE] Updating CC List...');
                await sqmpRepository.deleteSubTable(transaction, sqmpId, 'SQMP_CC');
                if (data.cc_list.length) {
                    const ccs = data.cc_list.map(cc => ({
                        sqmp_cc_id: uuidv4(),
                        sqmp_id: sqmpId,
                        user_id: cc.user_id,
                        last_update: now,
                        updateby: userId
                    }));
                    await sqmpRepository.insertCC(transaction, ccs);
                }
            }

            await transaction.commit();
            console.log('✅ [SQMP-SERVICE] Update Committed.');
            return await this.getRecord(sqmpId);

        } catch (error) {
            console.error('❌ [SQMP-SERVICE] Update Failed:', error);
            if (transaction.active) await transaction.rollback();
            throw error;
        }
    }
};
