import { beforeEach, describe, expect, it, vi } from 'vitest';

const ogiServiceMock = vi.hoisted(() => ({
  getRecordById: vi.fn(),
  downloadAttachment: vi.fn(),
}));

vi.mock('../../../../src/modules/ogi/ogi.service.js', () => ({
  ogiService: ogiServiceMock,
}));

import { ogiController } from '../../../../src/modules/ogi/ogi.controller.js';

describe('OgiController surface propagation', () => {
  const recordId = '11111111-1111-4111-8111-111111111111';
  const attachmentId = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards query surface to detail reads', async () => {
    ogiServiceMock.getRecordById.mockResolvedValue({ ogi_id: 'ogi-1' });

    const req = {
      params: { id: recordId },
      query: { surface: 'search' },
      user: { userId: 'user-1', roleName: 'USER' },
    } as any;
    const res = { json: vi.fn() } as any;
    const next = vi.fn();

    await ogiController.getById(req, res, next);

    expect(ogiServiceMock.getRecordById).toHaveBeenCalledWith(
      recordId,
      { userId: 'user-1', roleName: 'USER' },
      'search',
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards query surface to attachment downloads', async () => {
    ogiServiceMock.downloadAttachment.mockResolvedValue({
      filePath: '/tmp/ogi.txt',
      fileName: 'ogi.txt',
      mimeType: 'text/plain',
    });

    const req = {
      params: { attachmentId },
      query: { surface: 'search' },
      user: { userId: 'user-1', roleName: 'USER' },
    } as any;
    const res = {
      setHeader: vi.fn(),
      download: vi.fn(),
    } as any;
    const next = vi.fn();

    await ogiController.downloadAttachment(req, res, next);

    expect(ogiServiceMock.downloadAttachment).toHaveBeenCalledWith(
      attachmentId,
      { userId: 'user-1', roleName: 'USER' },
      'search',
    );
    expect(res.download).toHaveBeenCalledWith('/tmp/ogi.txt');
    expect(next).not.toHaveBeenCalled();
  });
});
