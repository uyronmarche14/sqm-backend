import { describe, expect, it, vi } from 'vitest';
import { SqprNotificationService } from '../../../../src/shared/notifications/sqpr-notification.service.js';

vi.mock('../../../../src/shared/notifications/email.config.js', () => ({
  getEmailConfig: () => ({
    enabled: true,
    transport: 'file',
    fromEmail: 'noreply@sqm.local',
    fromName: 'SQM Notifications',
    outputDir: '/tmp/emails',
    frontendBaseUrl: 'http://localhost:5000',
    loginPath: '/auth/login',
    localBaseUrl: 'http://localhost:5000',
    internetBaseUrl: 'https://sqm.example.com',
    localUrl: 'http://localhost:5000/auth/login',
    internetUrl: 'https://sqm.example.com/auth/login',
  }),
}));

describe('SqprNotificationService', () => {
  it('renders and sends SQPR workflow notifications with module record links', async () => {
    const mailer = {
      send: vi.fn().mockResolvedValue({
        delivered: true,
        transport: 'file',
        referenceId: '/tmp/emails/sqpr-message.json',
      }),
    } as any;

    const service = new SqprNotificationService(mailer);
    const result = await service.sendWorkflowNotification({
      eventKey: 'sqpr.checked',
      recordId: 'sqpr-1',
      controlNo: 'SQPR-2026-3-T',
      supplierName: 'Toshiba Supplier',
      periodLabel: 'April 2026',
      subject: '<SQPR> Awaiting Approval',
      message: 'The report has been reviewed and checked by Checker One',
      to: [{ email: 'approver@example.com', name: 'Approver One' }],
      cc: [
        { email: 'cc@example.com', name: 'CC One' },
        { email: 'approver@example.com', name: 'Approver One' },
      ],
    });

    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: 'sqpr.checked',
        subject: '<SQPR> Awaiting Approval',
        to: [{ email: 'approver@example.com', name: 'Approver One' }],
        cc: [{ email: 'cc@example.com', name: 'CC One' }],
        metadata: expect.objectContaining({
          module: 'SQPR',
          recordId: 'sqpr-1',
        }),
      }),
    );
    expect(result.localUrl).toBe('http://localhost:5000/dashboard/sqpr/view/sqpr-1');
    expect(result.internetUrl).toBe('https://sqm.example.com/dashboard/sqpr/view/sqpr-1');
    expect(result.recipients).toEqual(['approver@example.com']);
  });
});
