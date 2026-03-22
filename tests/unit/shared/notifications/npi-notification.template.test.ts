import { describe, expect, it } from 'vitest';
import { buildNpiNotificationTemplate } from '../../../../src/shared/notifications/templates/npi-notification.template.js';

describe('buildNpiNotificationTemplate', () => {
  it('renders the legacy NPI content with both record links', () => {
    const result = buildNpiNotificationTemplate({
      subject: '<NPI> Awaiting Approval - Toshiba Supplier',
      message: 'The report has been submitted by QA User',
      controlNo: 'IQC-2026-3-1-SITE',
      supplierName: 'Toshiba Supplier',
      localUrl: 'http://localhost:5000/dashboard/new-parts/view/npi-1',
      internetUrl: 'https://sqm.example.com/dashboard/new-parts/view/npi-1',
    });

    expect(result.subject).toBe('<NPI> Awaiting Approval - Toshiba Supplier');
    expect(result.html).toContain('New Parts Incoming');
    expect(result.html).toContain('The report has been submitted by QA User');
    expect(result.html).toContain('IQC-2026-3-1-SITE');
    expect(result.html).toContain('Toshiba Supplier');
    expect(result.html).toContain('Local Link');
    expect(result.html).toContain('Web Link');
    expect(result.text).toContain('Control No: IQC-2026-3-1-SITE');
    expect(result.text).toContain('Supplier: Toshiba Supplier');
  });
});
