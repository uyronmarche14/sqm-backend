import { v4 as uuidv4 } from 'uuid';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors/AppError.js';
import { controlNumberService } from '../../../shared/services/control-number.service.js';
import { ssiRepository } from '../ssi.repository.js';
import { buildEmptyRecord, buildSsiScheduleFromRow, getDefaultAuditType } from '../shared/ssi-shared.js';
import { ssiAccessService } from '../shared/ssi-access.service.js';
import type { SsiActorContext, SsiCategoryFamily, SsiSchedule } from '../types/ssi.types.js';
import { ssiRecordCommandService } from '../records/ssi-record-command.service.js';

type SchedulePayload = Partial<SsiSchedule>;

export class SsiPlanService {
  async list(actor: SsiActorContext, statuses?: string[]) {
    const rows = await ssiRepository.findAllPlans(statuses);
    const plans = rows.map((row) => buildSsiScheduleFromRow(row as Record<string, unknown>));
    return ssiAccessService.filterReadablePlans(plans, actor);
  }

  async getById(id: string, actor?: SsiActorContext) {
    const row = await ssiRepository.findPlanById(id);
    if (!row) {
      throw new NotFoundError('SSI plan not found');
    }

    const plan = buildSsiScheduleFromRow(row as Record<string, unknown>);
    if (actor && !ssiAccessService.canReadPlan(plan, actor)) {
      throw new ForbiddenError('You do not have access to this SSI plan');
    }

    return plan;
  }

  async create(actor: SsiActorContext, payload: SchedulePayload) {
    if (!payload.mfgSiteId || !payload.supplierId || !payload.categoryFamily || !payload.scheduledDate) {
      throw new BadRequestError('Site, supplier, category, and scheduled date are required for SSI plans.');
    }

    const mfgSiteId = payload.mfgSiteId;
    const supplierId = payload.supplierId;
    const categoryFamily = payload.categoryFamily;
    const scheduledDate = payload.scheduledDate;

    const now = new Date();
    const id = uuidv4();
    const controlNo = await controlNumberService.buildSsiPlan({
      siteId: mfgSiteId,
      date: scheduledDate,
    });

    await ssiRepository.executeTransaction(async (trx) => {
      await ssiRepository.insertPlan(trx, {
        ssi_plan_id: id,
        control_no: controlNo,
        mfg_site_id: mfgSiteId,
        supplier_id: supplierId,
        category_family: categoryFamily,
        audit_type: payload.auditType || getDefaultAuditType(categoryFamily as SsiCategoryFamily),
        scheduled_date: new Date(scheduledDate),
        sqe_pic_id: payload.sqePicId || actor.userId || '',
        remarks: payload.remarks || null,
        request_status: 'PLANNED',
        linked_record_id: null,
        cancel_remarks: null,
        created_date: now,
        last_update: now,
        updateby: actor.userId || 'SYSTEM',
      });
    });

    return this.getById(id, actor);
  }

  async update(id: string, actor: SsiActorContext, payload: SchedulePayload) {
    const existing = await ssiRepository.findPlanById(id);
    if (!existing) {
      throw new NotFoundError('SSI plan not found');
    }

    if (String(existing.linked_record_id || '')) {
      throw new BadRequestError('Cannot edit an SSI plan after a workflow record has been created from it.');
    }

    await ssiRepository.executeTransaction(async (trx) => {
      await ssiRepository.updatePlan(trx, id, {
        mfg_site_id: payload.mfgSiteId || existing.mfg_site_id,
        supplier_id: payload.supplierId || existing.supplier_id,
        category_family: payload.categoryFamily || existing.category_family,
        audit_type: payload.auditType || existing.audit_type,
        scheduled_date: payload.scheduledDate ? new Date(payload.scheduledDate) : existing.scheduled_date,
        sqe_pic_id: payload.sqePicId || existing.sqe_pic_id,
        remarks: payload.remarks ?? existing.remarks,
        last_update: new Date(),
        updateby: actor.userId || 'SYSTEM',
      });
    });

    return this.getById(id, actor);
  }

  async cancel(id: string, actor: SsiActorContext, payload?: { remarks?: string }) {
    const existing = await ssiRepository.findPlanById(id);
    if (!existing) {
      throw new NotFoundError('SSI plan not found');
    }

    await ssiRepository.executeTransaction(async (trx) => {
      await ssiRepository.updatePlan(trx, id, {
        request_status: 'CANCELLED',
        cancel_remarks: payload?.remarks || null,
        last_update: new Date(),
        updateby: actor.userId || 'SYSTEM',
      });
    });

    return this.getById(id, actor);
  }

  async delete(id: string) {
    const existing = await ssiRepository.findPlanById(id);
    if (!existing) {
      throw new NotFoundError('SSI plan not found');
    }
    if (String(existing.linked_record_id || '')) {
      throw new BadRequestError('Cannot delete an SSI plan after a workflow record has been created from it.');
    }

    await ssiRepository.executeTransaction(async (trx) => {
      await ssiRepository.deletePlan(trx, id);
    });
  }

  async createRecordFromPlan(id: string, actor: SsiActorContext, payload?: Record<string, unknown>) {
    const plan = await this.getById(id, actor);
    const baseRecord = buildEmptyRecord();
    return ssiRecordCommandService.create(
      actor,
      {
        ...baseRecord,
        ...payload,
        scheduleId: plan.id,
        controlNo: plan.controlNo,
        categoryFamily: plan.categoryFamily,
        mfgSiteId: plan.mfgSiteId,
        mfgSiteName: plan.mfgSiteName,
        supplierId: plan.supplierId,
        supplierName: plan.supplierName,
        scheduledDate: plan.scheduledDate,
        sqePicId: plan.sqePicId,
        sqePicName: plan.sqePicName,
        auditType: plan.auditType,
        remarks: String(payload?.remarks || plan.remarks || ''),
      },
      { scheduleId: plan.id, inheritedControlNo: plan.controlNo },
    );
  }
}

export const ssiPlanService = new SsiPlanService();
