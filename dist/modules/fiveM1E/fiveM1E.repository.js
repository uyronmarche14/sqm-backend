import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';
import { db } from '../../shared/infrastructure/db.js';
import { sql } from 'kysely';
/** Check if value is a pure numeric string (matches int ID column) */
const isNumeric = (val) => /^\d+$/.test(val);
export class FiveM1ERepository extends BaseRepository {
    constructor() {
        super('TBL_5M1E_Application');
    }
    /**
     * Helper to fetch the next ID for a table lacking an identity column.
     * This is a workaround for production SQL Server identity mismatch.
     */
    async getNextId(trx, tableName) {
        const result = await trx
            .selectFrom(tableName)
            .select(db.fn.max('ID').as('maxId'))
            .executeTakeFirst();
        return (Number(result?.maxId) || 0) + 1;
    }
    // =========================================================================
    // Application + Approval Queries
    // =========================================================================
    async findWithApproval(idOrControlNo) {
        // Use any cast to bypass Kysely's strict type checking for complex multi-table joins
        const dbAny = db;
        let query = dbAny
            .selectFrom('TBL_5M1E_Application as app')
            .leftJoin('TBL_5M1E_Approval as approval', 'app.ControlNo', 'approval.ControlNo')
            .leftJoin('SUPPLIERS as sup', 'app.SupplierID', 'sup.supplier_id')
            .leftJoin('SUPPLIERS as vendorSup', 'app.VendorID', 'vendorSup.supplier_id')
            .leftJoin('MFG_SITES as site', 'app.SiteID', 'site.site_id')
            .leftJoin('MODELS as mdl', 'app.ModelID', 'mdl.model_id')
            .leftJoin('PARTTYPES as pt', 'app.CommodityID', 'pt.parttype_id')
            .leftJoin('PARTS as part', 'app.ItemID', 'part.part_id')
            .leftJoin('PARTCLASS as partClass', 'app.Class', 'partClass.partclass_id')
            .leftJoin('PARTCLASSCATEGORIES as classCategory', 'app.ClassType', 'classCategory.Category_ID')
            .leftJoin('PARTCLASSCATEGORIES as rankCategory', 'app.RankID', 'rankCategory.Category_ID')
            // JOIN USERS to resolve UUIDs → human-readable names
            .leftJoin('USERS as reviewerUser', 'approval.Reviewer', 'reviewerUser.user_id')
            .leftJoin('USERS as checkerUser', 'approval.Checker', 'checkerUser.user_id')
            .leftJoin('USERS as approverUser', 'approval.Approver', 'approverUser.user_id')
            .leftJoin('USERS as creatorUser', 'app.CreatedBy', 'creatorUser.user_id')
            .leftJoin('USERS as mpdApproverUser', 'approval.MPDApprover', 'mpdApproverUser.user_id')
            .leftJoin('USERS as evalPicUser', 'approval.MPDPIC', 'evalPicUser.user_id')
            .leftJoin('USERS as enviApproverUser', 'approval.EnviApproverID', 'enviApproverUser.user_id')
            .leftJoin('USERS as enviCheckerUser', 'approval.EnviCheckerID', 'enviCheckerUser.user_id')
            .leftJoin('USERS as sqeCheckerUser', 'approval.QACheckerID', 'sqeCheckerUser.user_id')
            .leftJoin('USERS as sqeApproverUser', 'approval.FinalApprover', 'sqeApproverUser.user_id')
            .leftJoin('USERS as designApproverUser', 'approval.DesignApproverID', 'designApproverUser.user_id')
            .leftJoin('USERS as designCheckerUser', 'approval.DesignCheckerID', 'designCheckerUser.user_id')
            .leftJoin('PRODUCTS as prod', 'app.Attribute03', 'prod.product_id')
            .selectAll('app')
            .select([
            'approval.Status as approval_status',
            'approval.ApprovalSeq as approval_seq',
            'approval.MPDPIC as mpd_pic',
            'approval.MPDChecker as mpd_checker',
            'approval.MPDCheckerName as mpd_checker_name',
            'approval.MPDCheckerStatus as mpd_checker_status',
            'approval.MPDApprover as mpd_approver',
            'approval.MPDApproverName as mpd_approver_name',
            'approval.MPDApproverStatus as mpd_approver_status',
            // Approval section fields
            'approval.Reviewer as reviewer',
            'approval.ReviewerName as reviewer_name',
            'approval.ReviewerStatus as reviewer_status',
            'approval.Checker as checker',
            'approval.CheckerName as checker_name',
            'approval.ChkrStatus as chkr_status',
            'approval.Approver as approver',
            'approval.ApproverName as approver_name',
            'approval.AprStatus as apr_status',
            'approval.IssueDate as issue_date',
            'approval.ChkrDtAprd as chkr_dt_aprd',
            'approval.ApproverDtAprd as approver_dt_aprd',
            'approval.EvaluationIC as evaluation_ic',
            'approval.EvaluationICName as evaluation_ic_name',
            'approval.EvaluationICStatus as evaluation_ic_status',
            // SQE / QA Approval fields
            'approval.QACheckerID as qa_checker_id',
            'approval.QACheckerName as qa_checker_name',
            'approval.QACheckerStatus as qa_checker_status',
            'approval.QACheckerDtAprd as qa_checker_dt_aprd',
            'approval.FinalApprover as final_approver',
            'approval.FAName as fa_name',
            'approval.FAStatus as fa_status',
            'approval.FADtAprd as fa_dt_aprd',
            // Design Approval fields
            'approval.DSAppproverNecessary as ds_approver_necessary',
            'approval.DesignApproverID as design_approver_id',
            'approval.DesignApproverName as design_approver_name',
            'approval.DesignApproverStatus as design_approver_status',
            'approval.DesignApproverDtAprd as design_approver_dt_aprd',
            'approval.DSCheckerNecessary as ds_checker_necessary',
            'approval.DesignCheckerID as design_checker_id',
            'approval.DesignCheckerName as design_checker_name',
            'approval.DesignCheckerDtAprd as design_checker_dt_aprd',
            'approval.RevisedSequence as revised_sequence',
            // Environment Approval fields
            'approval.EnviCheckerNecessary as envi_checker_necessary',
            'approval.EnviCheckerID as envi_checker_id',
            'approval.EnviCheckerName as envi_checker_name',
            'approval.EnviCheckerStatus as envi_checker_status',
            'approval.EnviCheckerDtAprd as envi_checker_dt_aprd',
            'approval.EnviAppproverNecessary as envi_approver_necessary',
            'approval.EnviApproverID as envi_approver_id',
            'approval.EnviApproveName as envi_approve_name',
            'approval.EnviApproveStatus as envi_approve_status',
            'approval.EnviApproveDtAprd as envi_approve_dt_aprd',
            // Human-readable names from USERS joins
            'reviewerUser.full_name as reviewer_full_name',
            'checkerUser.full_name as checker_full_name',
            'approverUser.full_name as approver_full_name',
            'creatorUser.full_name as created_by_name',
            'mpdApproverUser.full_name as mpd_approver_name',
            'enviApproverUser.full_name as envi_approver_full_name',
            'enviCheckerUser.full_name as envi_checker_full_name',
            'sqeCheckerUser.full_name as qa_checker_full_name',
            'sqeApproverUser.full_name as fa_full_name',
            'designApproverUser.full_name as design_approver_id_name',
            'designCheckerUser.full_name as design_checker_id_name',
            // Human-readable names from master data joins
            'sup.supplier_name as supplier_name',
            'vendorSup.supplier_name as vendor_name',
            'site.site_name as site_name',
            'site.site_code as site_code',
            'part.part_code as part_code',
            'part.part_name as item_name',
            'mdl.model_name as model_name',
            'pt.parttype_name as part_type_name',
            'pt.parttype_code as part_type_code',
            'prod.product_name as attribute_03_name',
            'prod.product_code as product_code',
            sql `COALESCE(partClass.partclass_desc, partClass.partclass_name)`.as('class_name'),
            'partClass.partclass_desc as class_desc',
            'classCategory.Category_name as class_type_name',
            'classCategory.Category_name as category_name',
            'classCategory.Category_name as attribute_06_name',
            'rankCategory.Category_name as rank_name',
            'rankCategory.Category_name as attribute_05_name',
            'evalPicUser.full_name as mpd_pic_name',
        ]);
        if (isNumeric(idOrControlNo)) {
            query = query.where((eb) => eb.or([
                eb('app.ControlNo', '=', idOrControlNo),
                eb('app.ID', '=', parseInt(idOrControlNo, 10)),
            ]));
        }
        else {
            query = query.where('app.ControlNo', '=', idOrControlNo);
        }
        return await query.executeTakeFirst();
    }
    async findAllWithApproval(statusFilter) {
        const dbAny = db;
        let query = dbAny
            .selectFrom('TBL_5M1E_Application as app')
            .leftJoin('TBL_5M1E_Approval as approval', 'app.ControlNo', 'approval.ControlNo')
            .leftJoin('SUPPLIERS as sup', 'app.SupplierID', 'sup.supplier_id')
            .leftJoin('SUPPLIERS as vendorSup', 'app.VendorID', 'vendorSup.supplier_id')
            .leftJoin('MFG_SITES as site', 'app.SiteID', 'site.site_id')
            .leftJoin('MODELS as mdl', 'app.ModelID', 'mdl.model_id')
            .leftJoin('PARTTYPES as pt', 'app.CommodityID', 'pt.parttype_id')
            .leftJoin('PARTS as part', 'app.ItemID', 'part.part_id')
            .leftJoin('PARTCLASS as partClass', 'app.Class', 'partClass.partclass_id')
            .leftJoin('PARTCLASSCATEGORIES as classCategory', 'app.ClassType', 'classCategory.Category_ID')
            .leftJoin('PARTCLASSCATEGORIES as rankCategory', 'app.RankID', 'rankCategory.Category_ID')
            .leftJoin('USERS as reviewerUser', 'approval.Reviewer', 'reviewerUser.user_id')
            .leftJoin('USERS as checkerUser', 'approval.Checker', 'checkerUser.user_id')
            .leftJoin('USERS as approverUser', 'approval.Approver', 'approverUser.user_id')
            .leftJoin('USERS as evalPicUser', 'approval.MPDPIC', 'evalPicUser.user_id')
            .leftJoin('USERS as enviApproverUser', 'approval.EnviApproverID', 'enviApproverUser.user_id')
            .leftJoin('USERS as enviCheckerUser', 'approval.EnviCheckerID', 'enviCheckerUser.user_id')
            .leftJoin('USERS as sqeCheckerUser', 'approval.QACheckerID', 'sqeCheckerUser.user_id')
            .leftJoin('USERS as sqeApproverUser', 'approval.FinalApprover', 'sqeApproverUser.user_id')
            .leftJoin('USERS as designApproverUser', 'approval.DesignApproverID', 'designApproverUser.user_id')
            .leftJoin('USERS as designCheckerUser', 'approval.DesignCheckerID', 'designCheckerUser.user_id')
            .leftJoin('PRODUCTS as prod', 'app.Attribute03', 'prod.product_id')
            .selectAll('app')
            .select([
            'approval.Status as approval_status',
            'approval.ApprovalSeq as approval_seq',
            'approval.MPDPIC as mpd_pic',
            'approval.MPDChecker as mpd_checker',
            'approval.MPDCheckerName as mpd_checker_name',
            'approval.MPDCheckerStatus as mpd_checker_status',
            'approval.MPDApprover as mpd_approver',
            'approval.MPDApproverName as mpd_approver_name',
            'approval.MPDApproverStatus as mpd_approver_status',
            // Approval section fields
            'approval.Reviewer as reviewer',
            'approval.ReviewerName as reviewer_name',
            'approval.ReviewerStatus as reviewer_status',
            'approval.Checker as checker',
            'approval.CheckerName as checker_name',
            'approval.ChkrStatus as chkr_status',
            'approval.Approver as approver',
            'approval.ApproverName as approver_name',
            'approval.AprStatus as apr_status',
            'approval.EvaluationIC as evaluation_ic',
            'approval.EvaluationICName as evaluation_ic_name',
            'approval.EvaluationICStatus as evaluation_ic_status',
            // SQE / QA Approval fields
            'approval.QACheckerID as qa_checker_id',
            'approval.QACheckerName as qa_checker_name',
            'approval.QACheckerStatus as qa_checker_status',
            'approval.QACheckerDtAprd as qa_checker_dt_aprd',
            'approval.FinalApprover as final_approver',
            'approval.FAName as fa_name',
            'approval.FAStatus as fa_status',
            'approval.FADtAprd as fa_dt_aprd',
            // Design Approval fields
            'approval.DSAppproverNecessary as ds_approver_necessary',
            'approval.DesignApproverID as design_approver_id',
            'approval.DesignApproverName as design_approver_name',
            'approval.DesignApproverStatus as design_approver_status',
            'approval.DesignApproverDtAprd as design_approver_dt_aprd',
            'approval.DSCheckerNecessary as ds_checker_necessary',
            'approval.DesignCheckerID as design_checker_id',
            'approval.DesignCheckerName as design_checker_name',
            'approval.DesignCheckerDtAprd as design_checker_dt_aprd',
            'approval.RevisedSequence as revised_sequence',
            // Environment Approval fields
            'approval.EnviAppproverNecessary as envi_approver_necessary',
            'approval.EnviApproverID as envi_approver_id',
            'approval.EnviApproveStatus as envi_approve_status',
            'approval.EnviCheckerNecessary as envi_checker_necessary',
            'approval.EnviCheckerID as envi_checker_id',
            'approval.EnviCheckerStatus as envi_checker_status',
            // Human-readable names from joined tables
            'sup.supplier_name as supplier_name',
            'site.site_name as site_name',
            'site.site_code as site_code',
            'reviewerUser.full_name as reviewer_full_name',
            'checkerUser.full_name as checker_full_name',
            'approverUser.full_name as approver_full_name',
            'enviApproverUser.full_name as envi_approver_full_name',
            'enviCheckerUser.full_name as envi_checker_full_name',
            'sqeCheckerUser.full_name as qa_checker_full_name',
            'sqeApproverUser.full_name as fa_full_name',
            'designApproverUser.full_name as design_approver_id_name',
            'designCheckerUser.full_name as design_checker_id_name',
            'prod.product_name as attribute_03_name',
            'vendorSup.supplier_name as vendor_name',
            'part.part_code as part_code',
            'part.part_name as item_name',
            'mdl.model_name as model_name',
            'pt.parttype_name as part_type_name',
            'pt.parttype_code as part_type_code',
            'prod.product_code as product_code',
            sql `COALESCE(partClass.partclass_desc, partClass.partclass_name)`.as('class_name'),
            'partClass.partclass_desc as class_desc',
            'classCategory.Category_name as class_type_name',
            'classCategory.Category_name as category_name',
            'classCategory.Category_name as attribute_06_name',
            'rankCategory.Category_name as rank_name',
            'rankCategory.Category_name as attribute_05_name',
            'evalPicUser.full_name as mpd_pic_name',
        ]);
        if (statusFilter && statusFilter !== 'all') {
            const statuses = statusFilter.split(',').map(s => s.trim().toUpperCase());
            // Include CHECKED records alongside SUBMITTED/FAPPROVED for Awaiting Approval pages
            // so checked records remain visible until approved
            if (statuses.length === 1 && statuses[0] === 'SUBMITTED') {
                query = query.where('approval.Status', 'in', ['SUBMITTED', 'CHECKED']);
            }
            else if (statuses.length === 1 && statuses[0] === 'FAPPROVED') {
                query = query.where('approval.Status', 'in', ['FAPPROVED', 'FOR APPROVAL', 'CHECKED']);
            }
            else {
                query = query.where('approval.Status', 'in', statuses);
            }
        }
        return await query.orderBy('app.CreateDate', 'desc').execute();
    }
    async createWithApproval(appData, approvalStatus = 'DRAFT', approvalData = {}) {
        return await db.transaction().execute(async (trx) => {
            // SQL Server doesn't support RETURNING clause - insert then select
            // WORKAROUND: Manually fetch IDs for tables missing identity property
            const nextAppId = await this.getNextId(trx, 'TBL_5M1E_Application');
            const nextApprovalId = await this.getNextId(trx, 'TBL_5M1E_Approval');
            const insertData = {
                ID: nextAppId,
                ControlNo: appData.ControlNo,
                Title: appData.Title,
                SupplierID: appData.SupplierID,
                SupplierCN: appData.SupplierCN,
                VendorID: appData.VendorID,
                ItemID: appData.ItemID,
                SiteID: appData.SiteID,
                CommodityID: appData.CommodityID,
                ModelID: appData.ModelID,
                EngineerRemarks: appData.EngineerRemarks,
                ReportNo: appData.ReportNo,
                DateRegister: appData.DateRegister,
                Class: appData.Class,
                ClassType: appData.ClassType,
                ImpactDate: appData.ImpactDate,
                Attribute01: appData.Attribute01,
                Attribute02: appData.Attribute02,
                Attribute03: appData.Attribute03,
                Attribute04: appData.Attribute04,
                Attribute05: appData.Attribute05,
                Attribute06: appData.Attribute06,
                Attribute07: appData.Attribute07,
                Attribute08: appData.Attribute08,
                Attribute09: appData.Attribute09,
                Attribute10: appData.Attribute10,
                // Dedicated Evaluation Columns
                RankID: appData.RankID,
                ChangeQCProcess: appData.ChangeQCProcess,
                ChangeSupplierSpec: appData.ChangeSupplierSpec,
                ProcessAuditResult: appData.ProcessAuditResult,
                // EnvironmentalApproval lives in TBL_5M1E_Approval, not here
                CreatedBy: appData.CreatedBy,
                CreateDate: appData.CreateDate,
                ModifiedDate: appData.ModifiedDate,
            };
            await trx
                .insertInto('TBL_5M1E_Application')
                .values(insertData)
                .execute();
            // Fetch the newly inserted record using ControlNo
            const newApp = await trx
                .selectFrom('TBL_5M1E_Application')
                .selectAll()
                .where('ControlNo', '=', appData.ControlNo)
                .executeTakeFirstOrThrow();
            await trx
                .insertInto('TBL_5M1E_Approval')
                .values({
                ID: nextApprovalId,
                ControlNo: newApp.ControlNo,
                Status: approvalStatus,
                CreateDate: new Date(),
                // NOT NULL defaults required by DB schema
                DSCheckerNecessary: 'NO',
                DSAppproverNecessary: 'NO',
                EnviCheckerNecessary: 'NO',
                EnviAppproverNecessary: 'NO',
                // Spread any extra approval fields from frontend
                ...approvalData,
            })
                .execute();
            return newApp;
        });
    }
    async updateByControlNo(idOrControlNo, updateData) {
        let query = db
            .updateTable('TBL_5M1E_Application')
            .set({
            ...updateData,
            ModifiedDate: new Date(),
        });
        if (isNumeric(idOrControlNo)) {
            query = query.where((eb) => eb.or([
                eb('ControlNo', '=', idOrControlNo),
                eb('ID', '=', parseInt(idOrControlNo, 10)),
            ]));
        }
        else {
            query = query.where('ControlNo', '=', idOrControlNo);
        }
        // SQL Server doesn't support RETURNING clause - update then select
        await query.execute();
        // Fetch the updated record
        let selectQuery = db
            .selectFrom('TBL_5M1E_Application')
            .selectAll();
        if (isNumeric(idOrControlNo)) {
            selectQuery = selectQuery.where((eb) => eb.or([
                eb('ControlNo', '=', idOrControlNo),
                eb('ID', '=', parseInt(idOrControlNo, 10)),
            ]));
        }
        else {
            selectQuery = selectQuery.where('ControlNo', '=', idOrControlNo);
        }
        return await selectQuery.executeTakeFirst();
    }
    async updateApprovalStatus(controlNo, status, extraFields) {
        const updateData = {
            Status: status,
            ModifiedDate: new Date(),
            ...extraFields,
        };
        return await db
            .updateTable('TBL_5M1E_Approval')
            .set(updateData)
            .where('ControlNo', '=', controlNo)
            .execute();
    }
    async renameControlNo(oldControlNo, newControlNo) {
        if (!oldControlNo || !newControlNo || oldControlNo === newControlNo) {
            return;
        }
        await db.transaction().execute(async (trx) => {
            await trx
                .updateTable('TBL_5M1E_Application')
                .set({ ControlNo: newControlNo })
                .where('ControlNo', '=', oldControlNo)
                .execute();
            await trx
                .updateTable('TBL_5M1E_Approval')
                .set({ ControlNo: newControlNo })
                .where('ControlNo', '=', oldControlNo)
                .execute();
            await trx
                .updateTable('TBL_5M1E_PartsPerReport')
                .set({ PartsTag: newControlNo })
                .where('PartsTag', '=', oldControlNo)
                .execute();
            await trx
                .updateTable('TBL_5M1E_Attachment')
                .set({ ControlNo: newControlNo })
                .where('ControlNo', '=', oldControlNo)
                .execute();
            await trx
                .updateTable('TBL_5M1E_ActionItems')
                .set({ ControlNo: newControlNo })
                .where('ControlNo', '=', oldControlNo)
                .execute();
            await trx
                .updateTable('TBL_5M1E_CheckItems')
                .set({ ControlNo: newControlNo })
                .where('ControlNo', '=', oldControlNo)
                .execute();
            await trx
                .updateTable('TBL_5M1E_Status_Remarks')
                .set({ ControlNo: newControlNo })
                .where('ControlNo', '=', oldControlNo)
                .execute();
            await trx
                .updateTable('TBL_5M1E_CC')
                .set({ ControlNo: newControlNo })
                .where('ControlNo', '=', oldControlNo)
                .execute();
        });
    }
    // =========================================================================
    // Delete Operations
    // =========================================================================
    async deleteApproval(controlNo) {
        return await db
            .deleteFrom('TBL_5M1E_Approval')
            .where('ControlNo', '=', controlNo)
            .execute();
    }
    async deleteByControlNo(controlNo) {
        return await db
            .deleteFrom('TBL_5M1E_Application')
            .where('ControlNo', '=', controlNo)
            .execute();
    }
    // =========================================================================
    // Child Table: Parts (TBL_5M1E_PartsPerReport)
    // =========================================================================
    async findParts(controlNo) {
        return await db
            .selectFrom('TBL_5M1E_PartsPerReport')
            .selectAll()
            .where('PartsTag', '=', controlNo)
            .execute();
    }
    async insertParts(controlNo, parts) {
        for (const part of parts) {
            if (!part.part_id)
                continue;
            // Manual TagID increment
            const nextIdResult = await db.selectFrom('TBL_5M1E_PartsPerReport').select(db.fn.max('TagID').as('maxId')).executeTakeFirst();
            const nextId = (Number(nextIdResult?.maxId) || 0) + 1;
            await db.insertInto('TBL_5M1E_PartsPerReport').values({
                TagID: nextId,
                PartsTag: controlNo,
                part_id: part.part_id,
                DateAdded: new Date(),
            }).execute();
        }
    }
    async replaceParts(controlNo, parts) {
        await db.deleteFrom('TBL_5M1E_PartsPerReport').where('PartsTag', '=', controlNo).execute();
        await this.insertParts(controlNo, parts);
    }
    // =========================================================================
    // Child Table: Attachments (TBL_5M1E_Attachment)
    // =========================================================================
    async findAttachments(controlNo) {
        return await db
            .selectFrom('TBL_5M1E_Attachment')
            .selectAll()
            .where('ControlNo', '=', controlNo)
            .execute();
    }
    async insertAttachments(controlNo, attachments) {
        const now = new Date();
        for (const att of attachments) {
            if (!att.file_name)
                continue;
            // Manual ID increment
            const nextIdResult = await db.selectFrom('TBL_5M1E_Attachment').select(db.fn.max('ID').as('maxId')).executeTakeFirst();
            const nextId = (Number(nextIdResult?.maxId) || 0) + 1;
            await db.insertInto('TBL_5M1E_Attachment').values({
                ID: nextId,
                ControlNo: controlNo,
                FileName: att.file_name,
                Attribute1: att.attribute_1 || null,
                Attribute2: att.attribute_2 || null,
                CreateDate: now,
            }).execute();
        }
    }
    async replaceAttachments(controlNo, attachments) {
        await db.deleteFrom('TBL_5M1E_Attachment').where('ControlNo', '=', controlNo).execute();
        await this.insertAttachments(controlNo, attachments);
    }
    // =========================================================================
    // Child Table: Action Items (TBL_5M1E_ActionItems)
    // =========================================================================
    async findActionItems(controlNo) {
        return await db
            .selectFrom('TBL_5M1E_ActionItems')
            .selectAll()
            .where('ControlNo', '=', controlNo)
            .execute();
    }
    async insertActionItems(controlNo, items) {
        const now = new Date();
        for (const item of items) {
            // Manual ID increment
            const nextIdResult = await db.selectFrom('TBL_5M1E_ActionItems').select(db.fn.max('ID').as('maxId')).executeTakeFirst();
            const nextId = (Number(nextIdResult?.maxId) || 0) + 1;
            await db.insertInto('TBL_5M1E_ActionItems').values({
                ID: nextId,
                ControlNo: controlNo,
                ActionItem: item.action_item || null,
                PIC: item.pic || null,
                FirstTargetDt: item.first_target_dt || null,
                VerificationResult: item.verification_result || null,
                Remarks: item.remarks || null,
                CreateDate: now,
            }).execute();
        }
    }
    async replaceActionItems(controlNo, items) {
        await this.deleteActionItemAttachmentsByControlNo(controlNo);
        await db.deleteFrom('TBL_5M1E_ActionItems').where('ControlNo', '=', controlNo).execute();
        await this.insertActionItems(controlNo, items);
    }
    // =========================================================================
    // Child Table: Check Items (TBL_5M1E_CheckItems)
    // =========================================================================
    async findCheckItems(controlNo) {
        return await db
            .selectFrom('TBL_5M1E_CheckItems')
            .selectAll()
            .where('ControlNo', '=', controlNo)
            .execute();
    }
    async insertCheckItems(controlNo, items) {
        const now = new Date();
        for (const item of items) {
            // Manual ID increment
            const nextIdResult = await db.selectFrom('TBL_5M1E_CheckItems').select(db.fn.max('ID').as('maxId')).executeTakeFirst();
            const nextId = (Number(nextIdResult?.maxId) || 0) + 1;
            await db.insertInto('TBL_5M1E_CheckItems').values({
                ID: nextId,
                ControlNo: controlNo,
                CheckItem: item.check_item || '',
                Judgement: item.judgement || '',
                Remarks: item.remarks || null,
                Attribute1: item.attribute_1 || null,
                Attribute2: item.attribute_2 || null,
                CreateDate: now,
            }).execute();
        }
    }
    async replaceCheckItems(controlNo, items) {
        await this.deleteCheckItemAttachmentsByControlNo(controlNo);
        await db.deleteFrom('TBL_5M1E_CheckItems').where('ControlNo', '=', controlNo).execute();
        await this.insertCheckItems(controlNo, items);
    }
    // =========================================================================
    // Child Table: Action Item Attachments (TBL_5M1E_AI_Attachment)
    // =========================================================================
    async deleteActionItemAttachmentsByControlNo(controlNo) {
        const dbAny = db;
        return await dbAny
            .deleteFrom('TBL_5M1E_AI_Attachment')
            .where('ChkItemID', 'in', dbAny
            .selectFrom('TBL_5M1E_ActionItems')
            .select('ID')
            .where('ControlNo', '=', controlNo))
            .execute();
    }
    async insertActionItemAttachments(actionItemId, attachments) {
        const now = new Date();
        for (const att of attachments) {
            if (!att.file_name)
                continue;
            // Manual ID increment
            const nextIdResult = await db.selectFrom('TBL_5M1E_AI_Attachment').select(db.fn.max('ID').as('maxId')).executeTakeFirst();
            const nextId = (Number(nextIdResult?.maxId) || 0) + 1;
            await db.insertInto('TBL_5M1E_AI_Attachment').values({
                ID: nextId,
                ChkItemID: actionItemId,
                FileName: att.file_name,
                attribute1: att.attribute1 || null,
                attribute2: att.attribute2 || null,
                CreateDate: now,
            }).execute();
        }
    }
    // =========================================================================
    // Child Table: Check Item Attachments (TBL_5M1E_CI_Attachment)
    // =========================================================================
    async deleteCheckItemAttachmentsByControlNo(controlNo) {
        const dbAny = db;
        return await dbAny
            .deleteFrom('TBL_5M1E_CI_Attachment')
            .where('ChkItemID', 'in', dbAny
            .selectFrom('TBL_5M1E_CheckItems')
            .select('ID')
            .where('ControlNo', '=', controlNo))
            .execute();
    }
    async insertCheckItemAttachments(checkItemId, attachments) {
        const now = new Date();
        for (const att of attachments) {
            if (!att.file_name)
                continue;
            // Manual ID increment
            const nextIdResult = await db.selectFrom('TBL_5M1E_CI_Attachment').select(db.fn.max('ID').as('maxId')).executeTakeFirst();
            const nextId = (Number(nextIdResult?.maxId) || 0) + 1;
            await db.insertInto('TBL_5M1E_CI_Attachment').values({
                ID: nextId,
                ChkItemID: checkItemId,
                FileName: att.file_name,
                attribute1: att.attribute1 || null,
                attribute2: att.attribute2 || null,
                CreateDate: now,
            }).execute();
        }
    }
    // =========================================================================
    // Child Table: Status Remarks (TBL_5M1E_Status_Remarks)
    // =========================================================================
    async findStatusRemarks(controlNo) {
        return await db
            .selectFrom('TBL_5M1E_Status_Remarks')
            .selectAll()
            .where('ControlNo', '=', controlNo)
            .orderBy('CreateDate', 'desc')
            .execute();
    }
    async insertStatusRemark(controlNo, remark) {
        // Manual ID increment
        const nextIdResult = await db.selectFrom('TBL_5M1E_Status_Remarks').select(db.fn.max('ID').as('maxId')).executeTakeFirst();
        const nextId = (Number(nextIdResult?.maxId) || 0) + 1;
        await db.insertInto('TBL_5M1E_Status_Remarks').values({
            ID: nextId,
            ControlNo: controlNo,
            Remarks: remark.remarks || null,
            RemarkBy: remark.remark_by,
            Status: remark.status,
            CreateDate: new Date(),
        }).execute();
    }
    async replaceStatusRemarks(controlNo, remarks) {
        await db.deleteFrom('TBL_5M1E_Status_Remarks').where('ControlNo', '=', controlNo).execute();
        for (const remark of remarks) {
            await this.insertStatusRemark(controlNo, remark);
        }
    }
    // =========================================================================
    // CC Notification
    // =========================================================================
    async findCCUsers(controlNo) {
        const result = await sql `
      SELECT cc.ID as id, cc.ControlNo as control_no, cc.UserID as user_id,
             u.full_name, u.email
      FROM TBL_5M1E_CC cc
      LEFT JOIN USERS u ON cc.UserID = u.user_id
      WHERE cc.ControlNo = ${controlNo}
    `.execute(db);
        return result.rows;
    }
    async replaceCCUsers(controlNo, ccList, userId = 'SYSTEM') {
        // 1. Delete existing
        await db.deleteFrom('TBL_5M1E_CC').where('ControlNo', '=', controlNo).execute();
        // 2. Insert new list
        if (ccList && ccList.length > 0) {
            for (const cc of ccList) {
                await db.insertInto('TBL_5M1E_CC').values({
                    ID: require('uuid').v4(),
                    ControlNo: controlNo,
                    UserID: cc.user_id,
                    UpdateBy: userId,
                    LastUpdate: new Date(),
                }).execute();
            }
        }
    }
}
export const fiveM1ERepository = new FiveM1ERepository();
