import { describe, expect, it } from 'vitest';
import { mapSupplierInformationRecord } from '../supplier-information.service.js';

describe('mapSupplierInformationRecord', () => {
  it('normalizes joined supplier info rows into the frontend-safe DTO', () => {
    const record = mapSupplierInformationRecord({
      supplier_information_id: 'si-1',
      supplier_id: 'sup-1',
      supplier_name: 'Alpha Supplier',
      site_id: 'site-1',
      site_name: 'Batam',
      first_name: 'Jane',
      middle_name: 'Q',
      last_name: 'Public',
      supplier_information_desc: 'Primary contact',
      attachment_id: 'att-1',
      attachment_name: 'contact.pdf',
      attachment_extension: '.pdf',
      active_flag: 1,
      last_update: '2026-05-13T10:00:00.000Z',
      updateby: 'admin',
    });

    expect(record).toMatchObject({
      id: 'si-1',
      supplierId: 'sup-1',
      supplierName: 'Alpha Supplier',
      siteId: 'site-1',
      siteName: 'Batam',
      fullName: 'Jane Q Public',
      attachmentUrl: '/api/supplier-information/attachments/att-1',
      isActive: true,
      updatedBy: 'admin',
    });
    expect(record.updatedAt).toBe('2026-05-13T10:00:00.000Z');
  });
});
