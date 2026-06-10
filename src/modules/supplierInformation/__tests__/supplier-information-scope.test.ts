import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMock = vi.hoisted(() => ({
  findAllActive: vi.fn(),
  findActiveBySupplier: vi.fn(),
  findById: vi.fn(),
  findByAttachmentId: vi.fn(),
  searchActive: vi.fn(),
  findSupplierIdsByUserId: vi.fn(),
  findActorRoleName: vi.fn(),
}));

vi.mock('../supplier-information.repository.js', () => ({
  supplierInformationRepository: repositoryMock,
}));

import { supplierInformationService } from '../supplier-information.service.js';

function createRow(supplierId: string, id = `si-${supplierId}`) {
  return {
    supplier_information_id: id,
    supplier_id: supplierId,
    first_name: 'Test',
    middle_name: null,
    last_name: 'User',
    supplier_information_desc: `${supplierId} contact`,
    attachment_id: '',
    attachment_name: '',
    attachment_extension: '',
    active_flag: 1,
    last_update: null,
    updateby: null,
    supplier_name: `Supplier ${supplierId}`,
    site_id: 'site-1',
    site_name: 'Site A',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SupplierInformationService scope enforcement', () => {
  it('returns only records for user-assigned suppliers in list()', async () => {
    repositoryMock.findActorRoleName.mockResolvedValue('Quality Engineer');
    repositoryMock.findSupplierIdsByUserId.mockResolvedValue(['sup-alpha']);
    repositoryMock.findAllActive.mockResolvedValue([
      createRow('sup-alpha'),
      createRow('sup-beta'),
      createRow('sup-alpha', 'si-alpha-2'),
    ]);

    const records = await supplierInformationService.list('user-1');

    expect(records).toHaveLength(2);
    expect(records.every((r) => r.supplierId === 'sup-alpha')).toBe(true);
  });

  it('returns empty array when user has no supplier assignments', async () => {
    repositoryMock.findActorRoleName.mockResolvedValue('Quality Engineer');
    repositoryMock.findSupplierIdsByUserId.mockResolvedValue([]);
    repositoryMock.findAllActive.mockResolvedValue([
      createRow('sup-alpha'),
      createRow('sup-beta'),
    ]);

    const records = await supplierInformationService.list('user-1');

    expect(records).toHaveLength(0);
  });

  it('admin user sees all records regardless of supplier assignment', async () => {
    repositoryMock.findActorRoleName.mockResolvedValue('TIP Administrator (Super User)');
    repositoryMock.findAllActive.mockResolvedValue([
      createRow('sup-alpha'),
      createRow('sup-beta'),
    ]);

    const records = await supplierInformationService.list('admin-1');

    expect(records).toHaveLength(2);
    expect(repositoryMock.findSupplierIdsByUserId).not.toHaveBeenCalled();
  });

  it('listBySupplier returns empty for unassigned supplier', async () => {
    repositoryMock.findActorRoleName.mockResolvedValue('Quality Engineer');
    repositoryMock.findSupplierIdsByUserId.mockResolvedValue(['sup-alpha']);

    const records = await supplierInformationService.listBySupplier('sup-beta', 'user-1');

    expect(records).toHaveLength(0);
    expect(repositoryMock.findActiveBySupplier).not.toHaveBeenCalled();
  });

  it('listBySupplier returns records for assigned supplier', async () => {
    repositoryMock.findActorRoleName.mockResolvedValue('Quality Engineer');
    repositoryMock.findSupplierIdsByUserId.mockResolvedValue(['sup-alpha']);
    repositoryMock.findActiveBySupplier.mockResolvedValue([createRow('sup-alpha')]);

    const records = await supplierInformationService.listBySupplier('sup-alpha', 'user-1');

    expect(records).toHaveLength(1);
  });

  it('getById throws NotFoundError for unassigned supplier record', async () => {
    repositoryMock.findById.mockResolvedValue(createRow('sup-beta'));
    repositoryMock.findActorRoleName.mockResolvedValue('Quality Engineer');
    repositoryMock.findSupplierIdsByUserId.mockResolvedValue(['sup-alpha']);

    await expect(
      supplierInformationService.getById('si-beta', 'user-1'),
    ).rejects.toMatchObject({ message: 'Supplier information record not found' });
  });

  it('getById returns record for assigned supplier', async () => {
    repositoryMock.findById.mockResolvedValue(createRow('sup-alpha'));
    repositoryMock.findActorRoleName.mockResolvedValue('Quality Engineer');
    repositoryMock.findSupplierIdsByUserId.mockResolvedValue(['sup-alpha']);

    const record = await supplierInformationService.getById('si-alpha', 'user-1');

    expect(record).toBeDefined();
    expect(record.supplierId).toBe('sup-alpha');
  });

  it('downloadAttachment throws NotFoundError for unassigned supplier', async () => {
    repositoryMock.findByAttachmentId.mockResolvedValue({
      ...createRow('sup-beta'),
      attachment_id: 'att-beta',
      attachment_name: 'file.pdf',
      attachment_extension: '.pdf',
    });
    repositoryMock.findActorRoleName.mockResolvedValue('Quality Engineer');
    repositoryMock.findSupplierIdsByUserId.mockResolvedValue(['sup-alpha']);

    await expect(
      supplierInformationService.downloadAttachment('att-beta', 'user-1'),
    ).rejects.toMatchObject({ message: 'Supplier information attachment not found' });
  });

  it('search filters results by user-assigned suppliers', async () => {
    repositoryMock.findActorRoleName.mockResolvedValue('Quality Engineer');
    repositoryMock.findSupplierIdsByUserId.mockResolvedValue(['sup-alpha']);
    repositoryMock.searchActive.mockResolvedValue([
      createRow('sup-alpha'),
      createRow('sup-beta'),
    ]);

    const records = await supplierInformationService.search('test', 'user-1');

    expect(records).toHaveLength(1);
    expect(records[0].supplierId).toBe('sup-alpha');
  });
});
