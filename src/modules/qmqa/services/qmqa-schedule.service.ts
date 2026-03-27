import { v4 as uuidv4 } from 'uuid';
import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/AppError.js';
import { controlNumberService } from '../../../shared/services/control-number.service.js';
import { mapStatusFromDB } from '../../../shared/utils/status-mapper.js';
import { qmqaRepository } from '../qmqa.repository.js';
import { QMQAScheduleCreationInput, QMQAScheduleUpdateInput } from '../qmqa.schema.js';
import { getQmqaCompatibilityStatus } from '../workflow/qmqa-workflow.utils.js';

const QMQA_DUPLICATE_KEY_NUMBERS = new Set([2601, 2627]);
const QMQA_ACTIVE_SCHEDULE_DB_STATUSES = new Set(['PL', 'CO']);
const QMQA_CANCELLED_SCHEDULE_DB_STATUSES = new Set(['CA', 'CC']);

export class QmqaScheduleService {
  private isLinkedSchedule(schedule: Record<string, any> | null | undefined) {
    return Boolean(schedule?.record_id);
  }

  private assertScheduleEditable(
    schedule: Record<string, any>,
    action: 'update' | 'delete' | 'cancel',
  ) {
    const status = String(schedule?.request_status || '').trim().toUpperCase();

    if (this.isLinkedSchedule(schedule)) {
      throw new BadRequestError(`Cannot ${action} a QMQA schedule after the audit report has been created.`);
    }

    if (QMQA_CANCELLED_SCHEDULE_DB_STATUSES.has(status)) {
      throw new BadRequestError(`Cannot ${action} a cancelled QMQA schedule.`);
    }

    if (!QMQA_ACTIVE_SCHEDULE_DB_STATUSES.has(status)) {
      throw new BadRequestError(`Cannot ${action} QMQA schedule while it is outside the planned phase.`);
    }
  }

  private assertScheduleControlNoInputs(payload: Pick<QMQAScheduleCreationInput, 'site_id' | 'audit_category_id' | 'audit_plan_date'>) {
    if (!payload.site_id) {
      throw new BadRequestError('Site is required before creating a QMQA schedule.');
    }

    if (!payload.audit_category_id) {
      throw new BadRequestError('Audit category is required before creating a QMQA schedule.');
    }

    if (!payload.audit_plan_date) {
      throw new BadRequestError('Audit plan date is required before creating a QMQA schedule.');
    }
  }

  private getDbErrorNumber(error: unknown): number | undefined {
    const candidates = [
      (error as any)?.number,
      (error as any)?.code,
      (error as any)?.originalError?.info?.number,
      (error as any)?.originalError?.number,
      (error as any)?.cause?.number,
    ];

    for (const candidate of candidates) {
      const parsed = Number(candidate);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private isDuplicateControlNoError(error: unknown): boolean {
    const message = String((error as any)?.message || '');
    const errorNumber = this.getDbErrorNumber(error);

    return (
      (errorNumber !== undefined && QMQA_DUPLICATE_KEY_NUMBERS.has(errorNumber)) ||
      (message.includes('UNIQUE KEY constraint') && message.includes('duplicate key value'))
    );
  }

  async generateControlNo(year: number, isSchedule = false): Promise<string> {
    const date = new Date(`${year}-01-01T00:00:00.000Z`);
    return controlNumberService.buildQmqaAuditPlan({
      auditCategoryCode: isSchedule ? 'PLAN' : 'AUDIT',
      siteCode: 'SITE',
      auditPlanDate: date,
    });
  }

  async getAllSchedules() {
    const schedules = await qmqaRepository.findAllSchedules();
    return schedules.map((schedule: any) => ({
      ...schedule,
      status: mapStatusFromDB(schedule.request_status),
      recordId: schedule.record_id || null,
      recordStatus: schedule.record_status ? getQmqaCompatibilityStatus(schedule.record_status) : null,
      created_at: schedule.created_date,
      updated_at: schedule.last_update,
    }));
  }

  async getScheduleById(id: string) {
    const schedule = await qmqaRepository.findScheduleById(id);
    if (!schedule) {
      throw new NotFoundError('Schedule not found');
    }

    return {
      ...schedule,
      status: mapStatusFromDB(schedule.request_status),
      recordId: schedule.record_id || null,
      recordStatus: schedule.record_status ? getQmqaCompatibilityStatus(schedule.record_status) : null,
      created_at: schedule.created_date,
      updated_at: schedule.last_update,
    };
  }

  async createSchedule(payload: QMQAScheduleCreationInput, userId: string) {
    const id = uuidv4();
    const now = new Date();
    const effectiveUserId = userId || 'SYSTEM';
    this.assertScheduleControlNoInputs(payload);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await qmqaRepository.executeTransaction(async (trx) => {
          const controlNo = await controlNumberService.buildQmqaAuditPlan(
            {
              siteId: payload.site_id,
              auditCategoryId: payload.audit_category_id,
              auditPlanDate: payload.audit_plan_date,
            },
            trx,
          );

          await trx.insertInto('QMQA_AUDIT_PLAN').values({
            qmqa_audit_plan_id: id,
            control_no: controlNo,
            created_date: now,
            site_id: payload.site_id,
            supplier_id: payload.supplier_id,
            audit_category_id: payload.audit_category_id,
            audit_plan_date: payload.audit_plan_date,
            sqe_pic_id: payload.sqe_pic_id,
            remarks: payload.remarks || null,
            request_status: 'PL',
            last_update: now,
            updateby: effectiveUserId,
          }).execute();

          return {
            success: true,
            id,
            controlNo,
            controlNoState: controlNumberService.getControlNoState(controlNo),
            message: 'Schedule created',
          };
        });
      } catch (error) {
        if (!this.isDuplicateControlNoError(error) || attempt === 2) {
          throw error;
        }
      }
    }

    throw new ConflictError('Unable to generate a unique QMQA schedule control number.');
  }

