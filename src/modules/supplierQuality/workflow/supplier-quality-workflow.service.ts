import { ForbiddenError, NotFoundError } from '../../../shared/errors/AppError.js';
import { successResponse } from '../../../shared/utils/api-response.js';
import { controlNumberService } from '../../../shared/services/control-number.service.js';
import { supplierQualityRepository } from '../supplier-quality.repository.js';
import { supplierQualityRecordQueryService } from '../services/supplier-quality-record-query.service.js';
import { supplierQualityAccessService } from '../services/supplier-quality-access.service.js';
import { normalizeSupplierQualityWorkflowStage } from './supplier-quality-workflow.js';

type WorkflowActor = {
  userId: string;
  roleId?: string | null;
  roleName?: string | null;
  remarks?: string;
};

export class SupplierQualityWorkflowService {
  async submit(id: string, actor: WorkflowActor) {
    const existing = await supplierQualityRepository.findHeaderById(id);
    if (!existing) {
      throw new NotFoundError('Supplier Quality record not found');
    }

    const stage = normalizeSupplierQualityWorkflowStage(existing.request_status, existing);
    if (!['DRAFT', 'REJECT_CHECKER', 'REJECT_APPROVER'].includes(stage)) {
      throw new ForbiddenError('Only draft or rejected Supplier Quality records can be submitted.');
    }

    await supplierQualityAccessService.assertActionAccess(
      existing,
      actor,
      'submit',
      'SQPRLAR-01-01',
      'Only the assigned issuer can submit this Supplier Quality record.',
    );

    const now = new Date();
    await supplierQualityRepository.executeTransaction(async (trx) => {
      await supplierQualityRepository.updateRecord(trx, existing.sqpr_lar_id, {
        control_no: controlNumberService.finalizeSupplierQuality(existing.control_no),
        submit_date: now,
        incharge_remarks: actor.remarks ?? existing.incharge_remarks,
        request_status: '3',
        last_update: now,
        updateby: actor.userId,
      });
    });

    const record = await supplierQualityRecordQueryService.getById(existing.sqpr_lar_id, {
      userId: actor.userId,
      roleName: actor.roleName || null,
    });
    return successResponse(record);
  }

  async check(id: string, actor: WorkflowActor) {
    const existing = await supplierQualityRepository.findHeaderById(id);
    if (!existing) {
      throw new NotFoundError('Supplier Quality record not found');
    }

    const stage = normalizeSupplierQualityWorkflowStage(existing.request_status, existing);
    if (stage !== 'CHECKER') {
      throw new ForbiddenError('Only records awaiting check can be checked.');
    }

    await supplierQualityAccessService.assertActionAccess(
      existing,
      actor,
      'check',
      'SQPRLAR-01-02',
      'Only the assigned checker can check this Supplier Quality record.',
    );

    const now = new Date();
    await supplierQualityRepository.executeTransaction(async (trx) => {
      await supplierQualityRepository.updateRecord(trx, existing.sqpr_lar_id, {
        checker_remarks: actor.remarks ?? existing.checker_remarks,
        checker_date: now,
        request_status: '4',
        last_update: now,
        updateby: actor.userId,
      });
    });

    const record = await supplierQualityRecordQueryService.getById(existing.sqpr_lar_id, {
      userId: actor.userId,
      roleName: actor.roleName || null,
    });
    return successResponse(record);
  }

  async approve(id: string, actor: WorkflowActor) {
    const existing = await supplierQualityRepository.findHeaderById(id);
    if (!existing) {
      throw new NotFoundError('Supplier Quality record not found');
    }

    const stage = normalizeSupplierQualityWorkflowStage(existing.request_status, existing);
    if (stage !== 'APPROVER') {
      throw new ForbiddenError('Only records awaiting approval can be approved.');
    }

    await supplierQualityAccessService.assertActionAccess(
      existing,
      actor,
      'approve',
      'SQPRLAR-01-02',
      'Only the assigned approver can approve this Supplier Quality record.',
    );

    const now = new Date();
    await supplierQualityRepository.executeTransaction(async (trx) => {
      await supplierQualityRepository.updateRecord(trx, existing.sqpr_lar_id, {
        approver_remarks: actor.remarks ?? existing.approver_remarks,
        approver_date: now,
        request_status: '10',
        last_update: now,
        updateby: actor.userId,
      });
    });

    const record = await supplierQualityRecordQueryService.getById(existing.sqpr_lar_id, {
      userId: actor.userId,
      roleName: actor.roleName || null,
    });
    return successResponse(record);
  }

  async reject(id: string, actor: WorkflowActor) {
    const existing = await supplierQualityRepository.findHeaderById(id);
    if (!existing) {
      throw new NotFoundError('Supplier Quality record not found');
    }

    const stage = normalizeSupplierQualityWorkflowStage(existing.request_status, existing);
    const now = new Date();

    if (stage === 'CHECKER') {
      await supplierQualityAccessService.assertActionAccess(
        existing,
        actor,
        'reject',
        'SQPRLAR-01-02',
        'Only the assigned checker can reject this Supplier Quality record.',
      );

      await supplierQualityRepository.executeTransaction(async (trx) => {
        await supplierQualityRepository.updateRecord(trx, existing.sqpr_lar_id, {
          checker_remarks: actor.remarks ?? existing.checker_remarks,
          request_status: '5',
          last_update: now,
          updateby: actor.userId,
        });
      });
    } else if (stage === 'APPROVER') {
      await supplierQualityAccessService.assertActionAccess(
        existing,
        actor,
        'reject',
        'SQPRLAR-01-02',
        'Only the assigned approver can reject this Supplier Quality record.',
      );

      await supplierQualityRepository.executeTransaction(async (trx) => {
        await supplierQualityRepository.updateRecord(trx, existing.sqpr_lar_id, {
          approver_remarks: actor.remarks ?? existing.approver_remarks,
          request_status: '6',
          last_update: now,
          updateby: actor.userId,
        });
      });
    } else {
      throw new ForbiddenError('Only records awaiting check or approval can be rejected.');
    }

    const record = await supplierQualityRecordQueryService.getById(existing.sqpr_lar_id, {
      userId: actor.userId,
      roleName: actor.roleName || null,
    });
    return successResponse(record);
  }

  async issue(id: string, actor: WorkflowActor) {
    const existing = await supplierQualityRepository.findHeaderById(id);
    if (!existing) {
      throw new NotFoundError('Supplier Quality record not found');
    }

    const stage = normalizeSupplierQualityWorkflowStage(existing.request_status, existing);
    if (stage !== 'ISSUER') {
      throw new ForbiddenError('Only approved Supplier Quality records can be issued.');
    }

    await supplierQualityAccessService.assertActionAccess(
      existing,
      actor,
      'issue',
      'SQPRLAR-01-05',
      'Only the assigned issuer can issue this Supplier Quality record.',
    );

    const now = new Date();
    await supplierQualityRepository.executeTransaction(async (trx) => {
      await supplierQualityRepository.updateRecord(trx, existing.sqpr_lar_id, {
        request_status: '1',
        last_update: now,
        updateby: actor.userId,
      });
    });

    const record = await supplierQualityRecordQueryService.getById(existing.sqpr_lar_id, {
      userId: actor.userId,
      roleName: actor.roleName || null,
    });
    return successResponse(record);
  }
}

export const supplierQualityWorkflowService = new SupplierQualityWorkflowService();
