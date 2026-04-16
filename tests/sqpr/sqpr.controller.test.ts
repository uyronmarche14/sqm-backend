import { beforeEach, describe, expect, it, vi } from 'vitest';

const sqprServiceMock = vi.hoisted(() => ({
  getRecordById: vi.fn(),
  downloadAttachment: vi.fn(),
}));

const sqprWorkflowServiceMock = vi.hoisted(() => ({
  submit: vi.fn(),
  issue: vi.fn(),
  reject: vi.fn(),
  approve: vi.fn(),
  check: vi.fn(),
}));

vi.mock('../../src/modules/sqpr/sqpr.service.js', () => ({
  sqprService: sqprServiceMock,
}));

vi.mock('../../src/modules/sqpr/workflow/sqpr-workflow.service.js', () => ({
  sqprWorkflowService: sqprWorkflowServiceMock,
}));

import { sqprController } from '../../src/modules/sqpr/sqpr.controller.js';

describe('SqprController surface propagation', () => {
  const recordId = '11111111-1111-4111-8111-111111111111';
  const attachmentId = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards query surface to detail reads', async () => {
    sqprServiceMock.getRecordById.mockResolvedValue({ sqpr_id: 'sqpr-1' });

    const req = {
      params: { id: recordId },
      query: { surface: 'search' },
      user: { userId: 'user-1', roleName: 'USER' },
    } as any;
    const res = { json: vi.fn() } as any;
    const next = vi.fn();

    await sqprController.getById(req, res, next);

    expect(sqprServiceMock.getRecordById).toHaveBeenCalledWith(
      recordId,
      { userId: 'user-1', roleName: 'USER' },
      'search',
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards query surface to attachment downloads', async () => {
    sqprServiceMock.downloadAttachment.mockResolvedValue({
      filePath: '/tmp/sqpr.txt',
      fileName: 'sqpr.txt',
      mimeType: 'text/plain',
    });

    const req = {
      params: { attachmentId },
      query: { surface: 'achievement' },
      user: { userId: 'user-1', roleName: 'USER' },
    } as any;
    const res = {
      setHeader: vi.fn(),
      download: vi.fn(),
    } as any;
    const next = vi.fn();

    await sqprController.downloadAttachment(req, res, next);

    expect(sqprServiceMock.downloadAttachment).toHaveBeenCalledWith(
      attachmentId,
      { userId: 'user-1', roleName: 'USER' },
      'achievement',
    );
    expect(res.download).toHaveBeenCalledWith('/tmp/sqpr.txt');
    expect(next).not.toHaveBeenCalled();
  });
});
