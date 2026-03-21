import { beforeEach, describe, expect, it, vi } from 'vitest';

const saveResponseContentMock = vi.hoisted(() => vi.fn());
const controlNumberServiceMock = vi.hoisted(() => ({
  finalizeMnr: vi.fn(),
  getControlNoState: vi.fn(),
}));

vi.mock('../../src/modules/mnr/mnr.service.js', () => ({
  mnrService: {
    saveResponseContent: saveResponseContentMock,
  },
}));

vi.mock('../../src/shared/services/control-number.service.js', () => ({
  controlNumberService: controlNumberServiceMock,
}));

import { MnrWorkflowService } from '../../src/modules/mnr/workflow/mnr-workflow.service.js';

function createTransactionMock() {
  const execute = vi.fn().mockResolvedValue(undefined);
  const where = vi.fn(() => ({ execute }));
  const set = vi.fn(() => ({ where }));
  const updateTable = vi.fn(() => ({ set }));

  return {
    trx: { updateTable },
    updateTable,
    set,
  };
}

function createRecord(overrides: Record<string, unknown> = {}) {
  return {
    mnr_id: 'mnr-1',
    control_no: 'DRF-2026-3-1-SITE',
    request_status: 'DR',
    site_id: 'site-1',
    site_code: 'SITE',
    defectcategory_id: 'defect-cat-1',
    defectcategory_acronym: 'MNR',
    encoder_id: 'encoder-1',
    issuer_id: 'issuer-1',
    checker_id: 'checker-1',
    approver_id: 'approver-1',
    ...overrides,
  };
}