  async updateSchedule(id: string, payload: QMQAScheduleUpdateInput, userId: string) {
    const existing = await qmqaRepository.findScheduleById(id);
    if (!existing) {
      throw new NotFoundError('Schedule not found');
    }
    this.assertScheduleEditable(existing, 'update');

    const dbUpdates: Record<string, any> = {
      last_update: new Date(),
      updateby: userId || 'SYSTEM',
    };

    if (payload.site_id) dbUpdates.site_id = payload.site_id;
    if (payload.supplier_id) dbUpdates.supplier_id = payload.supplier_id;
    if (payload.audit_category_id) dbUpdates.audit_category_id = payload.audit_category_id;
    if (payload.audit_plan_date) dbUpdates.audit_plan_date = payload.audit_plan_date;
    if (payload.sqe_pic_id) dbUpdates.sqe_pic_id = payload.sqe_pic_id;
    if (payload.remarks !== undefined) dbUpdates.remarks = payload.remarks;

    return qmqaRepository.executeTransaction(async (trx) => {
      await trx.updateTable('QMQA_AUDIT_PLAN')
        .set(dbUpdates)
        .where('qmqa_audit_plan_id', '=', id)
        .execute();

      return { success: true, message: 'Schedule updated' };
    });
  }

  async deleteSchedule(id: string) {
    const existing = await qmqaRepository.findScheduleById(id);
    if (!existing) {
      throw new NotFoundError('Schedule not found');
    }
    this.assertScheduleEditable(existing, 'delete');

    return qmqaRepository.executeTransaction(async (trx) => {
      await trx.deleteFrom('QMQA_AUDIT_PLAN')
        .where('qmqa_audit_plan_id', '=', id)
        .execute();

      return { success: true, message: 'Schedule deleted successfully' };
    });
  }

  async deleteSchedules(ids: string[]) {
    const settled = await Promise.allSettled(
      ids.map(async (id) => {
        await this.deleteSchedule(id);
        return id;
      }),
    );

    const deletedIds: string[] = [];
    const failed: Array<{ id: string; message: string }> = [];

    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        deletedIds.push(result.value);
        return;
      }

      failed.push({
        id: ids[index] || '',
        message: result.reason instanceof Error ? result.reason.message : 'Delete failed',
      });
    });

    return {
      success: failed.length === 0,
      count: deletedIds.length,
      deletedIds,
      failed,
    };
  }

  async cancelSchedule(id: string, userId: string) {
    const existing = await qmqaRepository.findScheduleById(id);
    if (!existing) {
      throw new NotFoundError('Schedule not found');
    }
    this.assertScheduleEditable(existing, 'cancel');

    return qmqaRepository.executeTransaction(async (trx) => {
      await trx.updateTable('QMQA_AUDIT_PLAN')
        .set({
          request_status: 'CA',
          last_update: new Date(),
          updateby: userId || 'SYSTEM',
        })
        .where('qmqa_audit_plan_id', '=', id)
        .execute();

      return { success: true, message: 'Schedule cancelled successfully' };
    });
  }
}

export const qmqaScheduleService = new QmqaScheduleService();
