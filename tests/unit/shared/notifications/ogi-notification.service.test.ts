import { describe, expect, it, vi } from 'vitest';
import { OgiNotificationService } from '../../../../src/shared/notifications/ogi-notification.service.js';

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

describe('OgiNotificationService', () => {
  it('renders and sends OGI submitted notifications with module record links', async () => {
    const mailer = {
      send: vi.fn().mockResolvedValue({
        delivered: true,
        transport: 'file',
        referenceId: '/tmp/emails/ogi-message.json',
      }),
    } as any;

    const service = new OgiNotificationService(mailer);
    const result = await service.sendSubmittedNotification({
      eventKey: 'ogi.submitted',
      recordId: 'ogi-1',
      controlNo: 'OGI-2026-3-1-SITE',
      supplierName: 'Toshiba Supplier',
      siteName: 'Main Site',
      submittedByName: 'OGI Submitter',
      submittedDate: '2026-03-22T12:00:00.000Z',
      subject: '<OGI> Uploaded - Toshiba Supplier',
      message: 'The report has been submitted by OGI Submitter',
      to: [{ email: 'ogi@example.com', name: 'OGI Recipient' }],
    });

    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: 'ogi.submitted',
        subject: '<OGI> Uploaded - Toshiba Supplier',
        to: [{ email: 'ogi@example.com', name: 'OGI Recipient' }],
        metadata: expect.objectContaining({
          module: 'OGI',
          recordId: 'ogi-1',
        }),
      }),
    );
    expect(result.localUrl).toBe('http://localhost:5000/dashboard/ogi-up/view/ogi-1');
    expect(result.internetUrl).toBe('https://sqm.example.com/dashboard/ogi-up/view/ogi-1');
    expect(result.recipients).toEqual(['ogi@example.com']);
  });
});
