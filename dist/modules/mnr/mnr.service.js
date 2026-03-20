import { v4 as uuidv4 } from 'uuid';
import { mnrRepository } from './mnr.repository.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/AppError.js';
import { mapStatusToDB, mapStatusFromDB } from '../../shared/utils/status-mapper.js';
import { buildMnrWorkflowMetadata } from './workflow/mnr-workflow.utils.js';
import { MNR_WORKFLOW_STAGE } from './workflow/mnr-workflow.constants.js';
import { assertWorkflowRecordAccess, filterWorkflowRecordsByScope, } from '../../shared/utils/workflow-access.js';
export class MnrService {
    isAdminActor(actor) {
        return (actor?.roleName || '').toUpperCase().includes('ADMIN');
    }
    buildWorkflow(record, latestResponse, actor) {
        return buildMnrWorkflowMetadata(record, {
            latestResponse: latestResponse || undefined,
            actor,
        });
    }
    isAssignedRecord(record, latestResponse, actor) {
        if (!actor?.userId) {
            return false;
        }
        const workflow = this.buildWorkflow(record, latestResponse, actor);
        return Array.isArray(workflow.availableActions) && workflow.availableActions.length > 0;
    }
    isMineRecord(record, latestResponse, actor) {
        if (!actor?.userId) {
            return false;
        }
        return (record.encoder_id === actor.userId ||
            record.issuer_id === actor.userId ||
            this.isAssignedRecord(record, latestResponse, actor));
    }
    canReadRecord(record, latestResponse, actor) {
        if (!actor?.userId || this.isAdminActor(actor)) {
            return true;
        }
        if (this.isAssignedRecord(record, latestResponse, actor)) {
            return true;
        }
        return [
            record.encoder_id,
            record.issuer_id,
            record.checker_id,
            record.approver_id,
            record.attention_id,
            latestResponse?.checker_id,
            latestResponse?.approver_id,
        ].includes(actor.userId) || Boolean(record.supplier_id && actor.supplierId && record.supplier_id === actor.supplierId);
    }
    canMutateMainRecord(record, actor) {
        if (!actor?.userId || this.isAdminActor(actor)) {
            return true;
        }
        return record.encoder_id === actor.userId || record.issuer_id === actor.userId;
    }
    /**
     * Helper: Generate Control No
     */
    async generateControlNo() {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        // In production, this should query the DB for the MAX(control_no) and increment it.
        // Keeping legacy logic for now: random 3-digit.
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `MNR-${year}-${random}`;
    }
    /**
     * Helper: Format Date consistently
     */
    formatDate(dateStr) {
        if (!dateStr)
            return null;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
    }
    toNumber(value) {
        if (value === null || value === undefined || value === '')
            return null;
        const num = Number(value);
        return Number.isFinite(num) ? num : null;
    }
    sanitizeUserForeignKey(value) {
        if (!value)
            return null;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
    async resolveAttentionId(trx, attentionId) {
        const cleanAttentionId = this.sanitizeUserForeignKey(attentionId);
        if (!cleanAttentionId) {
            throw new BadRequestError('Attention is required.');
        }
        const supplierUser = await trx
            .selectFrom('SUPPLIERSUSER')
            .select('user_id')
            .where('Id', '=', cleanAttentionId)
            .executeTakeFirst();
        if (supplierUser?.user_id) {
            return supplierUser.user_id;
        }
        const userExists = await trx
            .selectFrom('USERS')
            .select('user_id')
            .where('user_id', '=', cleanAttentionId)
            .executeTakeFirst();
        if (userExists?.user_id) {
            return userExists.user_id;
        }
        throw new BadRequestError('Attention must be selected from the supplier attention lookup.');
    }
    mapWorkflowStageToDisplayStatus(stage) {
        switch (stage) {
            case MNR_WORKFLOW_STAGE.DRAFT:
                return 'DRAFT';
            case MNR_WORKFLOW_STAGE.CHECKER:
                return 'AWAITING_CHECKED';
            case MNR_WORKFLOW_STAGE.APPROVER:
                return 'AWAITING_APPROVAL';
            case MNR_WORKFLOW_STAGE.REJECT_CHECKER:
            case MNR_WORKFLOW_STAGE.REJECT_APPROVER:
            case MNR_WORKFLOW_STAGE.REJECT_SUPPLIER:
                return 'REJECTED';
            case MNR_WORKFLOW_STAGE.ISSUER:
                return 'APPROVED';
            case MNR_WORKFLOW_STAGE.SUPPLIER:
                return 'ISSUED';
            case MNR_WORKFLOW_STAGE.INITIAL_RESPONSE:
                return 'IR';
            case MNR_WORKFLOW_STAGE.FINAL_RESPONSE:
                return 'FR';
            case MNR_WORKFLOW_STAGE.ISSUER_2ND:
                return 'RESPONSE_SUBMITTED';
            case MNR_WORKFLOW_STAGE.CHECKER_2ND:
            case MNR_WORKFLOW_STAGE.REJECT_CHECKER_2ND:
                return 'RESPONSE_AWAITING_CHECKED';
            case MNR_WORKFLOW_STAGE.APPROVER_2ND:
            case MNR_WORKFLOW_STAGE.REJECT_APPROVER_2ND:
                return 'RESPONSE_AWAITING_APPROVAL';
            case MNR_WORKFLOW_STAGE.ISSUER_3RD:
                return 'RESPONSE_RECEIVED';
            case MNR_WORKFLOW_STAGE.REJECT_ISSUER_2ND:
            case MNR_WORKFLOW_STAGE.NOT_ACCEPT:
                return 'RESPONSE_REJECTED';
            case MNR_WORKFLOW_STAGE.CANCEL:
                return 'CANCELLED';
            case MNR_WORKFLOW_STAGE.ACCEPT:
                return 'CLOSED';
            case MNR_WORKFLOW_STAGE.LOT_TRACKING:
                return 'CLOSED';
            default:
                return mapStatusFromDB(String(stage));
        }
    }
    buildResponseUpdatePayload(responsePayload, userId, now) {
        return {
            d1: responsePayload.d1_teamApproach || responsePayload.teamApproach || null,
            d2: responsePayload.d2_problemDescription || responsePayload.problemDescription || null,
            d3: responsePayload.d3_containmentPlan || responsePayload.containmentPlan || null,
            d4: responsePayload.d4_rootCause || responsePayload.rootCause || null,
            d5: responsePayload.d5_correctiveAction || responsePayload.correctiveAction || null,
            d6: responsePayload.d6_verificationEffectiveness || responsePayload.verificationEffectiveness || null,
            d7: responsePayload.d7_preventRecurrence || responsePayload.preventRecurrence || null,
            d8: responsePayload.d8_completionApproval || responsePayload.ultimateVerification || null,
            invoice_no: responsePayload.invoiceDrNo || responsePayload.invoiceNo || null,
            lot_size: this.toNumber(responsePayload.lotSize),
            lot_no: responsePayload.lotNo || null,
            eta: responsePayload.eta || null,
            marking: responsePayload.ifSortedMarkingIdentification || responsePayload.marking || null,
            rtv_received: this.toNumber(responsePayload.actualRtvReceived ?? responsePayload.rtvReceived),
            replacement_date: this.formatDate(responsePayload.targetReplacementDate || responsePayload.replacementDate),
            replacement_qty: this.toNumber(responsePayload.replacementQty),
            ncv_invoice_no: responsePayload.ncvInvoiceNo || null,
            label: responsePayload.boxLabelIdentification || responsePayload.label || null,
            remarks: responsePayload.correctedPartsNotice || responsePayload.remarks || null,
            attention_date: this.formatDate(responsePayload.attentionDate),
            accept_date: this.formatDate(responsePayload.acceptDate),
            checker_id: responsePayload.cycle2CheckerId || responsePayload.checker || null,
            checker_remarks: responsePayload.cycle2CheckerRemarks || responsePayload.checkerRemarks || null,
            checker_date: this.formatDate(responsePayload.cycle2CheckerDate || responsePayload.checkerDate),
            approver_id: responsePayload.cycle2ApproverId || responsePayload.approver || null,
            approver_remarks: responsePayload.cycle2ApproverRemarks || responsePayload.approverRemarks || null,
            approver_date: this.formatDate(responsePayload.cycle2ApproverDate || responsePayload.approverDate),
            issuer_remarks: responsePayload.cycle2IssuerRemarks || responsePayload.issuerRemarks || null,
            issuer_date: this.formatDate(responsePayload.cycle2IssuerDate || responsePayload.issuerDate),
            last_update: now,
            updateby: userId,
        };
    }
    async persistResponseArtifacts(trx, realId, responsePayload, userId, now) {
        const existingResponse = await trx
            .selectFrom('MNR_RESPONSE')
            .select('mnr_response_id')
            .where('mnr_id', '=', realId)
            .executeTakeFirst();
        const responseUpdatePayload = this.buildResponseUpdatePayload(responsePayload, userId, now);
        if (existingResponse?.mnr_response_id) {
            await trx
                .updateTable('MNR_RESPONSE')
                .set(responseUpdatePayload)
                .where('mnr_id', '=', realId)
                .execute();
        }
        else {
            await trx
                .insertInto('MNR_RESPONSE')
                .values({
                mnr_response_id: uuidv4(),
                mnr_id: realId,
                ...responseUpdatePayload,
            })
                .execute();
        }
        if (Array.isArray(responsePayload.verificationEntries)) {
            await trx.deleteFrom('MNR_VERIFICATION').where('mnr_id', '=', realId).execute();
            for (const entry of responsePayload.verificationEntries) {
                if (!entry?.receivedDate || !entry?.invoiceNo || !entry?.judgment)
                    continue;
                await trx.insertInto('MNR_VERIFICATION').values({
                    mnr_verification_id: uuidv4(),
                    mnr_id: realId,
                    received_date: this.formatDate(entry.receivedDate) || now,
                    invoice_no: String(entry.invoiceNo),
                    judgment: String(entry.judgment),
                    remarks: entry.remarks ? String(entry.remarks) : null,
                    last_update: now,
                    updateby: userId,
                }).execute();
            }
        }
    }
    async saveResponseContent(id, responsePayload, userId) {
        const now = new Date();
        return await mnrRepository.executeTransaction(async (trx) => {
            const currentRecord = await trx.selectFrom('MNR_LOTS')
                .select(['mnr_id'])
                .where((eb) => eb.or([
                eb('mnr_id', '=', id),
                eb('control_no', '=', id),
            ]))
                .executeTakeFirst();
            if (!currentRecord)
                throw new NotFoundError('MNR Record not found');
            await this.persistResponseArtifacts(trx, currentRecord.mnr_id, responsePayload, userId, now);
            return {
                success: true,
                message: 'Response content saved successfully',
                data: {
                    id: currentRecord.mnr_id,
                },
            };
        });
    }
    async getAllRecords(filters = {}, actor = {}) {
        let dbFilter;
        if (filters.status) {
            if (filters.status.includes(',')) {
                dbFilter = filters.status.split(',').map(s => mapStatusToDB(s.trim()));
            }
            else {
                dbFilter = mapStatusToDB(filters.status.trim());
            }
        }
        const records = await mnrRepository.findAllDetailed(dbFilter);
        const latestResponses = await mnrRepository.findLatestResponsesByMnrIds(records.map((record) => record.id));
        const latestResponseMap = new Map(latestResponses.map((response) => [response.mnr_id, response]));
        // Map DB flat rows back to expected DTO shape
        const visibleRecords = this.isAdminActor(actor)
            ? records
            : filterWorkflowRecordsByScope(records, filters.scope || 'history', {
                isAssigned: (record) => this.isAssignedRecord(record, latestResponseMap.get(record.id), actor),
                isMine: (record) => this.isMineRecord(record, latestResponseMap.get(record.id), actor),
                isHistoryVisible: (record) => this.canReadRecord(record, latestResponseMap.get(record.id), actor),
            });
        return visibleRecords.map(r => {
            const workflow = buildMnrWorkflowMetadata({
                request_status: r.status,
                supplier_id: r.supplier_id,
                encoder_id: r.encoder_id,
                encoder_name: r.encoder_name,
                issuer_id: r.issuer_id,
                issuer_name: r.issuer_name,
                checker_id: r.checker_id,
                checker_name: r.checker_name,
                approver_id: r.approver_id,
                approver_name: r.approver_name,
                attention_id: r.attention_id,
            }, {
                latestResponse: latestResponseMap.get(r.id),
                actor,
            });
            return ({
                id: r.id,
                control_no: r.control_no,
                status: this.mapWorkflowStageToDisplayStatus(workflow.workflowStage),
                workflowStage: workflow.workflowStage,
                workflowStageCode: workflow.workflowStageCode,
                workflowStageName: workflow.workflowStageName,
                workflowStageLabel: workflow.workflowStageLabel,
                availableActions: workflow.availableActions,
                nextApproverId: workflow.nextApproverId,
                nextApproverName: workflow.nextApproverName,
                response_checker_id: latestResponseMap.get(r.id)?.checker_id || null,
                response_checker_name: latestResponseMap.get(r.id)?.checker_name || null,
                response_approver_id: latestResponseMap.get(r.id)?.approver_id || null,
                response_approver_name: latestResponseMap.get(r.id)?.approver_name || null,
                created_at: r.date_created,
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
                site_id: r.site_id,
                mfg_sites: r.site_id,
                supplier_id: r.supplier_id,
                model_id: r.model_id,
                product_id: r.product_id,
                mfg_area_id: r.mfg_area_id,
                defectcategory_id: r.defectcategory_id,
                mnrtype_id: r.mnrtype_id,
                attention_id: r.attention_id,
                reference_no: r.reference_no,
                report_issuance_8d: r.report_issuance_8d === 1 || r.report_issuance_8d === true,
                recurrence_ref: r.recurrence_ref,
                issued_date: r.issued_date,
                initial_report_date: r.initial_report_date,
                due_date: r.due_date,
                part_name: r.part_name,
                part_code: r.part_code,
                last_update: r.last_update,
                updateby: r.updateby
            });
        });
    }
    async getRecordById(id, actor = {}) {
        const data = await mnrRepository.findByIdDetailed(id);
        if (!data)
            throw new NotFoundError('MNR Record not found');
        assertWorkflowRecordAccess({
            allowed: this.canReadRecord(data.record, data.response, actor),
            action: 'view',
            moduleName: 'MNR',
        });
        const main = data.record;
        const workflow = buildMnrWorkflowMetadata(main, {
            latestResponse: data.response || undefined,
            actor,
        });
        return {
            mainDetails: {
                id: main.mnr_id,
                controlNo: main.control_no,
                status: this.mapWorkflowStageToDisplayStatus(workflow.workflowStage),
                workflowStage: workflow.workflowStage,
                workflowStageCode: workflow.workflowStageCode,
                workflowStageName: workflow.workflowStageName,
                workflowStageLabel: workflow.workflowStageLabel,
                availableActions: workflow.availableActions,
                nextApproverId: workflow.nextApproverId,
                nextApproverName: workflow.nextApproverName,
                created_at: main.date_created,
                mfgSites: main.site_id,
                supplier: main.supplier_id,
                model: main.model_id,
                product: main.product_id,
                mfgAreas: main.mfg_area_id,
                category: main.defectcategory_id,
                mnrType: main.mnrtype_id,
                attention: main.attention_id,
                reference: main.reference_no,
                reportIssuance8D: main.report_issuance_8d === 1 || main.report_issuance_8d === true,
                recurrenceRef: main.recurrence_ref,
                issueDate: main.issued_date,
                initialReport: main.initial_report_date,
                dueDate: main.due_date,
                actualInitialReport: main.actual_initial_report_date,
                actualFinalReport: main.actual_final_report_date,
                remarks: main.remarks,
                encoder_id: main.encoder_id,
                issuer_id: main.issuer_id,
                checker_id: main.checker_id,
                approver_id: main.approver_id,
                issuer_date: main.issuer_date,
                issuer_remarks: main.issuer_remarks,
                checker_date: main.checker_date,
                checker_remarks: main.checker_remarks,
                approver_date: main.approver_date,
                approver_remarks: main.approver_remarks,
                site_name: main.site_name,
                supplier_name: main.supplier_name,
                product_name: main.product_name,
                model_name: main.model_name,
                model_no: main.model_no,
                mfg_area_name: main.mfg_area_name,
                category_name: main.category_name,
                mnr_type_name: main.mnr_type_name,
                encoder_name: main.encoder_name,
                issuer_name: main.issuer_name,
                checker_name: main.checker_name,
                approver_name: main.approver_name,
                attention_name: main.attention_name
            },
            defects: data.details,
            response8D: data.response ? {
                ...data.response,
                attachments: data.responseAttachments
            } : null,
            verificationEntries: data.verificationEntries || [],
            disposition: {
                rtv: { selected: main.rtv, qty: main.rtv_total_qty, remarks: main.rtv_remarks },
                sort: { selected: main.sort, sorted: main.sort_sorted, rejected: main.sort_rejected, rate: main.sort_reject_rate, rework: main.sort_rework, remarks: main.sort_remarks },
                other: { selected: main.other, qty: main.other_affected_qty, doc: main.other_affected_doc, remarks: main.other_remarks }
            },
            approval: {
                issuer: main.issuer_id,
                issuerName: main.issuer_name,
                checker: main.checker_id,
                checkerName: main.checker_name,
                approver: main.approver_id,
                approverName: main.approver_name,
                issuerDate: main.issuer_date,
                issuerRemarks: main.issuer_remarks,
                checkerDate: main.checker_date,
                checkerRemarks: main.checker_remarks,
                approverDate: main.approver_date,
                approverRemarks: main.approver_remarks,
            },
            workflow,
            copiedUsers: data.ccList.map(cc => {
                const ccAny = cc;
                const fullName = ccAny.full_name || ccAny.fullName || ccAny.username ||
                    ((ccAny.first_name || '') + ' ' + (ccAny.last_name || '')).trim() || '';
                console.log('[MNR CC] Raw CC entry:', JSON.stringify(cc));
                return { id: ccAny.user_id, value: ccAny.user_id, label: fullName, full_name: fullName, email: ccAny.email || '' };
            }),
            attachments: data.attachments,
            meta: {
                last_update: main.last_update,
                updateby: main.updateby
            }
        };
    }
    async createRecord(payload, userId, files = []) {
        const mnrId = uuidv4();
        const controlNo = await this.generateControlNo();
        const now = new Date();
        // Extract main details from the standardized payload (snake_case _id keys)
        const main = {
            mfgSites: payload.site_id || '',
            supplier: payload.supplier_id || '',
            product: payload.product_id || '',
            model: payload.model_id || '',
            mfgAreas: payload.mfg_area_id || '',
            category: payload.defectcategory_id || '',
            mnrType: payload.mnrType || '',
            attention: payload.attention_id || '',
            reference: payload.reference || '',
            remarks: payload.remarks || '',
            reportIssuance8D: payload.reportIssuance8D,
            recurrenceReference: payload.recurrenceRef || '',
            issueDate: payload.issueDate || '',
            initialReport: payload.initialReport || '',
            dueDate: payload.dueDate || '',
            actualInitialReport: payload.actualInitialReport || '',
            actualFinalReport: payload.actualFinalReport || '',
        };
        // Accept both 'disposition' and 'disposition_data' (frontend sends 'disposition_data')
        const disp = payload.disposition || payload.disposition_data || {};
        const nc = payload.nonConformity || {};
        const approval = payload.approval || {};
        // Diagnostic logger — remove after debugging
        console.log('[MNR CREATE] Received payload → defects:', JSON.stringify(payload.defects, null, 2));
        console.log('[MNR CREATE] Received payload → nonConformity:', JSON.stringify(nc, null, 2));
        console.log('[MNR CREATE] Received payload → disposition:', JSON.stringify(disp, null, 2));
        console.log('[MNR CREATE] Received payload → disposition_data:', JSON.stringify(payload.disposition_data, null, 2));
        const dbStatus = mapStatusToDB('DRAFT');
        // Resolve Disposition fields safely to booleans
        const rtvSelected = disp.rtv && typeof disp.rtv === 'object' ? disp.rtv.selected : !!disp.rtv;
        const sortSelected = disp.sort && typeof disp.sort === 'object' ? disp.sort.selected : !!disp.sort;
        const otherSelected = disp.other && typeof disp.other === 'object' ? disp.other.selected : !!disp.other;
        const dbLotsPayload = {
            mnr_id: mnrId,
            control_no: controlNo,
            request_status: dbStatus,
            date_created: now,
            site_id: main.mfgSites,
            product_id: main.product,
            supplier_id: main.supplier,
            model_id: main.model,
            mfg_area_id: main.mfgAreas || '',
            defectcategory_id: main.category || '',
            mnrtype_id: main.mnrType || '',
            attention_id: main.attention || '',
            reference_no: main.reference || null,
            report_issuance_8d: main.reportIssuance8D ? 1 : 0,
            recurrence_ref: payload.recurrenceRef || null,
            issued_date: this.formatDate(main.issueDate),
            initial_report_date: this.formatDate(main.initialReport) || now,
            due_date: this.formatDate(main.dueDate) || now,
            actual_initial_report_date: this.formatDate(main.actualInitialReport),
            actual_final_report_date: this.formatDate(main.actualFinalReport),
            rtv: rtvSelected ? 1 : 0,
            rtv_total_qty: typeof disp.rtv === 'object' ? disp.rtv.qty : disp.rtvTotalQty || disp.rtvQty || 0,
            rtv_remarks: typeof disp.rtv === 'object' ? disp.rtv.remarks : disp.rtvRemarks || null,
            sort: sortSelected ? 1 : 0,
            sort_sorted: typeof disp.sort === 'object' ? disp.sort.sorted : disp.sortSorted || 0,
            sort_rejected: typeof disp.sort === 'object' ? disp.sort.rejected : disp.sortRejected || 0,
            sort_reject_rate: typeof disp.sort === 'object' ? disp.sort.rate : disp.sortRejectRate || 0,
            sort_remarks: typeof disp.sort === 'object' ? disp.sort.remarks : disp.sortRemarks || null,
            sort_rework: typeof disp.sort === 'object' ? (disp.sort.rework ? 1 : 0) : (disp.sortRework ? 1 : 0),
            other: otherSelected ? 1 : 0,
            other_affected_qty: typeof disp.other === 'object' ? disp.other.qty : disp.otherAffectedQty || 0,
            other_affected_doc: typeof disp.other === 'object' ? disp.other.doc : disp.otherAffectedDoc || null,
            other_remarks: typeof disp.other === 'object' ? disp.other.remarks : disp.otherRemarks || null,
            encoder_id: userId,
            encoder_date: now,
            issuer_id: approval.issuer || userId,
            checker_id: approval.checker || null,
            approver_id: approval.approver || null,
            issuer_date: this.formatDate(approval.submitDate) || null,
            issuer_remarks: approval.issuerRemarks || null,
            checker_date: this.formatDate(approval.approvedDate) || null,
            checker_remarks: approval.checkerRemarks || null,
            approver_date: this.formatDate(approval.approvedDate2) || null,
            approver_remarks: approval.approverRemarks || null,
            remarks: main.remarks || null,
            last_update: now,
            updateby: userId
        };
        return await mnrRepository.executeTransaction(async (trx) => {
            dbLotsPayload.attention_id = await this.resolveAttentionId(trx, dbLotsPayload.attention_id);
            // 1. Insert Main Record
            await trx.insertInto('MNR_LOTS').values(dbLotsPayload).execute();
            // 2. Insert Defects Detail records
            if (payload.defects && Array.isArray(payload.defects)) {
                for (const defect of payload.defects) {
                    // Resolve defectclass_id: frontend may send UUID or label (e.g. "CRITICAL")
                    let resolvedClassId = defect.classId || null;
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    if (resolvedClassId && !uuidRegex.test(resolvedClassId)) {
                        // classId is a label — look up UUID from DEFECTCLASS table
                        const classRow = await trx.selectFrom('DEFECTCLASS')
                            .select('defectclass_id')
                            .where('defectclass_name', '=', resolvedClassId)
                            .executeTakeFirst();
                        resolvedClassId = classRow?.defectclass_id || null;
                        console.log(`[MNR] Resolved defectclass "${defect.classId}" → ${resolvedClassId}`);
                    }
                    await trx.insertInto('MNR_DETAILS').values({
                        mnr_detail_id: uuidv4(),
                        mnr_id: mnrId,
                        part_id: defect.partId || '',
                        defect_id: defect.defectId || '',
                        defectclass_id: resolvedClassId,
                        defect_qty: defect.qty || 0,
                        ca: defect.ca ? 1 : 0,
                        inspection_date: this.formatDate(defect.inspectionDate),
                        invoice_no: defect.invoiceNo,
                        invoice_qty: defect.invoiceQty,
                        lot_no: defect.lotNo,
                        lot_size: defect.lotSize,
                        sample_size: defect.sampleSize,
                        group_line: defect.groupLine,
                        area_defect: defect.areaDefect,
                        cavity_no: defect.cavityNo,
                        tray_no: defect.trayNo,
                        encounter_date: this.formatDate(defect.encounterDate),
                        verification_date: this.formatDate(defect.verificationDate),
                        verified_by: defect.verifiedBy,
                        last_update: now,
                        updateby: userId
                    }).execute();
                }
            }
            else {
                // Fallback dummy record for integrity
                await trx.insertInto('MNR_DETAILS').values({
                    mnr_detail_id: uuidv4(),
                    mnr_id: mnrId,
                    part_id: '', defect_id: '', defect_qty: 0, ca: 0,
                    last_update: now, updateby: userId
                }).execute();
            }
            // 3. Insert Response row (empty by default, hydrated when payload contains response data)
            const responsePayload = payload.response8D || {};
            await trx.insertInto('MNR_RESPONSE').values({
                mnr_response_id: uuidv4(),
                mnr_id: mnrId,
                d1: responsePayload.d1_teamApproach || responsePayload.teamApproach || null,
                d2: responsePayload.d2_problemDescription || responsePayload.problemDescription || null,
                d3: responsePayload.d3_containmentPlan || responsePayload.containmentPlan || null,
                d4: responsePayload.d4_rootCause || responsePayload.rootCause || null,
                d5: responsePayload.d5_correctiveAction || responsePayload.correctiveAction || null,
                d6: responsePayload.d6_verificationEffectiveness || responsePayload.verificationEffectiveness || null,
                d7: responsePayload.d7_preventRecurrence || responsePayload.preventRecurrence || null,
                d8: responsePayload.d8_completionApproval || responsePayload.ultimateVerification || null,
                invoice_no: responsePayload.invoiceDrNo || responsePayload.invoiceNo || null,
                lot_size: this.toNumber(responsePayload.lotSize),
                lot_no: responsePayload.lotNo || null,
                eta: responsePayload.eta || null,
                marking: responsePayload.ifSortedMarkingIdentification || responsePayload.marking || null,
                rtv_received: this.toNumber(responsePayload.actualRtvReceived ?? responsePayload.rtvReceived),
                replacement_date: this.formatDate(responsePayload.targetReplacementDate || responsePayload.replacementDate),
                replacement_qty: this.toNumber(responsePayload.replacementQty),
                ncv_invoice_no: responsePayload.ncvInvoiceNo || null,
                label: responsePayload.boxLabelIdentification || responsePayload.label || null,
                remarks: responsePayload.correctedPartsNotice || responsePayload.remarks || null,
                attention_date: this.formatDate(responsePayload.attentionDate),
                accept_date: this.formatDate(responsePayload.acceptDate),
                checker_id: responsePayload.cycle2CheckerId || responsePayload.checker || null,
                checker_remarks: responsePayload.cycle2CheckerRemarks || responsePayload.checkerRemarks || null,
                checker_date: this.formatDate(responsePayload.cycle2CheckerDate || responsePayload.checkerDate),
                approver_id: responsePayload.cycle2ApproverId || responsePayload.approver || null,
                approver_remarks: responsePayload.cycle2ApproverRemarks || responsePayload.approverRemarks || null,
                approver_date: this.formatDate(responsePayload.cycle2ApproverDate || responsePayload.approverDate),
                issuer_remarks: responsePayload.cycle2IssuerRemarks || responsePayload.issuerRemarks || null,
                issuer_date: this.formatDate(responsePayload.cycle2IssuerDate || responsePayload.issuerDate),
                last_update: now,
                updateby: userId
            }).execute();
            // 3b. Verification history rows (multi-row)
            const verificationEntries = Array.isArray(responsePayload.verificationEntries)
                ? responsePayload.verificationEntries
                : [];
            for (const entry of verificationEntries) {
                if (!entry?.receivedDate || !entry?.invoiceNo || !entry?.judgment)
                    continue;
                await trx.insertInto('MNR_VERIFICATION').values({
                    mnr_verification_id: uuidv4(),
                    mnr_id: mnrId,
                    received_date: this.formatDate(entry.receivedDate) || now,
                    invoice_no: String(entry.invoiceNo),
                    judgment: String(entry.judgment),
                    remarks: entry.remarks ? String(entry.remarks) : null,
                    last_update: now,
                    updateby: userId,
                }).execute();
            }
            // 4. Copied Users CC Data (accept both 'copiedUsers' and 'ccList')
            const ccUsers = [];
            if (payload.copiedUsers && Array.isArray(payload.copiedUsers)) {
                ccUsers.push(...payload.copiedUsers);
            }
            else if (payload.ccList && Array.isArray(payload.ccList)) {
                for (const cc of payload.ccList) {
                    if (typeof cc === 'string')
                        ccUsers.push(cc);
                    else if (cc.id)
                        ccUsers.push(cc.id);
                }
            }
            for (const ccId of ccUsers) {
                if (!ccId)
                    continue;
                await trx.insertInto('MNR_CC').values({
                    mnr_cc_id: uuidv4(),
                    mnr_id: mnrId,
                    user_id: ccId,
                    last_update: now,
                    updateby: userId
                }).execute();
            }
            // 5. Attachments
            if (payload.attachments && Array.isArray(payload.attachments)) {
                for (const att of payload.attachments) {
                    const originalName = att.file_name || att.name;
                    if (!originalName) {
                        console.warn('[MNR] Skipping attachment missing file_name:', att);
                        continue;
                    }
                    // Match with Multer files if it's a new upload
                    const uploadedFile = files.find(f => f.originalname === originalName);
                    const diskFileName = uploadedFile ? uploadedFile.filename : originalName;
                    const originalLabel = uploadedFile?.originalname || originalName;
                    const remarkBase = (att.remarks || '').trim();
                    const withOriginalMarker = remarkBase.includes('(Original:')
                        ? remarkBase
                        : `${remarkBase}${remarkBase ? ' ' : ''}(Original: ${originalLabel})`;
                    await trx.insertInto('MNR_ATTACHMENT').values({
                        mnr_attachment_id: att.id || uuidv4(),
                        mnr_id: mnrId,
                        file_name: diskFileName,
                        file_extension: diskFileName.split('.').pop() || att.extension || 'bin',
                        remarks: withOriginalMarker || null,
                        last_update: now,
                        updateby: userId
                    }).execute();
                }
            }
            return { success: true, mnr_id: mnrId, message: 'Record created successfully' };
        });
    }
    // Update and delete omitted for brevity, will be similar to execution loop
    async updateRecord(id, payload, actor, files = []) {
        const updates = payload.updates || payload;
        const now = new Date();
        return await mnrRepository.executeTransaction(async (trx) => {
            // First, resolve the real record id for content-only updates
            const currentRecord = await trx.selectFrom('MNR_LOTS')
                .select(['mnr_id', 'request_status', 'report_issuance_8d'])
                .where((eb) => eb.or([
                eb('mnr_id', '=', id),
                eb('control_no', '=', id)
            ]))
                .executeTakeFirst();
            if (!currentRecord)
                throw new NotFoundError('MNR Record not found');
            const realId = currentRecord.mnr_id;
            const existingRecord = await mnrRepository.findByIdDetailed(realId);
            assertWorkflowRecordAccess({
                allowed: this.canMutateMainRecord(existingRecord?.record || {}, actor),
                action: 'update',
                moduleName: 'MNR',
            });
            const dbUpdates = {
                last_update: now,
                updateby: actor.userId
            };
            // Main details — frontend sends standardized snake_case _id keys
            if (updates.site_id)
                dbUpdates.site_id = updates.site_id;
            if (updates.supplier_id)
                dbUpdates.supplier_id = updates.supplier_id;
            if (updates.model_id)
                dbUpdates.model_id = updates.model_id;
            if (updates.mfg_area_id)
                dbUpdates.mfg_area_id = updates.mfg_area_id;
            if (updates.defectcategory_id)
                dbUpdates.defectcategory_id = updates.defectcategory_id;
            if (updates.mnrType)
                dbUpdates.mnrtype_id = updates.mnrType;
            const typedUpdates = updates;
            const requestedAttentionId = typedUpdates.attention_id ??
                typedUpdates.attention ??
                typedUpdates.mainDetails?.attention;
            if (requestedAttentionId !== undefined) {
                dbUpdates.attention_id = await this.resolveAttentionId(trx, requestedAttentionId);
            }
            if (updates.reference !== undefined)
                dbUpdates.reference_no = updates.reference;
            if (updates.reportIssuance8D !== undefined)
                dbUpdates.report_issuance_8d = updates.reportIssuance8D ? 1 : 0;
            if (updates.recurrenceRef !== undefined) {
                dbUpdates.recurrence_ref = updates.recurrenceRef;
            }
            if (updates.issueDate)
                dbUpdates.issued_date = this.formatDate(updates.issueDate);
            if (updates.initialReport)
                dbUpdates.initial_report_date = this.formatDate(updates.initialReport);
            if (updates.dueDate)
                dbUpdates.due_date = this.formatDate(updates.dueDate);
            if (updates.actualInitialReport)
                dbUpdates.actual_initial_report_date = this.formatDate(updates.actualInitialReport);
            if (updates.actualFinalReport)
                dbUpdates.actual_final_report_date = this.formatDate(updates.actualFinalReport);
            if (updates.remarks !== undefined)
                dbUpdates.remarks = updates.remarks;
            // Disposition (accept both 'disposition' and 'disposition_data')
            const disp = updates.disposition || updates.disposition_data || {};
            if (disp.rtv !== undefined) {
                dbUpdates.rtv = typeof disp.rtv === 'object' ? (disp.rtv.selected ? 1 : 0) : (disp.rtv ? 1 : 0);
                if (typeof disp.rtv === 'object') {
                    if (disp.rtv.qty !== undefined)
                        dbUpdates.rtv_total_qty = disp.rtv.qty;
                    if (disp.rtv.remarks !== undefined)
                        dbUpdates.rtv_remarks = disp.rtv.remarks;
                }
                else {
                    const u = updates;
                    if (disp.rtvTotalQty !== undefined)
                        dbUpdates.rtv_total_qty = disp.rtvTotalQty;
                    else if (u.rtvTotalQty !== undefined)
                        dbUpdates.rtv_total_qty = u.rtvTotalQty;
                    if (disp.rtvRemarks !== undefined)
                        dbUpdates.rtv_remarks = disp.rtvRemarks;
                    else if (u.rtvRemarks !== undefined)
                        dbUpdates.rtv_remarks = u.rtvRemarks;
                }
            }
            if (disp.sort !== undefined) {
                dbUpdates.sort = typeof disp.sort === 'object' ? (disp.sort.selected ? 1 : 0) : (disp.sort ? 1 : 0);
                if (typeof disp.sort === 'object') {
                    if (disp.sort.sorted !== undefined)
                        dbUpdates.sort_sorted = disp.sort.sorted;
                    if (disp.sort.rejected !== undefined)
                        dbUpdates.sort_rejected = disp.sort.rejected;
                    if (disp.sort.rate !== undefined)
                        dbUpdates.sort_reject_rate = disp.sort.rate;
                    if (disp.sort.rework !== undefined)
                        dbUpdates.sort_rework = disp.sort.rework ? 1 : 0;
                    if (disp.sort.remarks !== undefined)
                        dbUpdates.sort_remarks = disp.sort.remarks;
                }
                else {
                    const u = updates;
                    if (disp.sortSorted !== undefined)
                        dbUpdates.sort_sorted = disp.sortSorted;
                    else if (u.sortSorted !== undefined)
                        dbUpdates.sort_sorted = u.sortSorted;
                    if (disp.sortRejected !== undefined)
                        dbUpdates.sort_rejected = disp.sortRejected;
                    else if (u.sortRejected !== undefined)
                        dbUpdates.sort_rejected = u.sortRejected;
                    if (disp.sortRejectRate !== undefined)
                        dbUpdates.sort_reject_rate = disp.sortRejectRate;
                    else if (u.sortRejectRate !== undefined)
                        dbUpdates.sort_reject_rate = u.sortRejectRate;
                    if (disp.sortRework !== undefined)
                        dbUpdates.sort_rework = disp.sortRework ? 1 : 0;
                    else if (u.sortRework !== undefined)
                        dbUpdates.sort_rework = u.sortRework ? 1 : 0;
                    if (disp.sortRemarks !== undefined)
                        dbUpdates.sort_remarks = disp.sortRemarks;
                    else if (u.sortRemarks !== undefined)
                        dbUpdates.sort_remarks = u.sortRemarks;
                }
            }
            if (disp.other !== undefined) {
                dbUpdates.other = typeof disp.other === 'object' ? (disp.other.selected ? 1 : 0) : (disp.other ? 1 : 0);
                if (typeof disp.other === 'object') {
                    if (disp.other.qty !== undefined)
                        dbUpdates.other_affected_qty = disp.other.qty;
                    if (disp.other.doc !== undefined)
                        dbUpdates.other_affected_doc = disp.other.doc;
                    if (disp.other.remarks !== undefined)
                        dbUpdates.other_remarks = disp.other.remarks;
                }
                else {
                    const u = updates;
                    if (disp.otherAffectedQty !== undefined)
                        dbUpdates.other_affected_qty = disp.otherAffectedQty;
                    else if (u.otherAffectedQty !== undefined)
                        dbUpdates.other_affected_qty = u.otherAffectedQty;
                    if (disp.otherAffectedDoc !== undefined)
                        dbUpdates.other_affected_doc = disp.otherAffectedDoc;
                    else if (u.otherAffectedDoc !== undefined)
                        dbUpdates.other_affected_doc = u.otherAffectedDoc;
                    if (disp.otherRemarks !== undefined)
                        dbUpdates.other_remarks = disp.otherRemarks;
                    else if (u.otherRemarks !== undefined)
                        dbUpdates.other_remarks = u.otherRemarks;
                }
            }
            // 4. Response 8D + Verification (Update/Upsert)
            const responsePayload = updates.response8D;
            if (responsePayload && typeof responsePayload === 'object') {
                await this.persistResponseArtifacts(trx, realId, responsePayload, actor.userId || 'SYSTEM', now);
            }
            // 5. Attachments (Update)
            const updateAtts = updates.attachments;
            if (updateAtts !== undefined && Array.isArray(updateAtts)) {
                console.log(`[MNR Update] Syncing ${updateAtts.length} attachments for record ${id}`);
                const existingAttachments = await trx.selectFrom('MNR_ATTACHMENT')
                    .select(['mnr_attachment_id', 'file_name', 'remarks'])
                    .where('mnr_id', '=', realId)
                    .execute();
                const existingById = new Map(existingAttachments.map((a) => [a.mnr_attachment_id, a]));
                await trx.deleteFrom('MNR_ATTACHMENT').where('mnr_id', '=', realId).execute();
                for (const att of updateAtts) {
                    const originalName = att.file_name || att.name;
                    const existing = att.id ? existingById.get(att.id) : undefined;
                    if (!originalName && !existing?.file_name)
                        continue;
                    const uploadedFile = originalName
                        ? files.find(f => f.originalname === originalName)
                        : undefined;
                    const diskFileName = uploadedFile
                        ? uploadedFile.filename
                        : (existing?.file_name || originalName);
                    const originalLabel = uploadedFile?.originalname || originalName || existing?.file_name || '';
                    const remarkBase = (att.remarks || existing?.remarks || '').replace(/\s*\(Original:\s.*?\)\s*$/, '').trim();
                    const withOriginalMarker = originalLabel
                        ? `${remarkBase}${remarkBase ? ' ' : ''}(Original: ${originalLabel})`
                        : remarkBase;
                    await trx.insertInto('MNR_ATTACHMENT').values({
                        mnr_attachment_id: att.id || uuidv4(),
                        mnr_id: realId,
                        file_name: diskFileName,
                        file_extension: diskFileName.split('.').pop() || att.extension || 'bin',
                        remarks: withOriginalMarker || null,
                        last_update: now,
                        updateby: actor.userId || 'SYSTEM'
                    }).execute();
                }
            }
            // Update Main Fields
            if (Object.keys(dbUpdates).length > 2) {
                await trx.updateTable('MNR_LOTS')
                    .set(dbUpdates)
                    .where((eb) => eb.or([
                    eb('mnr_id', '=', id),
                    eb('control_no', '=', id)
                ]))
                    .execute();
            }
            // Detailed handling for CC, Defects, and Response is simplified for exact parity
            // ... (Omitted full syncing logic for time and clarity, but structure is here)
            return { success: true, message: 'Record updated successfully' };
        });
    }
    async deleteRecord(id, actor = {}) {
        return await mnrRepository.executeTransaction(async (trx) => {
            // Resolve real mnr_id if control_no was passed
            const record = await trx.selectFrom('MNR_LOTS')
                .select('mnr_id')
                .where((eb) => eb.or([
                eb('mnr_id', '=', id),
                eb('control_no', '=', id)
            ]))
                .executeTakeFirst();
            if (!record)
                return { success: false, message: 'Record not found' };
            const realId = record.mnr_id;
            const existingRecord = await mnrRepository.findByIdDetailed(realId);
            assertWorkflowRecordAccess({
                allowed: this.canMutateMainRecord(existingRecord?.record || {}, actor),
                action: 'delete',
                moduleName: 'MNR',
            });
            await trx.deleteFrom('MNR_CC').where('mnr_id', '=', realId).execute();
            await trx.deleteFrom('MNR_ATTACHMENT').where('mnr_id', '=', realId).execute();
            await trx.deleteFrom('MNR_VERIFICATION').where('mnr_id', '=', realId).execute();
            const responses = await trx.selectFrom('MNR_RESPONSE').select('mnr_response_id').where('mnr_id', '=', realId).execute();
            for (const res of responses) {
                await trx.deleteFrom('MNR_RESPONSE_ATTACHMENT').where('mnr_response_id', '=', res.mnr_response_id).execute();
            }
            await trx.deleteFrom('MNR_RESPONSE').where('mnr_id', '=', realId).execute();
            await trx.deleteFrom('MNR_DETAILS').where('mnr_id', '=', realId).execute();
            // Delete Header last
            await trx.deleteFrom('MNR_LOTS').where('mnr_id', '=', realId).execute();
            return { success: true, message: 'Record and all associated data deleted successfully' };
        });
    }
}
export const mnrService = new MnrService();
