import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';

// Helper: Generate Control No
const generateControlNo = async () => {
    // Mock: MNR-YY-XXX
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `MNR-${year}-${random}`;
};

// Start a Transaction Helper
const withTransaction = async (callback) => {
    const pool = await db.getPool();
    const transaction = new db.sql.Transaction(pool);
    try {
        await transaction.begin();
        
        // Wrapper to allow "execute" or "query" with parameterized inputs inside transaction
        const wrappedConn = {
            execute: async (queryText, params = []) => {
                const request = new db.sql.Request(transaction);
                
                // Bind Params (Logic copied from db.js to ensure consistency)
                let mssqlQuery = queryText;
                if (params && params.length > 0) {
                    let paramIndex = 0;
                    mssqlQuery = queryText.replace(/\?/g, () => {
                        paramIndex++;
                        return `@param${paramIndex}`;
                    });
                    
                    params.forEach((value, index) => {
                        const pName = `param${index + 1}`;
                        if (typeof value === 'number') {
                            if (Number.isInteger(value)) {
                                request.input(pName, db.sql.Int, value);
                            } else {
                                request.input(pName, db.sql.Float, value);
                            }
                        } else if (typeof value === 'boolean') {
                            request.input(pName, db.sql.Bit, value);
                        } else if (value instanceof Date) {
                             request.input(pName, db.sql.DateTime, value);
                        } else {
                            // String or null
                            request.input(pName, db.sql.NVarChar, value);
                        }
                    });
                }
                
                const result = await request.query(mssqlQuery);
                // Return consistent structure
                return [result.recordset || [], result];
            },
            query: async (q, p) => { 
                // Alias for execute
                return wrappedConn.execute(q, p); 
            } 
        };

        const result = await callback(wrappedConn);
        await transaction.commit();
        return result;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

// Status Mapping Helper - Complete mapping for all WorkflowStatusEnum values
const mapStatusToDB = (status) => {
    const map = {
        // Pre-Submission
        'DRAFT': 'DR',
        'NEW': 'NW',
        
        // Active Flow
        'PENDING': 'PN',
        'SUBMITTED': 'SU',
        'AAPPROVAL': 'AA',      // NPI Awaiting Approval
        
        // Evaluation / Technical Phases
        'FAPPROVED': 'FA',
        'EVALUATION': 'EV',
        
        // Final Stages
        'APPROVED': 'AP',
        'APPROVED_WC': 'AW',
        'APPROVEDWC': 'AW',
        'REJECTED': 'RE',
        'RAR': 'RR',            // 5M1E Rejected and Revise
        
        // MNR Specific
        'ISSUED': 'IS',
        'FR': 'FR',
        'IR': 'IR',
        'REPORT': 'RP',
        'RESPONSE_AWAITING': 'RW',
        'RESPONSE_AWAIT_APPROVAL': 'RA',
        'RESPONSE_RECEIVED': 'RC',
        'RREJECTED': 'RJ',
        
        // Post-Process
        'RELEASE': 'RL',
        'HOLD': 'HO',
        'CANCEL': 'CA',
        'CLOSED': 'CL'
    };
    const upperStatus = (status || '').toUpperCase();
    const mapped = map[upperStatus];
    if (!mapped) {
        console.warn(`⚠️ Unknown status "${status}" - defaulting to DR (DRAFT)`);
        return 'DR';
    }
    return mapped;
};

const mapStatusFromDB = (code) => {
    const map = {
        // Pre-Submission
        'DR': 'DRAFT',
        'NW': 'NEW',
        
        // Active Flow
        'PN': 'PENDING',
        'SU': 'SUBMITTED',
        'AA': 'AAPPROVAL',
        
        // Evaluation / Technical Phases
        'FA': 'FAPPROVED',
        'EV': 'EVALUATION',
        
        // Final Stages
        'AP': 'APPROVED',
        'AW': 'APPROVED_WC',
        'RE': 'REJECTED',
        'RR': 'RAR',
        
        // MNR Specific
        'IS': 'ISSUED',
        'FR': 'FR',
        'IR': 'IR',
        'RP': 'REPORT',
        'RW': 'RESPONSE_AWAITING',
        'RA': 'RESPONSE_AWAIT_APPROVAL',
        'RC': 'RESPONSE_RECEIVED',
        'RJ': 'RREJECTED',
        
        // Post-Process
        'RL': 'RELEASE',
        'HO': 'HOLD',
        'CA': 'CANCEL',
        'CL': 'CLOSED'
    };
    return map[code] || code;
};

// =============================================================================
// APPROVAL STATUS MAP (Phase 2 Enhancement)
// Configurable mapping of status transitions to approval field stamping
// =============================================================================
const APPROVAL_STATUS_MAP = {
    'SUBMITTED': { 
        field: 'encoder_id', 
        dateField: 'encoder_date', 
        remarksField: null, // Encoder submits, no remarks needed
        description: 'Record submitted by encoder'
    },
    'AAPPROVAL': { 
        field: 'checker_id', 
        dateField: 'checker_date', 
        remarksField: 'checker_remarks',
        description: 'Record reviewed by checker'
    },
    'APPROVED': { 
        field: 'approver_id', 
        dateField: 'approver_date', 
        remarksField: 'approver_remarks',
        description: 'Record approved by approver'
    },
    'ISSUED': { 
        field: 'issuer_id', 
        dateField: 'issuer_date', 
        remarksField: 'issuer_remarks',
        description: 'Record issued by issuer'
    },
    'RESPONSE_AWAIT_APPROVAL': {
        field: null, // No user stamp, just status change
        dateField: null,
        remarksField: null,
        description: 'Response pending approval review'
    }
};

/**
 * Stamps approval fields based on status transition
 */
function stampApprovalFields(dbUpdates, status, userId, remarks, now, explicitAssignments = {}) {
    const config = APPROVAL_STATUS_MAP[status];
    
    if (config && config.field) {
        // Use explicit assignment if provided, otherwise auto-stamp with acting user
        dbUpdates[config.field] = explicitAssignments[config.field.replace('_id', '')] || userId;
        dbUpdates[config.dateField] = now;
        
        if (config.remarksField && remarks) {
            dbUpdates[config.remarksField] = remarks;
        }
    }
    
    // Always track who made the last update
    dbUpdates.last_update = now;
    dbUpdates.updateby = userId;
    
    return dbUpdates;
}

export const createRecord = async (req, res) => {
    try {
        console.log('⚡ createRecord CALLED. User:', req.user);
        
        console.log('🔥 [MNR BACKEND DEBUG] Payload:', JSON.stringify(req.body, null, 2));
        let userId = req.user?.userId || req.user?.id;

        // Fallback User Logic
        if (!userId) {
             console.warn('⚠️ No req.user found! Using fallback System ID.');
             const [sysUsers] = await db.query("SELECT TOP 1 user_id FROM dbo.USERS WHERE full_name LIKE '%Admin%' OR full_name LIKE '%System%'");
             if (sysUsers.length > 0) {
                 userId = sysUsers[0].user_id;
             } else {
                 return res.status(401).json({ error: 'Unauthorized: User authentication required.' });
             }
        }
        
        const data = req.body;
        
        // 1. Normalize Payload (Flatten Nested Form Structures)
        // If 'mainDetails' exists, prefer it. If flat 'mfgSites' exists (legacy), fallback to it.
        const main = data.mainDetails || {};
        const disp = data.disposition || data.disposition_data || {};
        const nc = data.nonConformity || {};
        const approval = data.approval || {};
        const response = data.response8D || {}; 

        const result = await withTransaction(async (conn) => {
            const id = uuidv4();
            const controlNo = await generateControlNo();
            const status = 'DRAFT'; 
            const dbStatus = mapStatusToDB(status);
            const now = new Date();

            // 2. Prepare Disposition Data
            const rtv = disp.rtv?.selected ? 1 : (disp.rtv === true ? 1 : 0);
            const rtvQty = disp.rtv?.qty || disp.rtvTotalQty || disp.rtvQty || 0;
            const rtvRemarks = disp.rtv?.remarks || disp.rtvRemarks || null;

            const sort = disp.sort?.selected ? 1 : (disp.sort === true ? 1 : 0);
            const sortSorted = disp.sort?.sorted || disp.sortSorted || 0;
            const sortRejected = disp.sort?.rejected || disp.sortRejected || 0;
            const sortRate = disp.sort?.rate || disp.sortRejectRate || 0;
            const sortRemarks = disp.sort?.remarks || disp.sortRemarks || null;
            const sortRework = disp.sort?.rework ? 1 : (disp.sortRework === true ? 1 : 0);

            const other = disp.other?.selected ? 1 : (disp.other === true ? 1 : 0);
            const otherQty = disp.other?.qty || disp.otherAffectedQty || 0;
            const otherDoc = disp.other?.doc || disp.otherAffectedDoc || null;
            const otherRemarks = disp.other?.remarks || disp.otherRemarks || null;

            // 3. Resolve Product ID
            let finalProductId = main.product || data.product_id || data.productId || data.product;
            const finalModelId = main.model || data.model || data.model_id;
            
            if (!finalProductId && finalModelId) {
                // Lookup product_id from MODELS table
                const [modelRows] = await conn.query(
                    'SELECT product_id FROM MODELS WHERE model_id = ?',
                    [finalModelId]
                );
                
                if (modelRows.length > 0) {
                    finalProductId = modelRows[0].product_id;
                } else {
                     console.warn('Warning: Model ID provided but no Product ID found in MODELS table.');
                }
            }

            // 4. Insert MNR_LOTS (Header) - Added report_issuance_8d
            const mnrQuery = `
                INSERT INTO MNR_LOTS (
                    mnr_id, control_no, request_status, date_created, issued_date,
                    site_id, product_id, supplier_id, model_id, mfg_area_id, 
                    defectcategory_id, mnrtype_id, attention_id, 
                    reference_no, report_issuance_8d, recurrence_ref,
                    initial_report_date, due_date, 
                    actual_initial_report_date, actual_final_report_date,
                    rtv, rtv_total_qty, rtv_remarks,
                    sort, sort_sorted, sort_rejected, sort_reject_rate, sort_remarks, sort_rework,
                    other, other_affected_qty, other_affected_doc, other_remarks,
                    encoder_id, encoder_date, issuer_id, issuer_date,
                    checker_id, checker_date, approver_id, approver_date,
                    last_update, updateby, remarks
                ) VALUES (
                    ?, ?, ?, ?, ?, 
                    ?, ?, ?, ?, ?, 
                    ?, ?, ?, 
                    ?, ?, ?, 
                    ?, ?, 
                    ?, ?, 
                    ?, ?, ?, 
                    ?, ?, ?, ?, ?, ?, 
                    ?, ?, ?, ?, 
                    ?, ?, ?, ?, 
                    ?, ?, ?, ?,
                    ?, ?, ?
                )
            `;

            const mnrParams = [
                id, controlNo, dbStatus, now, main.issueDate || data.issueDate || null,
                main.mfgSites || data.mfgSites,     // site_id
                finalProductId,
                main.supplier || data.supplier,     // supplier_id
                finalModelId,                       // model_id
                main.mfgAreas || data.mfgAreas,     // mfg_area_id
                main.category || data.category,     // defectcategory_id
                main.mnrType || data.mnrType,       // mnrtype_id
                main.attention || data.attention,   // attention_id

                main.reference || data.reference || null,    // reference_no
                main.reportIssuance8D ? 1 : 0,               // report_issuance_8d
                main.recurrenceRef || null,                  // recurrence_ref
                
                main.initialReport || data.initialReport || now, // initial_report_date
                main.dueDate || data.dueDate || now,         // due_date
                main.actualInitialReport || data.actualInitialReport || null,
                main.actualFinalReport || data.actualFinalReport || null,

                rtv, rtvQty, rtvRemarks,
                sort, sortSorted, sortRejected, sortRate, sortRemarks, sortRework,
                other, otherQty, otherDoc, otherRemarks,

                userId, now,     // encoder_id, encoder_date
                approval.issuer || userId, now,     // issuer_id, issuer_date
                approval.checker || null, null,     
                approval.approver || null, null,    

                now, userId,     // last_update, updateby
                main.remarks || data.remarks || null
            ];
            
            console.log('📝 [MNR INSERT] Header Params:', JSON.stringify(mnrParams));
            await conn.execute(mnrQuery, mnrParams);

            // 5. Insert MNR_DETAILS (Non-Conformity)
            console.log('📦 [NC DEBUG] Raw nonConformity received:', JSON.stringify(nc));
            const detailId = uuidv4();
            
            // Resolve part_id: prefer explicit partId, fallback to part_id, fallback to Code lookup
            let resolvedPartId = nc.partId || nc.part_id || null;
            const resolvedDefectId = nc.defectId || nc.defect_id || null;
            let resolvedDefectClassId = nc.classification || nc.defectclass_id || null;
            
            // 5a. Lookup Part ID if missing using Code
            if (!resolvedPartId && (nc.partsCode || nc.partCode)) {
                const pCode = nc.partsCode || nc.partCode;
                // Try finding part by code in PARTS table (not PARTCLASS)
                const [parts] = await conn.execute("SELECT part_id FROM dbo.PARTS WHERE part_code = ?", [pCode]);
                if (parts.length > 0) {
                    resolvedPartId = parts[0].part_id;
                    console.log(`✅ Resolved Part ID from Code "${pCode}" -> ${resolvedPartId}`);
                } else {
                    console.warn(`⚠️ Part Code "${pCode}" not found in PARTS.`);
                }
            }
            
            // 5b. Lookup Defect Classification ID if Name provided
            if (resolvedDefectClassId && ['CRITICAL', 'MAJOR', 'MINOR'].includes(resolvedDefectClassId)) {
                 const [classList] = await conn.execute("SELECT defectclass_id FROM dbo.DEFECTCLASS WHERE defectclass_name = ?", [resolvedDefectClassId]);
                 if (classList.length > 0) {
                     resolvedDefectClassId = classList[0].defectclass_id;
                 } else {
                     resolvedDefectClassId = null;
                 }
            } else if (resolvedDefectClassId && resolvedDefectClassId.length < 30) {
                 resolvedDefectClassId = null;
            }
            
            // 5c. Insert Detail
            if (resolvedPartId) {
                const detailQuery = `
                    INSERT INTO MNR_DETAILS (
                        mnr_detail_id, mnr_id, 
                        part_id, defect_id, defectclass_id,
                        defect_qty, ca,
                        inspection_date, invoice_no, invoice_qty,
                        lot_no, lot_size, sample_size,
                        group_line, area_defect, cavity_no, tray_no,
                        encounter_date, verification_date, verified_by,
                        last_update, updateby
                    ) VALUES (
                        ?, ?, 
                        ?, ?, ?, 
                        ?, ?, 
                        ?, ?, ?, 
                        ?, ?, ?, 
                        ?, ?, ?, ?, 
                        ?, ?, ?, 
                        ?, ?
                    )
                `;
                
                await conn.execute(detailQuery, [
                    detailId, id,
                    resolvedPartId,
                    resolvedDefectId,
                    resolvedDefectClassId,
                    nc.ngQty || 0,
                    nc.forCorrectiveAction ? 1 : 0, 
    
                    nc.inspectionDate || null, 
                    nc.invoiceNo || null, 
                    nc.invoiceQty || 0,
    
                    nc.lotNo || null, 
                    nc.lotSize || 0, 
                    nc.sampleSize || 0,
    
                    nc.groupLine || null, 
                    nc.areaDefect || null, 
                    nc.cavityNo || null, 
                    nc.trayNo || null,
    
                    nc.encounteredDate || null, 
                    nc.verificationDate || null, 
                    nc.verifiedBy || null,
    
                    now, userId
                ]);
            } else {
                 console.warn(`⚠️ Skipping MNR_DETAILS insert: No valid Part ID found for Code "${nc.partsCode || nc.partCode}".`);
            }

            // 6. Insert MNR_RESPONSE
            if (response && (Object.keys(response).length > 0)) {
                 const rspId = uuidv4();
                 const rspQuery = `
                    INSERT INTO MNR_RESPONSE (
                        mnr_response_id, mnr_id, mnr_detail_id,
                        d1, d2, d3, d4, d5, d6, d7, d8,
                        marking, label, invoice_no, lot_size, lot_no, eta,
                        rtv_received, replacement_date, replacement_qty, ncv_invoice_no,
                        remarks, attention_date, accept_date,
                        last_update, updateby
                    ) VALUES (
                        ?, ?, ?,
                        ?, ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?,
                        ?, ?
                    )
                 `;
                 
                 // Link response to the specific detail if it exists
                 const linkedDetailId = resolvedPartId ? detailId : null;
                 
                 await conn.execute(rspQuery, [
                     rspId, id, linkedDetailId,
                     response.d1_teamApproach || null,
                     response.d2_problemDescription || null,
                     response.d3_containmentPlan || null,
                     response.d4_rootCause || null,
                     response.d5_correctiveAction || null,
                     response.d6_verificationEffectiveness || null,
                     response.d7_preventRecurrence || null,
                     response.d8_completionApproval || null,
                     
                     response.marking || response.marketing || null, 
                     response.label || null,
                     response.invoiceNo || null,
                     response.lotSize || 0,
                     response.lotNo || null,
                     response.eta || null,
                     
                     response.rtvReceived || null,
                     response.replacementDate || null,
                     response.replacementQty || null,
                     response.ncvInvoiceNo || null,
                     response.remarks || null,
                     response.attentionDate || null,
                     response.acceptDate || null,

                     now, userId
                 ]);
            }

            // 7. Insert CC List
            if (data.ccList && Array.isArray(data.ccList)) {
                const ccQuery = `INSERT INTO MNR_CC (mnr_cc_id, mnr_id, user_id, last_update, updateby) VALUES (?, ?, ?, ?, ?)`;
                for (const cc of data.ccList) {
                     if (cc.id && cc.id.length > 30) { 
                        const ccId = uuidv4();
                        await conn.execute(ccQuery, [ccId, id, cc.id, now, userId]);
                     }
                }
            }

            // 8. Insert Attachments
            if (data.attachments && Array.isArray(data.attachments)) {
                const attQuery = `INSERT INTO MNR_ATTACHMENT (mnr_attachment_id, mnr_id, file_name, file_extension, remarks, last_update, updateby) VALUES (?, ?, ?, ?, ?, ?, ?)`;
                for (const att of data.attachments) {
                    const attId = uuidv4();
                    
                    // Match uploaded file (Multer's unique name vs original)
                    const uploadedFile = (req.files || []).find(f => f.originalname === att.fileName);
                    const diskFileName = uploadedFile ? uploadedFile.filename : att.fileName;
                    const originalName = att.fileName;
                    const ext = diskFileName ? diskFileName.split('.').pop() : (att.fileName ? att.fileName.split('.').pop() : 'dat');
                    
                    // Preserve original filename in remarks
                    const finalRemarks = att.remarks ? `${att.remarks} (Original: ${originalName})` : `Original: ${originalName}`;

                    await conn.execute(attQuery, [
                        attId, id, 
                        diskFileName || 'Unknown', 
                        ext, 
                        finalRemarks, 
                        now, userId
                    ]);
                }
            }

            return { id, controlNo, status };
        });

        res.status(201).json(result);

    } catch (error) {
        console.error('Error creating MNR:', error);
        res.status(500).json({ error: error.message });
    }
};

export const getAllRecords = async (req, res) => {
    try {
        const { status } = req.query;
        
        let query = `
            SELECT 
                l.mnr_id as id,
                l.control_no,
                l.request_status as status,
                l.date_created,
                l.site_id, st.site_name,
                l.supplier_id, s.supplier_name,
                l.model_id, m.model_name, m.model_no,
                l.product_id, p.product_name,
                l.mfg_area_id, ma.mfg_area_name,
                l.defectcategory_id, dc.defectcategory_name as category_name, 
                l.mnrtype_id, mt.mnrtype_name as mnr_type_name,
                
                -- Part Details (from first line item)
                d.part_id, pc.part_name as part_name,
                pc.part_code as part_code,
                -- We don't have part_code in PARTCLASS yet, using name or checking if 'code' exists
                
                l.reference_no,
                l.report_issuance_8d,
                l.issued_date,
                l.initial_report_date,
                l.due_date,
                l.last_update,
                l.updateby,
                u.full_name as encoder_name,
                attn.full_name as attention_name,
                iss.full_name as issuer_name,
                chk.full_name as checker_name,
                app.full_name as approver_name
            FROM MNR_LOTS l
            LEFT JOIN dbo.MFG_SITES st ON l.site_id = st.site_id
            LEFT JOIN dbo.SUPPLIERS s ON l.supplier_id = s.supplier_id
            LEFT JOIN dbo.MODELS m ON l.model_id = m.model_id
            LEFT JOIN dbo.PRODUCTS p ON l.product_id = p.product_id
            LEFT JOIN dbo.MFG_AREAS ma ON l.mfg_area_id = ma.mfg_area_id
            LEFT JOIN dbo.DEFECTCATEGORIES dc ON l.defectcategory_id = dc.defectcategory_id
            LEFT JOIN dbo.MNRTYPE mt ON l.mnrtype_id = mt.mnrtype_id
            LEFT JOIN dbo.USERS u ON l.encoder_id = u.user_id
            LEFT JOIN dbo.USERS attn ON l.attention_id = attn.user_id
            LEFT JOIN dbo.USERS iss ON l.issuer_id = iss.user_id
            LEFT JOIN dbo.USERS chk ON l.checker_id = chk.user_id
            LEFT JOIN dbo.USERS app ON l.approver_id = app.user_id
            
            -- Join Details for Part Info (Assuming 1 record per MNR for main part)
            LEFT JOIN dbo.MNR_DETAILS d ON l.mnr_id = d.mnr_id
            LEFT JOIN dbo.PARTS pc ON d.part_id = pc.part_id
        `;
        
        const params = [];
        if (status) {
            let dbStatus = mapStatusToDB(status.toUpperCase());
            query += ` WHERE l.request_status = ?`;
            params.push(dbStatus);
        }

        query += ` ORDER BY l.date_created DESC`;

        const [rows] = await db.query(query, params);
        console.log("MNR Fetch Debug - Raw Rows Found:", rows.length);
        
        // Map to Flat DTO
        const mapped = rows.map(r => ({
            id: r.id,
            control_no: r.control_no,
            status: mapStatusFromDB(r.status), 
            created_at: r.date_created,
            
            // Names (Explicitly joined)
            supplier_name: r.supplier_name,
            model_name: r.model_name,
            product_name: r.product_name,
            site_name: r.site_name,
            encoder_name: r.encoder_name,
            issuer_name: r.issuer_name,
            checker_name: r.checker_name,
            approver_name: r.approver_name,
            
            mnr_type_name: r.mnr_type_name, 
            category_name: r.category_name, 
            attention_name: r.attention_name, 

            // Legacy/FK fields (snake_case)
            site_id: r.site_id,
            mfg_sites: r.site_id, 

            supplier_id: r.supplier_id,
            
            model_id: r.model_id,
            model: r.model_name || r.model_id, 

            product_id: r.product_id,
            productDisplay: r.product_name,

            mfg_area_id: r.mfg_area_id,
            mfg_area_name: r.mfg_area_name, 
            mfg_areas: r.mfg_area_name || r.mfg_area_id, 

            defectcategory_id: r.defectcategory_id,
            mnrtype_id: r.mnrtype_id,
            
            // Dates & Info
            reference: r.reference_no,
            report_issuance_8d: !!r.report_issuance_8d,
            issue_date: r.issued_date,
            initial_report_date: r.initial_report_date,
            due_date: r.due_date,
            
            // Non-Conformity
            non_conformity: {
                part_name: r.part_name,
                part_code: r.part_code,
            },

            // Meta
            updated_at: r.last_update,
            created_by: r.encoder_name,
            
            recurrence_ref: r.reference_no
        }));

        console.log("MNR Fetch Debug - Sending Filtered Response");
        // console.log(JSON.stringify(mapped, null, 2)); // Too verbose for production, uncomment if needed

        res.json({ data: mapped });
    } catch (error) {
        console.error('Error fetching MNRs:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

        export const getRecordById = async (req, res) => {
            const { id } = req.params;
            try {
                // JOIN all master data tables for human-readable names
                const query = `
                    SELECT 
                        l.*,
                        st.site_name,
                        s.supplier_name,
                        m.model_name, m.model_no,
                        p.product_name,
                        ma.mfg_area_name,
                        dc.defectcategory_name as category_name,
                        mt.mnrtype_name as mnr_type_name,
                        attn.full_name as attention_name,
                        enc.full_name as encoder_name,
                        iss.full_name as issuer_name,
                        chk.full_name as checker_name,
                        app.full_name as approver_name
                    FROM MNR_LOTS l
                    LEFT JOIN dbo.MFG_SITES st ON l.site_id = st.site_id
                    LEFT JOIN dbo.SUPPLIERS s ON l.supplier_id = s.supplier_id
                    LEFT JOIN dbo.MODELS m ON l.model_id = m.model_id
                    LEFT JOIN dbo.PRODUCTS p ON l.product_id = p.product_id
                    LEFT JOIN dbo.MFG_AREAS ma ON l.mfg_area_id = ma.mfg_area_id
                    LEFT JOIN dbo.DEFECTCATEGORIES dc ON l.defectcategory_id = dc.defectcategory_id
                    LEFT JOIN dbo.MNRTYPE mt ON l.mnrtype_id = mt.mnrtype_id
                    LEFT JOIN dbo.USERS attn ON l.attention_id = attn.user_id
                    LEFT JOIN dbo.USERS enc ON l.encoder_id = enc.user_id
                    LEFT JOIN dbo.USERS iss ON l.issuer_id = iss.user_id
                    LEFT JOIN dbo.USERS chk ON l.checker_id = chk.user_id
                    LEFT JOIN dbo.USERS app ON l.approver_id = app.user_id
                    WHERE l.mnr_id = ? OR l.control_no = ?
                `;
                
                const [rows] = await db.query(query, [id, id]);
                if (rows.length === 0) return res.status(404).json({ error: 'Not Found' });

                const record = rows[0];
                
                // Get Details
                const detailsQuery = `
                    SELECT 
                        d.*,
                        pc.part_name as part_name,
                        pc.part_code as part_code,
                        df.defect_name,
                        dfc.defectclass_name as classification_name
                    FROM MNR_DETAILS d
                    LEFT JOIN dbo.PARTS pc ON d.part_id = pc.part_id
                    LEFT JOIN dbo.DEFECTS df ON d.defect_id = df.defect_id
                    LEFT JOIN dbo.DEFECTCLASS dfc ON d.defectclass_id = dfc.defectclass_id
                    WHERE d.mnr_id = ?
                `;
                const [details] = await db.query(detailsQuery, [record.mnr_id]);
                console.log(`📋 MNR_DETAILS for ${record.mnr_id}:`, details.length, 'rows', details.length > 0 ? details[0] : 'NO DATA');
                const nc = details.length > 0 ? details[0] : {};
                
                // Get Response
                const responseQuery = `
                    SELECT r.*, u.full_name as responded_by_name 
                    FROM MNR_RESPONSE r
                    LEFT JOIN dbo.USERS u ON r.updateby = u.user_id
                    WHERE r.mnr_id = ?
                `;
                const [responses] = await db.query(responseQuery, [record.mnr_id]);
                const rsp = responses.length > 0 ? responses[0] : {};

                // Get CC List
                const ccQuery = `
                    SELECT c.*, u.full_name, u.email
                    FROM MNR_CC c
                    LEFT JOIN dbo.USERS u ON c.user_id = u.user_id
                    WHERE c.mnr_id = ?
                `;
                const [ccRows] = await db.query(ccQuery, [record.mnr_id]);
                
                // Get Attachments
                const attQuery = `SELECT * FROM MNR_ATTACHMENT WHERE mnr_id = ?`;
                const [attRows] = await db.query(attQuery, [record.mnr_id]);
                
                const mapped = {
                    id: record.mnr_id,
                    controlNo: record.control_no,
                    status: mapStatusFromDB(record.request_status),
                    dateCreated: record.date_created,
                    
                    supplierName: record.supplier_name,
                    siteName: record.site_name,
                    modelName: record.model_name,
                    productName: record.product_name,
                    categoryName: record.category_name,
                    mnrTypeName: record.mnr_type_name,
                    attentionName: record.attention_name,
                    encoderName: record.encoder_name,
                    partName: nc.part_name || '',
                    partCode: nc.part_code || '',
                    
                    mainDetails: {
                        mfgSites: record.site_id,
                        supplier: record.supplier_id,
                        product: record.product_id,
                        model: record.model_id,
                        mfgAreas: record.mfg_area_id,
                        category: record.defectcategory_id,
                        mnrType: record.mnrtype_id,
                        attention: record.attention_id,
                        
                        mfgSitesDisplay: record.site_name || 'Unknown Site',
                        supplierDisplay: record.supplier_name || 'Unknown Supplier',
                        productDisplay: record.product_name || '',
                        modelDisplay: record.model_name || 'Unknown Model',
                        mfgAreasDisplay: record.mfg_area_name || 'Unknown Area',
                        categoryDisplay: record.category_name || 'Unknown Category',
                        mnrTypeDisplay: record.mnr_type_name || 'Unknown Type',
                        attentionDisplay: record.attention_name || 'Unknown',
                        
                        reference: record.reference_no,
                        issueDate: record.issued_date,
                        initialReport: record.initial_report_date,
                        due_date: record.due_date,
                        actualInitialReport: record.actual_initial_report_date,
                        actualFinalReport: record.actual_final_report_date,
                        remarks: record.remarks,
                        reportIssuance8D: !!record.report_issuance_8d,
                        recurrenceReference: record.recurrence_ref
                    },
                    nonConformity: {
                        partId: nc.part_id,
                        defectId: nc.defect_id,
                        
                        partsCode: nc.part_code || '',
                        partsName: nc.part_name || '',
                        defectName: nc.defect_name || '',
                        classification: nc.defectclass_id,
                        classificationDisplay: nc.classification_name || nc.defectclass_id || '',
                        
                        ngQty: nc.defect_qty,
                        forCorrectiveAction: !!nc.ca,
                        inspectionDate: nc.inspection_date,
                        invoiceNo: nc.invoice_no,
                        invoiceQty: nc.invoice_qty,
                        lotNo: nc.lot_no,
                        lotSize: nc.lot_size,
                        sampleSize: nc.sample_size,
                        groupLine: nc.group_line,
                        areaDefect: nc.area_defect,
                        cavityNo: nc.cavity_no,
                        trayNo: nc.tray_no,
                        encounteredDate: nc.encounter_date,
                        verificationDate: nc.verification_date,
                        verifiedBy: nc.verified_by
                    },
                    disposition: {
                        rtv: { selected: !!record.rtv, qty: record.rtv_total_qty, remarks: record.rtv_remarks },
                        sort: { 
                            selected: !!record.sort, 
                            sorted: record.sort_sorted, 
                            rejected: record.sort_rejected, 
                            rate: record.sort_reject_rate, 
                            remarks: record.sort_remarks,
                            rework: !!record.sort_rework
                        },
                        other: { selected: !!record.other, qty: record.other_affected_qty, doc: record.other_affected_doc, remarks: record.other_remarks }
                    },
                    response8D: {
                        d1_teamApproach: rsp.d1,
                        d2_problemDescription: rsp.d2,
                        d3_containmentPlan: rsp.d3,
                        d4_rootCause: rsp.d4,
                        d5_correctiveAction: rsp.d5,
                        d6_verificationEffectiveness: rsp.d6,
                        d7_preventRecurrence: rsp.d7,
                        d8_completionApproval: rsp.d8,
                        marketing: rsp.marking,
                        label: rsp.label,
                        invoiceNo: rsp.invoice_no,
                        lotSize: rsp.lot_size,
                        lotNo: rsp.lot_no,
                        eta: rsp.eta
                    },
                    approval: {
                        issuer: record.issuer_id,
                        issuerName: record.issuer_name,
                        issuerDate: record.issuer_date,
                        checker: record.checker_id,
                        checkerName: record.checker_name,
                        checkerDate: record.checker_date,
                        approver: record.approver_id,
                        approverName: record.approverI_name,
                        approverDate: record.approver_date, // Fixed mapped field
                        submitDate: record.date_created
                    },
                    meta: {
                        createdBy: record.encoder_id,
                        createdByName: record.encoder_name,
                        lastUpdated: record.last_update,
                        updatedBy: record.updateby
                    },
                    attachments: attRows,
                    cc: ccRows
                };

                res.json({ data: mapped });

            } catch (error) {
                console.error('Error fetching MNR:', error);
                res.status(500).json({ error: error.message });
            }
        };

export const updateRecord = async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    let userId = req.user?.id; 

    if (!userId) {
         const [sysUsers] = await db.query("SELECT TOP 1 user_id FROM dbo.USERS WHERE full_name LIKE '%Admin%'");
         if (sysUsers.length > 0) userId = sysUsers[0].user_id;
    }
    
    // Normalize Data (Handling Update Payload)
    // Sometimes updates are partial, sometimes full nested
    // Frontend Update sends { updates: payload }, payload has nested mainDetails
    // But backend generally expects the payload directly in body for updates
    // Let's assume data is the payload.
    const main = data.mainDetails || {};
    const disp = data.disposition || data.disposition_data || {};
    const nc = data.nonConformity || {};

    try {
        await withTransaction(async (conn) => {
            const [existing] = await conn.query('SELECT mnr_id FROM MNR_LOTS WHERE mnr_id = ? OR control_no = ?', [id, id]);
            if (existing.length === 0) throw new Error('Not Found');
            const recordId = existing[0].mnr_id;
            const now = new Date();

            const dbUpdates = {};
            if (data.status) dbUpdates.request_status = mapStatusToDB(data.status);
            
            // Standard Fields - Check both nested (main) and flat (data)
            if (main.mfgSites || data.mfgSites) dbUpdates.site_id = main.mfgSites || data.mfgSites;
            if (main.supplier || data.supplier) dbUpdates.supplier_id = main.supplier || data.supplier;
            else if (data.supplierId) dbUpdates.supplier_id = data.supplierId;
            if (main.model || data.model) dbUpdates.model_id = main.model || data.model;
            if (main.mfgAreas || data.mfgAreas) dbUpdates.mfg_area_id = main.mfgAreas || data.mfgAreas;
            if (main.category || data.category) dbUpdates.defectcategory_id = main.category || data.category;
            if (main.mnrType || data.mnrType) dbUpdates.mnrtype_id = main.mnrType || data.mnrType;
            if (main.attention || data.attention) dbUpdates.attention_id = main.attention || data.attention;
            if (main.reference || data.reference) dbUpdates.reference_no = main.reference || data.reference;
            if (main.reportIssuance8D !== undefined) dbUpdates.report_issuance_8d = main.reportIssuance8D ? 1 : 0; // New

            if (data.issueDate || main.issueDate) dbUpdates.issued_date = data.issueDate || main.issueDate;
            if (data.initialReport || main.initialReport) dbUpdates.initial_report_date = data.initialReport || main.initialReport;
            if (data.dueDate || main.dueDate) dbUpdates.due_date = data.dueDate || main.dueDate;
            if (data.actualInitialReport) dbUpdates.actual_initial_report_date = data.actualInitialReport;
            if (data.actualFinalReport) dbUpdates.actual_final_report_date = data.actualFinalReport;
            if (data.remarks || main.remarks) dbUpdates.remarks = data.remarks || main.remarks;
            
            // Disposition Update
            // If disp object exists, we update fields. If undefined, we assume no change.
            // But checking Object.keys(disp).length > 0 if it was sent as empty object?
            if (disp.rtv) {
                dbUpdates.rtv = disp.rtv.selected ? 1 : 0;
                if (disp.rtv.qty !== undefined) dbUpdates.rtv_total_qty = disp.rtv.qty; // Flattened used qty for total in some contexts?
                if (disp.rtv.remarks !== undefined) dbUpdates.rtv_remarks = disp.rtv.remarks;
            }
            if (disp.sort) {
                dbUpdates.sort = disp.sort.selected ? 1 : 0;
                if (disp.sort.sorted !== undefined) dbUpdates.sort_sorted = disp.sort.sorted;
                if (disp.sort.rejected !== undefined) dbUpdates.sort_rejected = disp.sort.rejected;
                if (disp.sort.rate !== undefined) dbUpdates.sort_reject_rate = disp.sort.rate;
                if (disp.sort.remarks !== undefined) dbUpdates.sort_remarks = disp.sort.remarks;
                if (disp.sort.rework !== undefined) dbUpdates.sort_rework = disp.sort.rework ? 1 : 0;
            }
            if (disp.other) {
                dbUpdates.other = disp.other.selected ? 1 : 0;
                if (disp.other.qty !== undefined) dbUpdates.other_affected_qty = disp.other.qty;
                if (disp.other.doc !== undefined) dbUpdates.other_affected_doc = disp.other.doc;
                if (disp.other.remarks !== undefined) dbUpdates.other_remarks = disp.other.remarks;
            }

            // APPROVAL
            if (data.status) {
                stampApprovalFields(dbUpdates, data.status, userId, data.remarks, now, data.approval || {});
            } else {
                dbUpdates.last_update = now;
                dbUpdates.updateby = userId;
            }
            
            const updates = Object.keys(dbUpdates).map(key => `${key} = ?`);
            const values = Object.values(dbUpdates);

            if (updates.length > 0) {
                values.push(recordId);
                await conn.execute(`UPDATE MNR_LOTS SET ${updates.join(', ')} WHERE mnr_id = ?`, values);
            }

             // 3. Update Non-Conformity (MNR_DETAILS)
            if (Object.keys(nc).length > 0) {
                const [ncExist] = await conn.query('SELECT mnr_detail_id FROM MNR_DETAILS WHERE mnr_id = ?', [recordId]);
                
                if (ncExist.length > 0) {
                    const ncUpdates = [];
                    const ncValues = [];
                    const ncMap = {
                        partId: 'part_id', defectId: 'defect_id', classification: 'defectclass_id',
                        ngQty: 'defect_qty', ca: 'ca', inspectionDate: 'inspection_date',
                        invoiceNo: 'invoice_no', invoiceQty: 'invoice_qty',
                        lotNo: 'lot_no', lotSize: 'lot_size', sampleSize: 'sample_size',
                        groupLine: 'group_line', areaDefect: 'area_defect',
                        cavityNo: 'cavity_no', trayNo: 'tray_no', 
                        encounteredDate: 'encounter_date', verificationDate: 'verification_date', 
                        verifiedBy: 'verified_by'
                    };
                    
                    Object.keys(ncMap).forEach(key => {
                        if (nc[key] !== undefined) {
                            let value = nc[key];
                            if (typeof value === 'string' && value.trim() === '') value = null;
                            
                            if (key === 'ca') {
                                ncUpdates.push(`${ncMap[key]} = ?`);
                                ncValues.push(value ? 1 : 0);
                            } else {
                                ncUpdates.push(`${ncMap[key]} = ?`);
                                ncValues.push(value);
                            }
                        }
                    });
                    
                    if (ncUpdates.length > 0) {
                        ncUpdates.push('last_update = ?');
                        ncValues.push(now);
                        ncUpdates.push('updateby = ?');
                        ncValues.push(userId);
                        
                        ncValues.push(recordId);
                        await conn.execute(`UPDATE MNR_DETAILS SET ${ncUpdates.join(', ')} WHERE mnr_id = ?`, ncValues);
                    }
                }
            }
            
            // 4. Update Response (MNR_RESPONSE)
            if (data.response8D) {
                 const rsp = data.response8D;
                 const [rspExist] = await conn.query('SELECT mnr_response_id FROM MNR_RESPONSE WHERE mnr_id = ?', [recordId]);
                 
                 const rspMap = {
                     d1: 'd1', d2: 'd2', d3: 'd3', d4: 'd4', d5: 'd5', d6: 'd6', d7: 'd7', d8: 'd8',
                     marketing: 'marking', marking: 'marking',
                     label: 'label', invoiceNo: 'invoice_no',
                     lotSize: 'lot_size', lotNo: 'lot_no', eta: 'eta',
                     rtvReceived: 'rtv_received', replacementDate: 'replacement_date', 
                     replacementQty: 'replacement_qty', ncvInvoiceNo: 'ncv_invoice_no',
                     remarks: 'remarks', attentionDate: 'attention_date', acceptDate: 'accept_date'
                 };
                 
                 const rspUpdates = [];
                 const rspValues = [];
                 
                 Object.keys(rspMap).forEach(key => {
                     if (rsp[key] !== undefined) {
                         rspUpdates.push(`${rspMap[key]} = ?`);
                         rspValues.push(rsp[key]);
                     }
                 });
                 
                 if (rspUpdates.length > 0) {
                     rspUpdates.push('last_update = ?');
                     rspValues.push(now);
                     rspUpdates.push('updateby = ?');
                     rspValues.push(userId);
                     
                     if (rspExist.length > 0) {
                         rspValues.push(recordId);
                         await conn.execute(`UPDATE MNR_RESPONSE SET ${rspUpdates.join(', ')} WHERE mnr_id = ?`, rspValues);
                     }
                 }
            }

            // 5. Update CC List (Delete All + Re-Insert strategy)
            if (data.ccList && Array.isArray(data.ccList)) {
                await conn.execute('DELETE FROM MNR_CC WHERE mnr_id = ?', [recordId]);
                if (data.ccList.length > 0) {
                    const ccQuery = `INSERT INTO MNR_CC (mnr_cc_id, mnr_id, user_id, last_update, updateby) VALUES (?, ?, ?, ?, ?)`;
                    for (const cc of data.ccList) {
                        const ccId = uuidv4();
                        if (cc.id || cc.userId) {
                            await conn.execute(ccQuery, [ccId, recordId, cc.id || cc.userId, now, userId]);
                        }
                    }
                }
            }

            // 6. Update Attachments (Delete All + Re-Insert strategy)
            if (data.attachments && Array.isArray(data.attachments)) {
                 await conn.execute('DELETE FROM MNR_ATTACHMENT WHERE mnr_id = ?', [recordId]);
                 if (data.attachments.length > 0) {
                     const attQuery = `INSERT INTO MNR_ATTACHMENT (mnr_attachment_id, mnr_id, file_name, file_extension, remarks, last_update, updateby) VALUES (?, ?, ?, ?, ?, ?, ?)`;
                     for (const att of data.attachments) {
                         const attId = uuidv4();
                         
                         // Match uploaded file (Multer's unique name vs original)
                         const uploadedFile = (req.files || []).find(f => f.originalname === att.fileName);
                         const diskFileName = uploadedFile ? uploadedFile.filename : att.fileName;
                         const originalName = att.fileName;
                         const ext = diskFileName ? diskFileName.split('.').pop() : (att.fileName ? att.fileName.split('.').pop() : 'dat');
                        
                         // Preserve original filename in remarks
                         const finalRemarks = att.remarks ? `${att.remarks} (Original: ${originalName})` : `Original: ${originalName}`;

                         await conn.execute(attQuery, [
                             attId, recordId, 
                             diskFileName || 'Unknown', 
                             ext, 
                             finalRemarks, 
                             now, userId
                         ]);
                     }
                 }
            }

        });
        
        res.json({ message: 'Updated' });
    } catch (error) {
         console.error('Update Error', error);
         res.status(500).json({ error: error.message });
    }
};

export const deleteRecords = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'No IDs provided' });
        }

        const placeholders = ids.map(() => '?').join(',');
        const query = `DELETE FROM MNR_LOTS WHERE mnr_id IN (${placeholders})`; 
        
        const detailsQuery = `DELETE FROM MNR_DETAILS WHERE mnr_id IN (${placeholders})`;
        await db.query(detailsQuery, ids);
        
        const [result] = await db.query(query, ids);

        res.json({ message: 'Deleted successfully', count: result.affectedRows });
    } catch (error) {
        console.error('Delete Error:', error);
        res.status(500).json({ error: error.message });
    }
};
    