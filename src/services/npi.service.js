import { getPool as getDb, sql } from '../config/db.js';
import crypto from 'crypto';
import { npiRepository } from '../repositories/npi.repository.js';
import { mapToDTO, mapStatusToDB, safeDate } from '../utils/npi.mapper.js';

export const npiService = {

    async getAllRecords(filters = {}) {
        const records = await npiRepository.findAllRecords(filters);
        return records.map(mapToDTO);
    },

    async getRecordById(id) {
        const row = await npiRepository.findFullRecord(id);
        if (!row) return null;
        
        const children = await npiRepository.findChildren(row.npi_lot_id);
        return mapToDTO({ ...row, ...children });
    },

    async createRecord(data) {
        const pool = await getDb();
        const transaction = new sql.Transaction(pool);
        
        try {
            await transaction.begin();

            const npiId = crypto.randomUUID();
            const defaultUserId = '6a15b66a-079b-433b-b70f-dc15dce25631';
            const userId = data.createdBy && data.createdBy !== 'current_user' ? data.createdBy : defaultUserId;
            const dbStatus = mapStatusToDB(data.status || 'DRAFT');

            // --- 1. Prepare Main Record ---
            const mainData = {
                npi_lot_id: npiId,
                control_no: data.controlNo,
                datecreated: new Date(),
                site_id: data.siteId,
                supplier_id: data.supplierId,
                part_id: data.partId,
                model_id: data.model,
                lot_no: data.lotNo || '',
                lot_size: Number(data.lotSize) || 0,
                invoice_no: data.invoiceNo,
                po_no: data.poNo || '',
                inspectionmethod_id: data.inspectionMethod,
                inspection_temp: Number(data.inspectionTemp) || 0,
                inspection_hum: Number(data.inspectionHum) || 0,
                starttime: Number(data.startTime) || 0,
                endtime: Number(data.endTime) || 0,
                severity_id: data.severity,
                severity_seq: data.severity_seq, // Added
                sample_size: Number(data.sampleSize) || 0,
                disposition_id: data.disposition,
                inspection_date: safeDate(data.inspectionDate),
                delivery_date: safeDate(data.deliveryDate),
                inspected_by_id: await npiRepository.findDefaultInspector(),
                inspectioncat_id: data.inspectionCategory || null,
                receivetime: Number(data.receivedTime) || 0,
                endorsetime: Number(data.endorseTime) || 0,
                data_verified_by_id: data.dataVerifiedBy,
                inspector_id: userId,
                total_minor: Number(data.total_minor) || 0,
                total_major: Number(data.total_major) || 0,
                total_critical: Number(data.total_critical) || 0,
                ssi_accept: 1,
                judgment: data.judgment, // Added
                request_status: dbStatus,
                last_update: new Date(),
                updateby: userId,
                rohs_verification: data.rohsVerification,
                rohs_verification: data.rohsVerification,
                reference_mnr_no: data.referenceMnrNo,
                inspector_remarks: data.inspectorRemarks
            };
            
            // Clean undefineds before insert? BaseRepo handles it by skipping.
            // But we want explicit nulls where needed. Schema doesn't force defaults yet except logic above.

            console.log('[NPI-DB] INSERTING NPI_LOTS:', { npi_lot_id: npiId, control_no: data.controlNo, status: dbStatus });
            await npiRepository.insert(transaction, mainData);

            // --- 2. Attachments ---
            if (data.attachments) {
                const atts = typeof data.attachments === 'string' ? JSON.parse(data.attachments) : data.attachments;
                if (Array.isArray(atts) && atts.length > 0) {
                    const items = atts.map(att => ({
                        npi_attachment_id: crypto.randomUUID(),
                        npi_lot_id: npiId,
                        file_name: att.fileName,
                        remarks: att.remarks || '',
                        last_update: new Date(),
                        updateby: userId
                    }));
                    await npiRepository.attRepo.insertBulk(transaction, items);
                }
            }

            // --- 3. Visual Cats ---
            if (data.visual_categories && data.visual_categories !== 'undefined') {
                const visuals = typeof data.visual_categories === 'string' ? JSON.parse(data.visual_categories) : data.visual_categories;
                if (Array.isArray(visuals) && visuals.length > 0) {
                     const items = visuals.map(vis => ({
                        npi_visualcat_id: crypto.randomUUID(),
                        npi_lot_id: npiId,
                        defectclass_id: vis.defectclass_id,
                        defect_id: vis.defect_id,
                        quantity: Number(vis.quantity) || 0,
                        last_update: new Date(),
                        updateby: userId
                    }));
                    await npiRepository.visualRepo.insertBulk(transaction, items);
                }
            }

            // --- 4. Data Cats ---
            if (data.data_categories && data.data_categories !== 'undefined') {
                const datacats = typeof data.data_categories === 'string' ? JSON.parse(data.data_categories) : data.data_categories;
                if (Array.isArray(datacats) && datacats.length > 0) {
                     const items = datacats.map(d => ({
                        npi_datacat_id: crypto.randomUUID(),
                        npi_lot_id: npiId,
                        partdatacategory_name: d.partdatacategory_name,
                        std_min: Number(d.std_min) || 0,
                        std_max: Number(d.std_max) || 0,
                        actual_min: d.actual_min != null ? Number(d.actual_min) : null,
                        actual_max: d.actual_max != null ? Number(d.actual_max) : null,
                        cpk: d.cpk ? Number(d.cpk) : null,
                        remarks: d.remarks || '',
                        last_update: new Date(),
                        updateby: userId
                    }));
                    await npiRepository.dataRepo.insertBulk(transaction, items);
                }
            }

            // --- 5. CC List ---
            if (data.cc_list && data.cc_list !== 'undefined') {
                const cclist = typeof data.cc_list === 'string' ? JSON.parse(data.cc_list) : data.cc_list;
                if (Array.isArray(cclist) && cclist.length > 0) {
                    const items = cclist.filter(cc => cc.user_id).map(cc => ({
                        npi_cc_id: crypto.randomUUID(),
                        npi_lot_id: npiId,
                        user_id: cc.user_id,
                        last_update: new Date(),
                        updateby: userId
                    }));
                    await npiRepository.ccRepo.insertBulk(transaction, items);
                }
            }

            await transaction.commit();
            return { id: npiId, message: 'NPI Record created' };

        } catch (error) {
            if (transaction._active) await transaction.rollback();
            throw error;
        }
    },

    async updateRecord(id, data) {
        const pool = await getDb();
        const transaction = new sql.Transaction(pool);

        try {
            await transaction.begin();

            const userId = data.updateBy || data.createdBy || '6a15b66a-079b-433b-b70f-dc15dce25631';
            const realId = await npiRepository.resolveId(transaction, id);
            if (!realId) throw new Error('Record not found');

            const validInspectionDate = data.inspectionDate ? safeDate(data.inspectionDate) : null;
            const validDeliveryDate = data.deliveryDate ? safeDate(data.deliveryDate) : null;

            // --- 1. Prepare Update Data ---
            const updateData = {
                request_status: mapStatusToDB(data.status),
                site_id: data.siteId,
                supplier_id: data.supplierId,
                part_id: data.partId,
                model_id: data.model,
                lot_no: data.lotNo,
                lot_size: Number(data.lotSize),
                invoice_no: data.invoiceNo,
                po_no: data.poNo,
                inspectionmethod_id: data.inspectionMethod,
                inspection_temp: Number(data.inspectionTemp),
                inspection_hum: Number(data.inspectionHum),
                starttime: Number(data.startTime),
                endtime: Number(data.endTime),
                severity_id: data.severity,
                severity_seq: data.severity_seq, // Added
                sample_size: Number(data.sample_size),
                disposition_id: data.disposition,
                inspection_date: validInspectionDate,
                delivery_date: validDeliveryDate,
                inspected_by_id: data.inspectedBy,
                inspectioncat_id: data.inspectionCategory,
                receivetime: Number(data.receivedTime),
                endorsetime: Number(data.endorseTime),
                data_verified_by_id: data.dataVerifiedBy,
                rohs_verification: data.rohsVerification,
                reference_mnr_no: data.referenceMnrNo,
                inspector_remarks: data.inspectorRemarks,
                checker_remarks: data.checkerRemarks,
                approver_remarks: data.approverRemarks,
                
                total_minor: Number(data.total_minor),
                total_major: Number(data.total_major),
                total_critical: Number(data.total_critical),
                
                judgment: data.judgment, // Added

                last_update: new Date(),
                updateby: userId
            };

            console.log('[NPI-DB] UPDATING NPI_LOTS:', { id: realId, updateby: userId });
            await npiRepository.update(transaction, realId, updateData);

            // --- 2. Update Children (Delete + Insert Strategy) ---

            const updateChild = async (repo, items, mapFn) => {
                await repo.deleteByParent(transaction, realId, 'npi_lot_id');
                if (Array.isArray(items) && items.length > 0) {
                     await repo.insertBulk(transaction, items.map(mapFn));
                }
            };

            if (data.visual_categories && data.visual_categories !== 'undefined') {
                const visuals = typeof data.visual_categories === 'string' ? JSON.parse(data.visual_categories) : data.visual_categories;
                await updateChild(npiRepository.visualRepo, visuals, vis => ({
                    npi_visualcat_id: crypto.randomUUID(),
                    npi_lot_id: realId,
                    defectclass_id: vis.defectclass_id,
                    defect_id: vis.defect_id,
                    quantity: Number(vis.quantity) || 0,
                    last_update: new Date(),
                    updateby: userId
                }));
            }

             if (data.data_categories && data.data_categories !== 'undefined') {
                const datacats = typeof data.data_categories === 'string' ? JSON.parse(data.data_categories) : data.data_categories;
                await updateChild(npiRepository.dataRepo, datacats, d => ({
                    npi_datacat_id: crypto.randomUUID(),
                    npi_lot_id: realId,
                    partdatacategory_name: d.partdatacategory_name,
                    std_min: Number(d.std_min) || 0,
                    std_max: Number(d.std_max) || 0,
                    actual_min: d.actual_min != null ? Number(d.actual_min) : null,
                    actual_max: d.actual_max != null ? Number(d.actual_max) : null,
                    cpk: d.cpk ? Number(d.cpk) : null,
                    remarks: d.remarks || '',
                    last_update: new Date(),
                    updateby: userId
                }));
            }
            
            if (data.cc_list && data.cc_list !== 'undefined') {
                const cclist = typeof data.cc_list === 'string' ? JSON.parse(data.cc_list) : data.cc_list;
                await updateChild(npiRepository.ccRepo, cclist ? cclist.filter(c=>c.user_id) : [], cc => ({
                    npi_cc_id: crypto.randomUUID(),
                    npi_lot_id: realId,
                    user_id: cc.user_id,
                    last_update: new Date(),
                    updateby: userId
                }));
            }

            await transaction.commit();
            return { message: 'NPI Record updated', id: realId };

        } catch (error) {
            if (transaction._active) await transaction.rollback();
            throw error;
        }
    },

    async getStats() {
        const stats = await npiRepository.getStats();
        const summary = { pending: 0, approved: 0, rejected: 0, draft: 0 };
        stats.forEach(row => {
          const code = row.status || 'DR';
          if (code === 'PD') summary.pending = row.count;
          else if (code === 'AP') summary.approved = row.count;
          else if (code === 'RJ') summary.rejected = row.count;
          else if (code === 'DR') summary.draft = row.count;
        });
        return summary;
    },

    async generateSequence(siteId) {
        if (!siteId) throw new Error('Site Code required');
        const now = new Date();
        const prefix = `DRF-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-`;

        const lastControlNo = await npiRepository.getNextSequence(prefix);
        let nextSeq = 1;
        if (lastControlNo) {
            const parts = lastControlNo.split('-');
            if (parts.length >= 4) nextSeq = parseInt(parts[3], 10) + 1;
        }
        return `${prefix}${String(nextSeq).padStart(3, '0')}-${siteId}`;
    }
};
