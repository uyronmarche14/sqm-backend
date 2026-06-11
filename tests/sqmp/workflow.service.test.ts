import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenError } from '../../src/shared/errors/AppError';

const repositoryMock = vi.hoisted(() => ({
  findByIdDetailed: vi.fn(),
  findLatestResponse: vi.fn(),
  findSupplierIdsByUserId: vi.fn(),
  executeTransaction: vi.fn(),
}));

const userRepositoryMock = vi.hoisted(() => ({
  findRoleById: vi.fn(),
  findById: vi.fn(),
}));

const responseServiceMock = vi.hoisted(() => ({
  saveSupplierResponseContent: vi.fn(),
  saveClosureContent: vi.fn(),
}));

vi.mock('../../src/modules/sqmp/sqmp.repository.js', () => ({
  sqmpRepository: repositoryMock,
}));

vi.mock('../../src/modules/users/user.repository.js', () => ({
  userRepository: userRepositoryMock,
}));

vi.mock('../../src/modules/sqmp/response/response.service.js', () => ({
  sqmpResponseService: responseServiceMock,
}));

import { SqmpWorkflowService } from '../../src/modules/sqmp/workflow/workflow.service';

const makeTransactionHarness = () => {
  const sqmpSet = vi.fn(() => ({
    where: vi.fn(() => ({
      execute: vi.fn().mockResolvedValue(undefined),
    })),
  }));
  const responseSet = vi.fn(() => ({
    where: vi.fn(() => ({
      execute: vi.fn().mockResolvedValue(undefined),
    })),
  }));
  const insertValues = vi.fn(() => ({
    execute: vi.fn().mockResolvedValue(undefined),
  }));
  const trx = {
    updateTable: vi.fn((table: string) => ({
      set: table === 'SQMP' ? sqmpSet : responseSet,
    })),
    insertInto: vi.fn(() => ({
      values: insertValues,
    })),
  };

  return { trx, sqmpSet, responseSet, insertValues };
};

const rejectedCycle2Record = {
  record: {
    sqmp_id: 'sqmp-1',
    request_status: '21',
    supplier_id: 'supplier-1',
    issuer_id: 'issuer-1',
    issuer_name: 'Issuer One',
    checker_id: 'checker-1',
    approver_id: 'approver-1',
    site_id: 'SITE-1',
  },
  responses: [
    {
      sqmp_response_id: 'response-1',
      checker_id: 'closure-checker-1',
      approver_id: 'closure-approver-1',
    },
  ],
};

describe('SqmpWorkflowService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userRepositoryMock.findById.mockResolvedValue({ site_id: 'SITE-1' });
  });

  it('allows issuer closure resubmission from stage 21 back to checker 2nd', async () => {
    const tx = makeTransactionHarness();
    repositoryMock.findByIdDetailed.mockResolvedValue(rejectedCycle2Record);
    repositoryMock.findLatestResponse.mockResolvedValue(rejectedCycle2Record.responses[0]);
    repositoryMock.executeTransaction.mockImplementation(async (callback: (trx: unknown) => Promise<void>) => callback(tx.trx));
    userRepositoryMock.findRoleById.mockResolvedValue({ role_name: 'USER' });
    responseServiceMock.saveClosureContent.mockResolvedValue({ success: true });

    const service = new SqmpWorkflowService();

    await service.submitClosure(
      'sqmp-1',
      { issuer_remarks: 'reworked closure package' } as any,
      'issuer-1',
      'role-1',
      [],
    );

    expect(responseServiceMock.saveClosureContent).toHaveBeenCalledWith(
      'sqmp-1',
      { issuer_remarks: 'reworked closure package' },
      'issuer-1',
      'role-1',
      [],
    );
    expect(tx.sqmpSet).toHaveBeenCalledWith(expect.objectContaining({ request_status: '16' }));
    expect(tx.responseSet).toHaveBeenCalledWith(expect.objectContaining({ issuer_remarks: 'reworked closure package' }));
    expect(tx.insertValues).toHaveBeenCalledWith(expect.objectContaining({ request_status: '16' }));
  });

  it('forbids supplier response saves at stage 21 because it is issuer-side rework', async () => {
    repositoryMock.findByIdDetailed.mockResolvedValue(rejectedCycle2Record);
    repositoryMock.findSupplierIdsByUserId.mockResolvedValue(['supplier-1']);
    userRepositoryMock.findRoleById.mockResolvedValue({ role_name: 'SUPPLIER' });

    const service = new SqmpWorkflowService();

    await expect(
      service.saveResponse('sqmp-1', {} as any, 'supplier-user-1', 'supplier-role', []),
    ).rejects.toThrow(ForbiddenError);

    expect(responseServiceMock.saveSupplierResponseContent).not.toHaveBeenCalled();
  });
});
