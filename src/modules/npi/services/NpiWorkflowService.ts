/**
 * NPI Workflow Service
 * Handles workflow state transitions and approvals
 * Type-safe implementation with no 'any' types
 */

import { NpiRepository } from '../npi.repository.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';
import { mapStatusToDB } from '../../../shared/utils/status-mapper.js';
import { ServiceResponse, WorkflowActionResponse, WorkflowAction, UserRole } from '../types/npi.types.js';

export class NpiWorkflowService {
  constructor(
    private repository: NpiRepository
  ) {}

  /**
   * Submit record for approval (DRAFT → SUBMITTED)
   */
  async submitForApproval(id: string, userId: string): Promise<ServiceResponse<WorkflowActionResponse>> {
    const existing = await this.repository.findByIdDetailed(id);
    if (!existing) {
      throw new NotFoundError('NPI Record not found');
    }

    const currentStatus = existing.record.request_status;
    if (currentStatus !== 'DRAFT' && currentStatus !== 'DR') {
      throw new Error(`Cannot submit: record is in ${currentStatus}, expected DRAFT`);
    }

    const now = new Date();
    const dbStatus = mapStatusToDB('SUBMITTED');

    await this.repository.executeTransaction(async (trx) => {
      await trx.updateTable('NPI_LOTS')
        .set({
          request_status: dbStatus,
          last_update: now,
          updateby: userId
        })
        .where('npi_lot_id', '=', existing.record.npi_lot_id)
        .execute();
    });

    // TODO: Send notification to checker
    // await notificationService.sendWorkflowNotification('submitted', {...});

    return {
      success: true,
      data: { id },
      message: 'Record submitted for approval'
    };
  }

  /**
   * Check record (SUBMITTED → CHECKED)
   */
  async checkRecord(id: string, userId: string, remarks?: string): Promise<ServiceResponse<WorkflowActionResponse>> {
    const existing = await this.repository.findByIdDetailed(id);
    if (!existing) {
      throw new NotFoundError('NPI Record not found');
    }

    const currentStatus = existing.record.request_status;
    if (currentStatus !== 'SUBMITTED' && currentStatus !== 'SU') {
      throw new Error(`Cannot check: record is in ${currentStatus}, expected SUBMITTED`);
    }

    const now = new Date();
    const dbStatus = mapStatusToDB('CHECKED');

    await this.repository.executeTransaction(async (trx) => {
      await trx.updateTable('NPI_LOTS')
        .set({
          request_status: dbStatus,
          checker_id: userId,
          checked_date: now,
          checker_remarks: remarks || null,
          last_update: now,
          updateby: userId
        })
        .where('npi_lot_id', '=', existing.record.npi_lot_id)
        .execute();
    });

    // TODO: Send notification to approver
    // await notificationService.sendWorkflowNotification('checked', {...});

    return {
      success: true,
      data: { id },
      message: 'Record checked successfully'
    };
  }

  /**
   * Approve record (CHECKED → APPROVED)
   */
  async approveRecord(id: string, userId: string, remarks?: string): Promise<ServiceResponse<WorkflowActionResponse>> {
    const existing = await this.repository.findByIdDetailed(id);
    if (!existing) {
      throw new NotFoundError('NPI Record not found');
    }

    const currentStatus = existing.record.request_status;
    if (currentStatus !== 'CHECKED' && currentStatus !== 'CK') {
      throw new Error(`Cannot approve: record is in ${currentStatus}, expected CHECKED`);
    }

    const now = new Date();
    const dbStatus = mapStatusToDB('APPROVED');

    await this.repository.executeTransaction(async (trx) => {
      await trx.updateTable('NPI_LOTS')
        .set({
          request_status: dbStatus,
          approver_id: userId,
          approved_date: now,
          approver_remarks: remarks || null,
          last_update: now,
          updateby: userId
        })
        .where('npi_lot_id', '=', existing.record.npi_lot_id)
        .execute();
    });

    // TODO: Send notification to creator
    // await notificationService.sendWorkflowNotification('approved', {...});

    return {
      success: true,
      data: { id },
      message: 'Record approved successfully'
    };
  }

  /**
   * Reject record (any status → REJECTED → DRAFT)
   */
  async rejectRecord(id: string, userId: string, remarks: string): Promise<ServiceResponse<WorkflowActionResponse>> {
    if (!remarks) {
      throw new Error('Remarks are required for rejection');
    }

    const existing = await this.repository.findByIdDetailed(id);
    if (!existing) {
      throw new NotFoundError('NPI Record not found');
    }

    const now = new Date();
    const dbStatus = mapStatusToDB('DRAFT'); // Return to draft for editing

    await this.repository.executeTransaction(async (trx) => {
      await trx.updateTable('NPI_LOTS')
        .set({
          request_status: dbStatus,
          approver_remarks: remarks,
          last_update: now,
          updateby: userId
        })
        .where('npi_lot_id', '=', existing.record.npi_lot_id)
        .execute();
    });

    // TODO: Send notification to creator
    // await notificationService.sendWorkflowNotification('rejected', {...});

    return {
      success: true,
      data: { id },
      message: 'Record rejected and returned to draft'
    };
  }