describe('MnrWorkflowService', () => {
  const repository = {
    findByIdDetailed: vi.fn(),
    executeTransaction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    controlNumberServiceMock.finalizeMnr.mockResolvedValue('MNR-2026-3-1-SITE');
    controlNumberServiceMock.getControlNoState.mockReturnValue('final');
    saveResponseContentMock.mockResolvedValue({
      success: true,
      data: { id: 'mnr-1' },
      message: 'saved',
    });
  });

  it('submits draft records to checker stage through the workflow layer', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({ record: createRecord() });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new MnrWorkflowService(repository as any);
    const result = await service.submitMain('mnr-1', 'issuer-1', undefined, 'submit');

    expect(tx.updateTable).toHaveBeenCalledWith('MNR_LOTS');
    expect(tx.set).toHaveBeenCalledWith(
      expect.objectContaining({
        control_no: 'MNR-2026-3-1-SITE',
        request_status: 'SU',
        issuer_remarks: 'submit',
        updateby: 'issuer-1',
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      id: 'mnr-1',
      recordId: 'mnr-1',
      status: 'SU',
      controlNo: 'MNR-2026-3-1-SITE',
      controlNoState: 'final',
      workflowStageCode: '3',
    }));
  });

  it('moves checker-owned records to approver stage', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'SU' }),
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new MnrWorkflowService(repository as any);
    const result = await service.checkMain('mnr-1', 'checker-1', undefined, 'checked');

    expect(tx.set).toHaveBeenCalledWith(
      expect.objectContaining({
        request_status: 'CK',
        checker_remarks: 'checked',
        updateby: 'checker-1',
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      id: 'mnr-1',
      recordId: 'mnr-1',
      status: 'CK',
      controlNo: 'DRF-2026-3-1-SITE',
      controlNoState: 'final',
      workflowStageCode: '4',
    }));
  });

  it('blocks submit when the site or defect category required for final numbering is missing', async () => {
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ site_id: null, site_code: null }),
    });

    const service = new MnrWorkflowService(repository as any);

    await expect(service.submitMain('mnr-1', 'issuer-1')).rejects.toMatchObject({
      message: 'Site is required before submitting this MNR.',
    });
  });

  it('rejects check attempts from non-assigned actors', async () => {
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'SU' }),
    });

    const service = new MnrWorkflowService(repository as any);
    await expect(service.checkMain('mnr-1', 'someone-else')).rejects.toMatchObject({
      message: 'Only the assigned checker can check this MNR.',
    });
  });

  it('moves approver-owned records to issuer stage', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'CK' }),
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new MnrWorkflowService(repository as any);
    const result = await service.approveMain('mnr-1', 'approver-1', undefined, 'approved');

    expect(tx.set).toHaveBeenCalledWith(
      expect.objectContaining({
        request_status: 'AP',
        approver_remarks: 'approved',
        updateby: 'approver-1',
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      id: 'mnr-1',
      recordId: 'mnr-1',
      status: 'AP',
      controlNo: 'DRF-2026-3-1-SITE',
      controlNoState: 'final',
      workflowStageCode: '10',
    }));
  });

  it('moves issuer-owned approved records to supplier stage', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'AP' }),
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new MnrWorkflowService(repository as any);
    const result = await service.issueMain('mnr-1', 'issuer-1', undefined, 'issued');

    expect(tx.set).toHaveBeenCalledWith(
      expect.objectContaining({
        request_status: 'IS',
        issuer_remarks: 'issued',
        updateby: 'issuer-1',
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      id: 'mnr-1',
      recordId: 'mnr-1',
      status: 'IS',
      controlNo: 'DRF-2026-3-1-SITE',
      controlNoState: 'final',
      workflowStageCode: '11',
    }));
  });

  it('closes issued records without 8D requirement through the explicit close path', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'IS', report_issuance_8d: 0 }),
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new MnrWorkflowService(repository as any);
    const result = await service.close('mnr-1', 'issuer-1', undefined, 'closed');

    expect(tx.set).toHaveBeenCalledWith(
      expect.objectContaining({
        request_status: 'CL',
        remarks: 'closed',
        updateby: 'issuer-1',
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      id: 'mnr-1',
      status: 'CL',
      workflowStageCode: '1',
    }));
  });

  it('keeps supplier save at stage 11 while persisting response content separately', async () => {
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'IS', attention_id: 'supplier-attn-1' }),
    });

    const service = new MnrWorkflowService(repository as any);
    const result = await service.saveInitialResponse('mnr-1', 'supplier-attn-1', undefined, { d1: 'team' });

    expect(saveResponseContentMock).toHaveBeenCalledWith('mnr-1', { d1: 'team' }, {
      userId: 'supplier-attn-1',
      supplierId: undefined,
    });
    expect(result.data).toEqual(expect.objectContaining({
      id: 'mnr-1',
      status: 'IS',
      workflowStageCode: '11',
    }));
  });

  it('submits supplier initial response from stage 11 into stage 13', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'IS', attention_id: 'supplier-attn-1' }),
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new MnrWorkflowService(repository as any);
    const result = await service.submitInitialResponse('mnr-1', 'supplier-attn-1', { d1: 'team' });

    expect(saveResponseContentMock).toHaveBeenCalledWith('mnr-1', { d1: 'team' }, {
      userId: 'supplier-attn-1',
      supplierId: undefined,
    });
    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      request_status: 'IR',
      updateby: 'supplier-attn-1',
    }));
    expect(result.data).toEqual(expect.objectContaining({
      status: 'IR',
      workflowStageCode: '13',
    }));
  });

  it('moves issuer response review from final response into issuer 2nd on save', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'FR' }),
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new MnrWorkflowService(repository as any);
    const result = await service.saveResponseReview('mnr-1', 'issuer-1', {
      cycle2CheckerId: 'checker-2',
      cycle2ApproverId: 'approver-2',
    });

    expect(saveResponseContentMock).toHaveBeenCalledWith('mnr-1', {
      cycle2CheckerId: 'checker-2',
      cycle2ApproverId: 'approver-2',
    }, {
      userId: 'issuer-1',
    });
    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      request_status: 'RW',
      updateby: 'issuer-1',
    }));
    expect(result.data).toEqual(expect.objectContaining({
      status: 'RW',
      workflowStageCode: '15',
    }));
  });

  it('submits issuer response review into cycle 2 checker stage', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'RW' }),
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new MnrWorkflowService(repository as any);
    const result = await service.submitResponseReview('mnr-1', 'issuer-1', {
      cycle2CheckerId: 'checker-2',
      cycle2ApproverId: 'approver-2',
    });

    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({
      request_status: 'RC',
      updateby: 'issuer-1',
    }));
    expect(result.data).toEqual(expect.objectContaining({
      status: 'RC',
      workflowStageCode: '16',
      nextApproverId: 'checker-2',
    }));
  });

  it('moves cycle 2 checker-owned records into cycle 2 approver stage', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'RC' }),
      response: {
        checker_id: 'checker-2',
        checker_name: 'Checker Two',
        approver_id: 'approver-2',
        approver_name: 'Approver Two',
      },
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new MnrWorkflowService(repository as any);
    const result = await service.checkResponse('mnr-1', 'checker-2', 'cycle2 checked');

    expect(tx.set).toHaveBeenCalledWith(
      expect.objectContaining({
        request_status: 'RA',
        updateby: 'checker-2',
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'RA',
      workflowStageCode: '17',
      nextApproverId: 'approver-2',
      nextApproverName: 'Approver Two',
    }));
  });

  it('moves cycle 2 approver-owned records into final issuer stage', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'RA' }),
      response: {
        checker_id: 'checker-2',
        checker_name: 'Checker Two',
        approver_id: 'approver-2',
        approver_name: 'Approver Two',
      },
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new MnrWorkflowService(repository as any);
    const result = await service.approveResponse('mnr-1', 'approver-2', 'cycle2 approved');

    expect(tx.set).toHaveBeenCalledWith(
      expect.objectContaining({
        request_status: 'RV',
        updateby: 'approver-2',
      }),
    );
    expect(result.data).toEqual(expect.objectContaining({
      status: 'RV',
      workflowStageCode: '19',
      nextApproverId: 'issuer-1',
      nextApproverName: null,
    }));
  });

  it('returns issuer review rejection to supplier correction stage', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'RW', attention_id: 'supplier-attn-1' }),
      response: {
        checker_id: 'checker-2',
        approver_id: 'approver-2',
      },
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new MnrWorkflowService(repository as any);
    const result = await service.rejectResponse('mnr-1', 'issuer-1', 'redo response');

    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({ request_status: 'RS' }));
    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({ issuer_remarks: 'redo response' }));
    expect(result.data).toEqual(expect.objectContaining({
      status: 'RS',
      workflowStageCode: '20',
      nextApproverId: 'supplier-attn-1',
    }));
  });

  it('returns cycle 2 checker rejection to issuer correction stage', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'RC' }),
      response: {
        checker_id: 'checker-2',
        approver_id: 'approver-2',
      },
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new MnrWorkflowService(repository as any);
    const result = await service.rejectResponse('mnr-1', 'checker-2', 'fix closure');

    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({ request_status: 'AC' }));
    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({ checker_remarks: 'fix closure' }));
    expect(result.data).toEqual(expect.objectContaining({
      status: 'AC',
      workflowStageCode: '21',
      nextApproverId: 'issuer-1',
    }));
  });

  it('returns cycle 2 approver rejection to issuer correction stage', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'RA' }),
      response: {
        checker_id: 'checker-2',
        approver_id: 'approver-2',
      },
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new MnrWorkflowService(repository as any);
    const result = await service.rejectResponse('mnr-1', 'approver-2', 'fix approval');

    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({ request_status: 'AA' }));
    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({ approver_remarks: 'fix approval' }));
    expect(result.data).toEqual(expect.objectContaining({
      status: 'AA',
      workflowStageCode: '22',
      nextApproverId: 'issuer-1',
    }));
  });

  it('accepts final issuer stage into closed status', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'RV' }),
      response: {
        checker_id: 'checker-2',
        approver_id: 'approver-2',
      },
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new MnrWorkflowService(repository as any);
    const result = await service.acceptResponse('mnr-1', 'issuer-1', 'accepted');

    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({ request_status: 'CL' }));
    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({ issuer_remarks: 'accepted' }));
    expect(result.data).toEqual(expect.objectContaining({
      status: 'CL',
      workflowStageCode: '1',
    }));
  });

  it('returns final issuer stage to supplier when not accepted', async () => {
    const tx = createTransactionMock();
    repository.findByIdDetailed.mockResolvedValue({
      record: createRecord({ request_status: 'RV', attention_id: 'supplier-attn-1' }),
      response: {
        checker_id: 'checker-2',
        approver_id: 'approver-2',
      },
    });
    repository.executeTransaction.mockImplementation(async (callback: any) => callback(tx.trx));

    const service = new MnrWorkflowService(repository as any);
    const result = await service.notAcceptResponse('mnr-1', 'issuer-1', 'redo closure');

    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({ request_status: 'RJ' }));
    expect(tx.set).toHaveBeenCalledWith(expect.objectContaining({ issuer_remarks: 'redo closure' }));
    expect(result.data).toEqual(expect.objectContaining({
      status: 'RJ',
      workflowStageCode: '24',
      nextApproverId: 'supplier-attn-1',
    }));
  });
});
