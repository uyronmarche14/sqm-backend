import { beforeEach, describe, expect, it, vi } from 'vitest';

const supplierInformationServiceMock = vi.hoisted(() => ({
  getById: vi.fn(),
  downloadAttachment: vi.fn(),
}));

vi.mock('../../../../src/modules/supplierInformation/supplier-information.service.js', () => ({
  supplierInformationService: supplierInformationServiceMock,
}));

import { supplierInformationController } from '../../../../src/modules/supplierInformation/supplier-information.controller.js';

describe('SupplierInformationController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards validated detail ids to the service layer', async () => {
    supplierInformationServiceMock.getById.mockResolvedValue({ id: 'si-1' });
    const req = { params: { id: 'si-1' } } as any;
    const res = { json: vi.fn() } as any;
    const next = vi.fn();

    await supplierInformationController.getById(req, res, next);

    expect(supplierInformationServiceMock.getById).toHaveBeenCalledWith('si-1', undefined);
    expect(next).not.toHaveBeenCalled();
  });

  it('downloads attachments through the service layer', async () => {
    supplierInformationServiceMock.downloadAttachment.mockResolvedValue({
      filePath: '/tmp/contact.pdf',
      fileName: 'contact.pdf',
      mimeType: 'application/pdf',
    });
    const req = { params: { attachmentId: 'att-1' } } as any;
    const res = {
      setHeader: vi.fn(),
      download: vi.fn(),
    } as any;
    const next = vi.fn();

    await supplierInformationController.downloadAttachment(req, res, next);

    expect(supplierInformationServiceMock.downloadAttachment).toHaveBeenCalledWith('att-1', undefined);
    expect(res.download).toHaveBeenCalledWith('/tmp/contact.pdf');
  });
});