  /**
   * Get available workflow actions for current status
   */
  getAvailableActions(currentStatus: string, userRole: UserRole): WorkflowAction[] {
    const actions: WorkflowAction[] = [];

    switch (currentStatus) {
      case 'DRAFT':
      case 'DR':
        actions.push('submit');
        break;
      case 'SUBMITTED':
      case 'SU':
        if (userRole === 'checker' || userRole === 'admin') {
          actions.push('check', 'reject');
        }
        break;
      case 'CHECKED':
      case 'CK':
        if (userRole === 'approver' || userRole === 'admin') {
          actions.push('approve', 'reject');
        }
        break;
      case 'APPROVED':
      case 'AP':
        // No further actions (terminal state for NPI)
        break;
    }

    return actions;
  }
}
    const existing = await this.repository.findByIdDetailed(id);
    if (!existing) {
      throw new NotFoundError('NPI Record not found');
    }

    const currentStatus = existing.record.request_status;
    if (currentStatus !== 'DRAFT' && currentStatus !== 'DR') {
      throw new Error(`Cannot submit: record is in ${currentStatus}, expected DRAFT`);
    }

    const now = new Date();
    const dbStatus = mapStatusToDB('SUBMITTED');

    await this.repository.executeTransaction(async (trx) => {
      await trx.updateTable('NPI_LOTS')
        .set({
          request_status: dbStatus,
          last_update: now,
          updateby: userId
        })
        .where('npi_lot_id', '=', existing.record.npi_lot_id)
        .execute();
    });

    // TODO: Send notification to checker
    // await notificationService.sendWorkflowNotification('submitted', {...});

    return {
      success: true,
      data: { id },
      message: 'Record submitted for approval'
    };
  }

  /**
   * Check record (SUBMITTED → CHECKED)
   */
  async checkRecord(id: string, userId: string, remarks?: string): Promise<any> {
    const existing = await this.repository.findByIdDetailed(id);
    if (!existing) {
      throw new NotFoundError('NPI Record not found');
    }

    const currentStatus = existing.record.request_status;
    if (currentStatus !== 'SUBMITTED' && currentStatus !== 'SU') {
      throw new Error(`Cannot check: record is in ${currentStatus}, expected SUBMITTED`);
    }

    const now = new Date();
    const dbStatus = mapStatusToDB('CHECKED');

    await this.repository.executeTransaction(async (trx) => {
      await trx.updateTable('NPI_LOTS')
        .set({
          request_status: dbStatus,
          checker_id: userId,
          checker_date: now,
          checker_remarks: remarks || null,
          last_update: now,
          updateby: userId
        })
        .where('npi_lot_id', '=', existing.record.npi_lot_id)
        .execute();
    });

    // TODO: Send notification to approver
    // await notificationService.sendWorkflowNotification('checked', {...});

    return {
      success: true,
      data: { id },
      message: 'Record checked successfully'
    };
  }

  /**
   * Approve record (CHECKED → APPROVED)
   */
  async approveRecord(id: string, userId: string, remarks?: string): Promise<any> {
    const existing = await this.repository.findByIdDetailed(id);
    if (!existing) {
      throw new NotFoundError('NPI Record not found');
    }

    const currentStatus = existing.record.request_status;
    if (currentStatus !== 'CHECKED' && currentStatus !== 'CK') {
      throw new Error(`Cannot approve: record is in ${currentStatus}, expected CHECKED`);
    }

    const now = new Date();
    const dbStatus = mapStatusToDB('APPROVED');

    await this.repository.executeTransaction(async (trx) => {
      await trx.updateTable('NPI_LOTS')
        .set({
          request_status: dbStatus,
          approver_id: userId,
          approver_date: now,
          approver_remarks: remarks || null,
          last_update: now,
          updateby: userId
        })
        .where('npi_lot_id', '=', existing.record.npi_lot_id)
        .execute();
    });

    // TODO: Send notification to creator
    // await notificationService.sendWorkflowNotification('approved', {...});

    return {
      success: true,
      data: { id },
      message: 'Record approved successfully'
    };
  }

  /**
   * Reject record (any status → REJECTED → DRAFT)
   */
  async rejectRecord(id: string, userId: string, remarks: string): Promise<any> {
    if (!remarks) {
      throw new Error('Remarks are required for rejection');
    }

    const existing = await this.repository.findByIdDetailed(id);
    if (!existing) {
      throw new NotFoundError('NPI Record not found');
    }

    const now = new Date();
    const dbStatus = mapStatusToDB('DRAFT'); // Return to draft for editing

    await this.repository.executeTransaction(async (trx) => {
      await trx.updateTable('NPI_LOTS')
        .set({
          request_status: dbStatus,
          approver_remarks: remarks,
          last_update: now,
          updateby: userId
        })
        .where('npi_lot_id', '=', existing.record.npi_lot_id)
        .execute();
    });

    // TODO: Send notification to creator
    // await notificationService.sendWorkflowNotification('rejected', {...});

    return {
      success: true,
      data: { id },
      message: 'Record rejected and returned to draft'
    };
  }

  /**
   * Get available workflow actions for current status
   */
  getAvailableActions(currentStatus: string, userRole: string): string[] {
    const actions: string[] = [];

    switch (currentStatus) {
      case 'DRAFT':
      case 'DR':
        actions.push('submit');
        break;
      case 'SUBMITTED':
      case 'SU':
        if (userRole === 'checker' || userRole === 'admin') {
          actions.push('check', 'reject');
        }
        break;
      case 'CHECKED':
      case 'CK':
        if (userRole === 'approver' || userRole === 'admin') {
          actions.push('approve', 'reject');
        }
        break;
      case 'APPROVED':
      case 'AP':
        // No further actions (terminal state for NPI)
        break;
    }

    return actions;
  }
}
