import { describe, expect, it, vi } from 'vitest';
import { NpiNotificationService } from '../../../../src/shared/notifications/npi-notification.service.js';

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

describe('NpiNotificationService', () => {
  it('renders and sends NPI workflow notifications with module record links', async () => {
    const mailer = {
      send: vi.fn().mockResolvedValue({
        delivered: true,
        transport: 'file',
        referenceId: '/tmp/emails/npi-message.json',
      }),
    } as any;

    const service = new NpiNotificationService(mailer);
    const result = await service.sendWorkflowNotification({
      eventKey: 'npi.submitted',
      recordId: 'npi-1',
      controlNo: 'IQC-2026-3-1-SITE',
      supplierName: 'Toshiba Supplier',
      subject: '<NPI> Awaiting Approval - Toshiba Supplier',
      message: 'The report has been submitted by QA User',
      to: [{ email: 'checker@example.com', name: 'Checker User' }],
      cc: [
        { email: 'cc1@example.com', name: 'CC One' },
        { email: 'checker@example.com', name: 'Checker User' },
      ],
    });

    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: 'npi.submitted',
        subject: '<NPI> Awaiting Approval - Toshiba Supplier',
        to: [{ email: 'checker@example.com', name: 'Checker User' }],
        cc: [{ email: 'cc1@example.com', name: 'CC One' }],
        metadata: expect.objectContaining({
          module: 'NPI',
          recordId: 'npi-1',
        }),
      }),
    );
    expect(result.localUrl).toBe('http://localhost:5000/dashboard/new-parts/view/npi-1');
    expect(result.internetUrl).toBe('https://sqm.example.com/dashboard/new-parts/view/npi-1');
    expect(result.recipients).toEqual(['checker@example.com']);
  });
});
