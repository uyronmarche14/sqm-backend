import { describe, it, expect, beforeEach, vi } from 'vitest';

const workflowServiceMock = vi.hoisted(() => ({
  submitResponse: vi.fn(),
  submitClosure: vi.fn(),
  saveResponse: vi.fn(),
}));

const mainServiceMock = vi.hoisted(() => ({
  getRecordById: vi.fn(),
}));

vi.mock('../../src/modules/sqmp/workflow/workflow.service.js', () => ({
  sqmpWorkflowService: workflowServiceMock,
}));

vi.mock('../../src/modules/sqmp/main/main.service.js', () => ({
  mainSqmpService: mainServiceMock,
}));

import { sqmpResponseController } from '../../src/modules/sqmp/response/response.controller';

describe('SqmpResponseController legacy upsert alias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes stage 21 legacy upsert through submit-closure, not submit-response', async () => {
    mainServiceMock.getRecordById.mockResolvedValue({ workflowStageCode: '21' });
    workflowServiceMock.submitClosure.mockResolvedValue({ data: { id: 'sqmp-1' }, message: 'ok' });

    const req = {
      params: { id: 'sqmp-1' },
      body: {},
      user: { userId: 'issuer-1', roleId: 'role-1' },
      files: [],
    } as any;
    const res = { json: vi.fn() } as any;
    const next = vi.fn();

    await sqmpResponseController.upsert(req, res, next);

    expect(workflowServiceMock.submitClosure).toHaveBeenCalledWith('sqmp-1', {}, 'issuer-1', 'role-1', []);
    expect(workflowServiceMock.submitResponse).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('keeps submitResponse bound when Express calls the handler without controller context', async () => {
    workflowServiceMock.submitResponse.mockResolvedValue({ data: { id: 'sqmp-1' }, message: 'submitted' });

    const req = {
      params: { id: 'sqmp-1' },
      body: {},
      user: { userId: 'supplier-1', roleId: 'role-supplier' },
      files: [],
    } as any;
    const res = { json: vi.fn() } as any;
    const next = vi.fn();

    const handler = sqmpResponseController.submitResponse;
    await handler(req, res, next);

    expect(workflowServiceMock.submitResponse).toHaveBeenCalledWith('sqmp-1', {}, 'supplier-1', 'role-supplier', []);
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: { id: 'sqmp-1' },
      message: 'submitted',
    }));
  });
});
