import { beforeEach, describe, expect, it, vi } from 'vitest';

const accessMock = vi.hoisted(() => vi.fn());
const repositoryMock = vi.hoisted(() => ({
  findByAttachmentId: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  default: {
    access: accessMock,
  },
}));

vi.mock('../supplier-information.repository.js', () => ({
  supplierInformationRepository: repositoryMock,
}));

import { supplierInformationService } from '../supplier-information.service.js';

describe('supplierInformationService.downloadAttachment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('denies downloads for inactive records', async () => {
    repositoryMock.findByAttachmentId.mockResolvedValue({
      supplier_information_id: 'si-1',
      supplier_id: 'sup-1',
      first_name: 'Jane',
      middle_name: null,
      last_name: 'Public',
      supplier_information_desc: 'Primary contact',
      attachment_id: 'att-1',
      attachment_name: 'contact.pdf',
      attachment_extension: '.pdf',
      active_flag: 0,
      last_update: null,
      updateby: null,
      supplier_name: 'Alpha Supplier',
      site_id: 'site-1',
      site_name: 'Batam',
    });

    await expect(supplierInformationService.downloadAttachment('att-1')).rejects.toMatchObject({
      message: 'Supplier information attachment not found',
    });
  });

  it('sanitizes attachment names before building the download contract', async () => {
    repositoryMock.findByAttachmentId.mockResolvedValue({
      supplier_information_id: 'si-1',
      supplier_id: 'sup-1',
      first_name: 'Jane',
      middle_name: null,
      last_name: 'Public',
      supplier_information_desc: 'Primary contact',
      attachment_id: 'att-1',
      attachment_name: '../unsafe name.pdf',
      attachment_extension: '.pdf',
      active_flag: 1,
      last_update: null,
      updateby: null,
      supplier_name: 'Alpha Supplier',
      site_id: 'site-1',
      site_name: 'Batam',
    });
    accessMock.mockResolvedValue(undefined);

    const file = await supplierInformationService.downloadAttachment('att-1');

    expect(file.fileName).toBe('unsafe_name.pdf');
    expect(file.filePath).toContain('att-1.pdf');
  });
});
