import { v4 as uuidv4 } from 'uuid';
import { npiRepository } from './npi.repository.js';
import { userRepository } from '../users/user.repository.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import { mapStatusFromDB, mapStatusToDB } from '../../shared/utils/status-mapper.js';
export class NpiService {
    async generateSequence(siteId) {
        const d = new Date();
        const year = d.getFullYear().toString().slice(-2);
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `NPI-${siteId}-${year}-${month}-`;
        const lastSeq = await npiRepository.getNextSequence(prefix);
        let nextNum = 1;
        if (lastSeq) {
            const parts = lastSeq.split('-');
            const numPart = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(numPart)) {
                nextNum = numPart + 1;
            }
        }
        return `${prefix}${nextNum.toString().padStart(4, '0')}`;
    }
    async resolveCcUserId(cc) {
        if (cc.user_id)
            return cc.user_id;
        if (cc.email) {
            const user = await userRepository.findByEmail(cc.email);
            return user?.user_id || null;
        }
        return null;
    }
    parseDate(d) {
        if (!d)
            return null;
        const parsed = new Date(d);
        return isNaN(parsed.getTime()) ? null : parsed;
    }
    async getAllRecords() {
        const records = await npiRepository.findAllDetailed();
        return records.map((r) => ({
            ...r,
            status: mapStatusFromDB(r.request_status),
            created_at: r.datecreated,
        }));
    }
    async getRecordById(id) {
        const data = await npiRepository.findByIdDetailed(id);
        if (!data)
            throw new NotFoundError('NPI Record not found');
        const { record, attachments, visual_categories, data_categories, dimension_categories, cc_list } = data;
        return {
            ...record,
            status: mapStatusFromDB(record.request_status),
            attachments: attachments || [],
            visual_categories: visual_categories || [],
            data_categories: data_categories || [],
            dimension_categories: dimension_categories || [],
            cc_list: cc_list || []
        };
    }
    async createRecord(payload, userId, files = []) {
        const npiId = uuidv4();
        const now = new Date();
        const defaultUserId = '6a15b66a-079b-433b-b70f-dc15dce25631'; // System Fallback
        const effectiveUserId = userId && userId !== 'current_user' ? userId : defaultUserId;
        const dbStatus = mapStatusToDB(payload.status || 'DRAFT');
        const defaultInspector = await npiRepository.findDefaultInspector();
        // Generate control number if not provided
        let controlNo = payload.controlNo;
        if (!controlNo && payload.siteId) {
            controlNo = await this.generateSequence(payload.siteId);
        }
        else if (!controlNo) {
            controlNo = `NPI-DRAFT-${Date.now()}`;
        }
        const dbPayload = {
            npi_lot_id: npiId,
            control_no: controlNo,
            datecreated: now,
            site_id: (payload.siteId || ''),
            supplier_id: (payload.supplierId || ''),
            part_id: (payload.partId || ''),
            model_id: (payload.model || ''),
            lot_no: payload.lotNo || '',
            lot_size: payload.lotSize || 0,
            invoice_no: payload.invoiceNo || '',
            po_no: payload.poNo || '',
            inspectionmethod_id: payload.inspectionMethod || '',
            inspection_temp: payload.inspectionTemp || 0,
            inspection_hum: payload.inspectionHum || 0,
            starttime: payload.startTime || 0,
            endtime: payload.endTime || 0,
            severity_id: payload.severity || '',
            severity_seq: payload.severity_seq || null,
            sample_size: payload.sampleSize || 0,
            disposition_id: payload.disposition || '',
            inspection_date: this.parseDate(payload.inspectionDate) || now,
            delivery_date: this.parseDate(payload.deliveryDate) || now,
            inspected_by_id: defaultInspector || effectiveUserId,
            inspectioncat_id: payload.inspectionCategory || '',
            receivetime: payload.receivedTime || 0,
            endorsetime: payload.endorseTime || 0,
            data_verified_by_id: payload.dataVerifiedBy || '',
            inspector_id: payload.inspectorId || payload.inspector_id || effectiveUserId,
            checker_id: payload.checkerId || payload.checker_id || null,
            approver_id: payload.approverId || payload.approver_id || null,
            total_minor: payload.total_minor || 0,
            total_major: payload.total_major || 0,
            total_critical: payload.total_critical || 0,
            ssi_accept: 1, // Legacy default mapping
            judgment: payload.judgment || null,
            request_status: dbStatus,
            last_update: now,
            updateby: effectiveUserId,
            rohs_verification: payload.rohsVerification || null,
            reference_mnr_no: payload.referenceMnrNo || null,
            corrected_lot_verification: payload.correctedLotVerification ?? 0,
            inspector_remarks: payload.inspectorRemarks || null
        };
        return await npiRepository.executeTransaction(async (trx) => {
            // 1. Insert Main Record
            await trx.insertInto('NPI_LOTS').values(dbPayload).execute();
            // 2. Insert Attachments
            if (payload.attachments && payload.attachments.length > 0) {
                for (const att of payload.attachments) {
                    const originalName = att.file_name || att.fileName;
                    if (!originalName)
                        continue;
                    const uploadedFile = files.find(f => f.originalname === originalName);
                    const diskFileName = uploadedFile ? uploadedFile.filename : originalName;
                    const finalRemarks = att.remarks ? `${att.remarks} (Original: ${originalName})` : `Original: ${originalName}`;
                    await trx.insertInto('NPI_ATTACHMENT').values({
                        npi_attachment_id: att.npi_attachment_id || uuidv4(),
                        npi_lot_id: npiId,
                        file_name: diskFileName || 'Unknown',
                        file_extension: diskFileName ? diskFileName.split('.').pop() : (att.file_extension || null),
                        remarks: finalRemarks,
                        last_update: now,
                        updateby: effectiveUserId
                    }).execute();
                }
            }
            // 3. Visual Categories
            if (payload.visual_categories && payload.visual_categories.length > 0) {
                for (const vis of payload.visual_categories) {
                    await trx.insertInto('NPI_VISUALCAT').values({
                        npi_visualcat_id: uuidv4(),
                        npi_lot_id: npiId,
                        defectclass_id: vis.defectclass_id,
                        defect_id: vis.defect_id,
                        quantity: vis.quantity,
                        last_update: now,
                        updateby: effectiveUserId
                    }).execute();
                }
            }
            // 4. Data Categories
            if (payload.data_categories && payload.data_categories.length > 0) {
                for (const dat of payload.data_categories) {
                    await trx.insertInto('NPI_DATACAT').values({
                        npi_datacat_id: uuidv4(),
                        npi_lot_id: npiId,
                        partdatacategory_name: dat.partdatacategory_name,
                        std_min: dat.std_min,
                        std_max: dat.std_max,
                        actual_min: dat.actual_min ?? null,
                        actual_max: dat.actual_max ?? null,
                        cpk: dat.cpk ?? null,
                        remarks: dat.remarks || null,
                        last_update: now,
                        updateby: effectiveUserId
                    }).execute();
                }
            }
            // 5. Dimension Categories
            if (payload.dimension_categories && payload.dimension_categories.length > 0) {
                for (const dim of payload.dimension_categories) {
                    await trx.insertInto('NPI_DIMENSIONCAT').values({
                        npi_dimensioncat_id: uuidv4(),
                        npi_lot_id: npiId,
                        partdimensioncategory_name: dim.partdimensioncategory_name,
                        std_min: dim.std_min,
                        std_max: dim.std_max,
                        actual_min: dim.actual_min ?? null,
                        actual_max: dim.actual_max ?? null,
                        cpk: dim.cpk ?? null,
                        remarks: dim.remarks || null,
                        last_update: now,
                        updateby: effectiveUserId
                    }).execute();
                }
            }
            // 6. CC List - resolve email to user_id if needed
            if (payload.cc_list && payload.cc_list.length > 0) {
                for (const cc of payload.cc_list) {
                    const resolvedUserId = await this.resolveCcUserId(cc);
                    if (!resolvedUserId)
                        continue; // Skip if can't resolve
                    await trx.insertInto('NPI_CC').values({
                        npi_cc_id: uuidv4(),
                        npi_lot_id: npiId,
                        user_id: resolvedUserId,
                        last_update: now,
                        updateby: effectiveUserId
                    }).execute();
                }
            }
            return { success: true, data: { id: npiId }, message: 'Record created successfully' };
        });
    }
    async updateRecord(id, payload, userId, files = []) {
        const existing = await npiRepository.findByIdDetailed(id);
        if (!existing)
            throw new NotFoundError('Record not found');
        const now = new Date();
        const effectiveUserId = userId || 'SYSTEM';
        const dbUpdates = {
            last_update: now,
            updateby: effectiveUserId
        };
        if (payload.siteId)
            dbUpdates.site_id = payload.siteId;
        if (payload.supplierId)
            dbUpdates.supplier_id = payload.supplierId;
        if (payload.partId)
            dbUpdates.part_id = payload.partId;
        if (payload.model)
            dbUpdates.model_id = payload.model;
        if (payload.lotNo !== undefined)
            dbUpdates.lot_no = payload.lotNo;
        if (payload.lotSize !== undefined)
            dbUpdates.lot_size = payload.lotSize;
        if (payload.invoiceNo !== undefined)
            dbUpdates.invoice_no = payload.invoiceNo;
        if (payload.poNo !== undefined)
            dbUpdates.po_no = payload.poNo;
        if (payload.inspectionMethod)
            dbUpdates.inspectionmethod_id = payload.inspectionMethod;
        if (payload.inspectionTemp !== undefined)
            dbUpdates.inspection_temp = payload.inspectionTemp;
        if (payload.inspectionHum !== undefined)
            dbUpdates.inspection_hum = payload.inspectionHum;
        if (payload.startTime !== undefined)
            dbUpdates.starttime = payload.startTime;
        if (payload.endTime !== undefined)
            dbUpdates.endtime = payload.endTime;
        if (payload.receivedTime !== undefined)
            dbUpdates.receivetime = payload.receivedTime;
        if (payload.endorseTime !== undefined)
            dbUpdates.endorsetime = payload.endorseTime;
        if (payload.severity)
            dbUpdates.severity_id = payload.severity;
        if (payload.severity_seq !== undefined)
            dbUpdates.severity_seq = payload.severity_seq;
        if (payload.sampleSize !== undefined)
            dbUpdates.sample_size = payload.sampleSize;
        if (payload.disposition)
            dbUpdates.disposition_id = payload.disposition;
        if (payload.inspectionDate)
            dbUpdates.inspection_date = this.parseDate(payload.inspectionDate);
        if (payload.deliveryDate)
            dbUpdates.delivery_date = this.parseDate(payload.deliveryDate);
        if (payload.inspectedBy)
            dbUpdates.inspected_by_id = payload.inspectedBy;
        if (payload.inspectionCategory)
            dbUpdates.inspectioncat_id = payload.inspectionCategory;
        if (payload.dataVerifiedBy)
            dbUpdates.data_verified_by_id = payload.dataVerifiedBy;
        if (payload.total_minor !== undefined)
            dbUpdates.total_minor = payload.total_minor;
        if (payload.total_major !== undefined)
            dbUpdates.total_major = payload.total_major;
        if (payload.total_critical !== undefined)
            dbUpdates.total_critical = payload.total_critical;
        if (payload.judgment !== undefined)
            dbUpdates.judgment = payload.judgment;
        if (payload.rohsVerification !== undefined)
            dbUpdates.rohs_verification = payload.rohsVerification;
        if (payload.referenceMnrNo !== undefined)
            dbUpdates.reference_mnr_no = payload.referenceMnrNo || null;
        if (payload.correctedLotVerification !== undefined)
            dbUpdates.corrected_lot_verification = payload.correctedLotVerification;
        if (payload.inspectorRemarks !== undefined)
            dbUpdates.inspector_remarks = payload.inspectorRemarks;
        if (payload.checkerRemarks !== undefined)
            dbUpdates.checker_remarks = payload.checkerRemarks;
        if (payload.approverRemarks !== undefined)
            dbUpdates.approver_remarks = payload.approverRemarks;
        // Approval Assignments
        if (payload.inspectorId || payload.inspector_id) {
            dbUpdates.inspector_id = payload.inspectorId || payload.inspector_id || undefined;
        }
        if (payload.checkerId || payload.checker_id) {
            dbUpdates.checker_id = payload.checkerId || payload.checker_id;
        }
        if (payload.approverId || payload.approver_id) {
            dbUpdates.approver_id = payload.approverId || payload.approver_id;
        }
        const statusVal = payload.status || payload.request_status;
        if (statusVal)
            dbUpdates.request_status = mapStatusToDB(statusVal);
        return await npiRepository.executeTransaction(async (trx) => {
            // 1. Update Base Record
            if (Object.keys(dbUpdates).length > 2) {
                await trx.updateTable('NPI_LOTS')
                    .set(dbUpdates)
                    .where('npi_lot_id', '=', existing.record.npi_lot_id)
                    .execute();
            }
            // 2. Attachments
            if (payload.attachments !== undefined) {
                await trx.deleteFrom('NPI_ATTACHMENT').where('npi_lot_id', '=', existing.record.npi_lot_id).execute();
                for (const att of payload.attachments) {
                    const originalName = att.file_name || att.fileName;
                    if (!originalName)
                        continue;
                    const uploadedFile = files.find(f => f.originalname === originalName);
                    const diskFileName = uploadedFile ? uploadedFile.filename : originalName;
                    const finalRemarks = att.remarks ? `${att.remarks} (Original: ${originalName})` : `Original: ${originalName}`;
                    await trx.insertInto('NPI_ATTACHMENT').values({
                        npi_attachment_id: att.npi_attachment_id || uuidv4(),
                        npi_lot_id: existing.record.npi_lot_id,
                        file_name: diskFileName || 'Unknown',
                        file_extension: diskFileName ? diskFileName.split('.').pop() : (att.file_extension || null),
                        remarks: finalRemarks,
                        last_update: now,
                        updateby: effectiveUserId
                    }).execute();
                }
            }
            // 3. Visual Categories
            if (payload.visual_categories !== undefined) {
                await trx.deleteFrom('NPI_VISUALCAT').where('npi_lot_id', '=', existing.record.npi_lot_id).execute();
                for (const vis of payload.visual_categories) {
                    await trx.insertInto('NPI_VISUALCAT').values({
                        npi_visualcat_id: uuidv4(),
                        npi_lot_id: existing.record.npi_lot_id,
                        defectclass_id: vis.defectclass_id,
                        defect_id: vis.defect_id,
                        quantity: vis.quantity,
                        last_update: now,
                        updateby: effectiveUserId
                    }).execute();
                }
            }
            // 4. Data Categories
            if (payload.data_categories !== undefined) {
                await trx.deleteFrom('NPI_DATACAT').where('npi_lot_id', '=', existing.record.npi_lot_id).execute();
                for (const dat of payload.data_categories) {
                    await trx.insertInto('NPI_DATACAT').values({
                        npi_datacat_id: uuidv4(),
                        npi_lot_id: existing.record.npi_lot_id,
                        partdatacategory_name: dat.partdatacategory_name,
                        std_min: dat.std_min,
                        std_max: dat.std_max,
                        actual_min: dat.actual_min ?? null,
                        actual_max: dat.actual_max ?? null,
                        cpk: dat.cpk ?? null,
                        remarks: dat.remarks || null,
                        last_update: now,
                        updateby: effectiveUserId
                    }).execute();
                }
            }
            // 5. Dimension Categories
            if (payload.dimension_categories !== undefined) {
                await trx.deleteFrom('NPI_DIMENSIONCAT').where('npi_lot_id', '=', existing.record.npi_lot_id).execute();
                for (const dim of payload.dimension_categories) {
                    await trx.insertInto('NPI_DIMENSIONCAT').values({
                        npi_dimensioncat_id: uuidv4(),
                        npi_lot_id: existing.record.npi_lot_id,
                        partdimensioncategory_name: dim.partdimensioncategory_name,
                        std_min: dim.std_min,
                        std_max: dim.std_max,
                        actual_min: dim.actual_min ?? null,
                        actual_max: dim.actual_max ?? null,
                        cpk: dim.cpk ?? null,
                        remarks: dim.remarks || null,
                        last_update: now,
                        updateby: effectiveUserId
                    }).execute();
                }
            }
            // 6. CC List - resolve email to user_id if needed
            if (payload.cc_list !== undefined) {
                await trx.deleteFrom('NPI_CC').where('npi_lot_id', '=', existing.record.npi_lot_id).execute();
                for (const cc of payload.cc_list) {
                    const resolvedUserId = await this.resolveCcUserId(cc);
                    if (!resolvedUserId)
                        continue; // Skip if can't resolve
                    await trx.insertInto('NPI_CC').values({
                        npi_cc_id: uuidv4(),
                        npi_lot_id: existing.record.npi_lot_id,
                        user_id: resolvedUserId,
                        last_update: now,
                        updateby: effectiveUserId
                    }).execute();
                }
            }
            return { success: true, data: { id }, message: 'Record updated successfully' };
        });
    }
    /**
     * Deletes an NPI record and all child tables
     */
    async deleteRecord(id) {
        const existing = await npiRepository.findByIdDetailed(id);
        if (!existing)
            throw new NotFoundError('NPI Record not found');
        const npiLotId = existing.record.npi_lot_id;
        return await npiRepository.executeTransaction(async (trx) => {
            await trx.deleteFrom('NPI_ATTACHMENT').where('npi_lot_id', '=', npiLotId).execute();
            await trx.deleteFrom('NPI_VISUALCAT').where('npi_lot_id', '=', npiLotId).execute();
            await trx.deleteFrom('NPI_DATACAT').where('npi_lot_id', '=', npiLotId).execute();
            await trx.deleteFrom('NPI_DIMENSIONCAT').where('npi_lot_id', '=', npiLotId).execute();
            await trx.deleteFrom('NPI_CC').where('npi_lot_id', '=', npiLotId).execute();
            await trx.deleteFrom('NPI_LOTS').where('npi_lot_id', '=', npiLotId).execute();
            return { success: true, data: { id }, message: 'NPI Record deleted successfully' };
        });
    }
}
export const npiService = new NpiService();
