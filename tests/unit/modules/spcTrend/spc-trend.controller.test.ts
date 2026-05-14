import { beforeEach, describe, expect, it, vi } from 'vitest';

const spcTrendServiceMock = vi.hoisted(() => ({
  create: vi.fn(),
  downloadAttachment: vi.fn(),
}));

vi.mock('../../../../src/modules/spcTrend/spc-trend.service.js', () => ({
  spcTrendService: spcTrendServiceMock,
}));

import { spcTrendController } from '../../../../src/modules/spcTrend/spc-trend.controller.js';

describe('SpcTrendController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses multipart payload JSON and forwards uploaded files on create', async () => {
    spcTrendServiceMock.create.mockResolvedValue({ id: 'spc-1' });

    const req = {
      body: {
        payload: JSON.stringify({
          controlNo: 'TMP-SPC',
          mainDetails: {
            siteId: 'site-1',
            supplierId: 'supplier-1',
            partId: 'part-1',
          },
          approval: {
            issuer: {},
            checker: {},
            approver: {},
          },
        }),
      },
      files: [{ filename: 'stored.pdf', originalname: 'report.pdf' }],
      user: { userId: 'user-1' },
    } as any;
    const res = {
      status: vi.fn(() => ({ json: vi.fn() })),
    } as any;
    const next = vi.fn();

    await spcTrendController.create(req, res, next);

    expect(spcTrendServiceMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        controlNo: 'TMP-SPC',
        mainDetails: expect.objectContaining({ siteId: 'site-1' }),
      }),
      'user-1',
      [{ filename: 'stored.pdf', originalname: 'report.pdf' }],
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('downloads attachments through the service layer', async () => {
    spcTrendServiceMock.downloadAttachment.mockResolvedValue({
      filePath: '/tmp/spc.pdf',
      fileName: 'spc.pdf',
      mimeType: 'application/pdf',
    });

    const req = {
      params: { attachmentId: 'att-1' },
      user: { userId: 'user-1' },
    } as any;
    const res = {
      download: vi.fn(),
    } as any;
    const next = vi.fn();

    await spcTrendController.downloadAttachment(req, res, next);

    expect(spcTrendServiceMock.downloadAttachment).toHaveBeenCalledWith('att-1', { userId: 'user-1' });
    expect(res.download).toHaveBeenCalledWith('/tmp/spc.pdf', 'spc.pdf', {
      headers: {
        'Content-Type': 'application/pdf',
      },
    });
  });
});
