import { beforeEach, describe, expect, it, vi } from 'vitest';

const workflowServiceMock = vi.hoisted(() => ({
  canUserUpdateRecord: vi.fn(),
}));

vi.mock('../../src/modules/fiveM1E/workflow/fiveM1E-workflow.service.js', () => ({
  fiveM1EWorkflowService: workflowServiceMock,
}));

import { requireFiveM1EEditAccess } from '../../src/modules/fiveM1E/requireFiveM1EEditAccess.js';
import { ForbiddenError, UnauthorizedError } from '../../src/shared/errors/AppError.js';

describe('requireFiveM1EEditAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows the request when the actor can update the record', async () => {
    workflowServiceMock.canUserUpdateRecord.mockResolvedValue(true);
    const next = vi.fn();

    await requireFiveM1EEditAccess(
      { params: { id: '5M-001' }, user: { userId: 'editor-1' } } as any,
      {} as any,
      next,
    );

    expect(workflowServiceMock.canUserUpdateRecord).toHaveBeenCalledWith('5M-001', 'editor-1');
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects the request when the actor cannot update the record', async () => {
    workflowServiceMock.canUserUpdateRecord.mockResolvedValue(false);
    const next = vi.fn();

    await requireFiveM1EEditAccess(
      { params: { id: '5M-001' }, user: { userId: 'editor-1' } } as any,
      {} as any,
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
  });

  it('rejects unauthenticated requests', async () => {
    const next = vi.fn();

    await requireFiveM1EEditAccess(
      { params: { id: '5M-001' } } as any,
      {} as any,
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });
});
