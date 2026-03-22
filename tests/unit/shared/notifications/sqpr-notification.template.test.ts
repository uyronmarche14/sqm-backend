import { describe, expect, it } from 'vitest';
import { buildSqprNotificationTemplate } from '../../../../src/shared/notifications/templates/sqpr-notification.template.js';

describe('buildSqprNotificationTemplate', () => {
  it('renders the SQPR workflow content with both record links', () => {
    const result = buildSqprNotificationTemplate({
      subject: '<SQPR> Awaiting Approval',
      message: 'The report has been reviewed and checked by Checker One',
      controlNo: 'SQPR-2026-3-T',
      supplierName: 'Toshiba Supplier',
      periodLabel: 'April 2026',
      localUrl: 'http://localhost:5000/dashboard/sqpr/view/sqpr-1',
      internetUrl: 'https://sqm.example.com/dashboard/sqpr/view/sqpr-1',
    });

    expect(result.subject).toBe('<SQPR> Awaiting Approval');
    expect(result.html).toContain('Supplier Quality Performance Rating Report');
    expect(result.html).toContain('Checker One');
    expect(result.html).toContain('SQPR-2026-3-T');
    expect(result.html).toContain('April 2026');
    expect(result.html).toContain('Local Link');
    expect(result.html).toContain('Web Link');
    expect(result.text).toContain('Control No: SQPR-2026-3-T');
    expect(result.text).toContain('Period: April 2026');
  });
});
