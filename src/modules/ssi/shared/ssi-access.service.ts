import { isAdminRole } from '../../../shared/utils/admin.utils.js';
import { ssiRepository } from '../ssi.repository.js';
import { computeSsiAvailableActions } from '../workflow/ssi-workflow.js';
import type { SsiActorContext, SsiRecord, SsiSchedule } from '../types/ssi.types.js';

export class SsiAccessService {
  async resolveActorContext(userId?: string | null, roleId?: string | null): Promise<SsiActorContext> {
    if (!userId) {
      return { userId: null, roleId: roleId || null, roleName: null, supplierIds: [] };
    }

    const [supplierIds, roleName] = await Promise.all([
      ssiRepository.findSupplierIdsByUserId(userId),
      ssiRepository.findActorRoleName(userId),
    ]);

    return {
      userId,
      roleId: roleId || null,
      roleName,
      supplierIds,
    };
  }

  isAdmin(actor: SsiActorContext) {
    return isAdminRole(actor.roleName);
  }

  canReadRecord(record: SsiRecord, actor: SsiActorContext) {
    if (this.isAdmin(actor)) {
      return true;
    }

    if (!actor.userId) {
      return false;
    }

    if (
      record.createdBy === actor.userId ||
      record.sqePicId === actor.userId ||
      record.approvers.some((entry) => entry.userId === actor.userId) ||
      record.ccList.some((entry) => entry.userId === actor.userId) ||
      actor.supplierIds.includes(record.supplierId)
    ) {
      return true;
    }

    return computeSsiAvailableActions(record, actor).length > 0;
  }

  canReadPlan(plan: SsiSchedule, actor: SsiActorContext) {
    if (this.isAdmin(actor)) {
      return true;
    }

    if (!actor.userId) {
      return false;
    }

    return Boolean(
      plan.sqePicId === actor.userId ||
        actor.supplierIds.includes(plan.supplierId),
    );
  }

  filterReadablePlans(plans: SsiSchedule[], actor: SsiActorContext) {
    if (this.isAdmin(actor)) {
      return plans;
    }

    return plans.filter((plan) => this.canReadPlan(plan, actor));
  }

  filterReadableRecords(records: SsiRecord[], actor: SsiActorContext, scope: 'assigned' | 'history' | 'mine' = 'history') {
    if (this.isAdmin(actor)) {
      return records;
    }

    return records.filter((record) => {
      const availableActions = computeSsiAvailableActions(record, actor);

      if (scope === 'assigned') {
        return availableActions.length > 0;
      }

      if (scope === 'mine') {
        return Boolean(
          actor.userId &&
            (record.createdBy === actor.userId ||
              record.sqePicId === actor.userId ||
              record.approvers.some((entry) => entry.userId === actor.userId)),
        );
      }

      return this.canReadRecord(record, actor);
    });
  }
}

export const ssiAccessService = new SsiAccessService();
