import { describe, expect, it } from 'vitest';
import { buildOgiNotificationTemplate } from '../../../../src/shared/notifications/templates/ogi-notification.template.js';

describe('buildOgiNotificationTemplate', () => {
  it('renders the OGI submitted content with both record links', () => {
    const result = buildOgiNotificationTemplate({
      subject: '<OGI> Uploaded - Toshiba Supplier',
      message: 'The report has been submitted by OGI Submitter',
      controlNo: 'OGI-2026-3-1-SITE',
      supplierName: 'Toshiba Supplier',
      siteName: 'Main Site',
      submittedByName: 'OGI Submitter',
      submittedDate: '2026-03-22T12:00:00.000Z',
      localUrl: 'http://localhost:5000/dashboard/ogi-up/view/ogi-1',
      internetUrl: 'https://sqm.example.com/dashboard/ogi-up/view/ogi-1',
    });

    expect(result.subject).toBe('<OGI> Uploaded - Toshiba Supplier');
    expect(result.html).toContain('Outgoing Inspection');
    expect(result.html).toContain('OGI Submitter');
    expect(result.html).toContain('OGI-2026-3-1-SITE');
    expect(result.html).toContain('Main Site');
    expect(result.html).toContain('Local Link');
    expect(result.html).toContain('Web Link');
    expect(result.text).toContain('Submitted By: OGI Submitter');
    expect(result.text).toContain('Supplier: Toshiba Supplier');
  });
});
