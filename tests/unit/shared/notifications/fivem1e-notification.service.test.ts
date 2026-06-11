import { describe, expect, it, vi } from 'vitest';
import { FiveM1ENotificationService } from '../../../../src/shared/notifications/fivem1e-notification.service.js';

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

describe('FiveM1ENotificationService', () => {
  it('falls back to Submitted queue recipients when no explicit owner or legacy to-rule exists', async () => {
    const mailer = {
      send: vi.fn().mockResolvedValue({
        delivered: true,
        transport: 'file',
        referenceId: '/tmp/emails/5m1e-message.json',
      }),
    } as any;
    const repository = {
      findEmailElements: vi.fn().mockResolvedValue([
        { element_name: 'EMAIL_SUBJECT', element_value: '<5M1E> Submitted - {CONTROLNO}' },
        { element_name: 'EMAIL_BODY', element_value: 'Submitted by {ACTOR_NAME}' },
      ]),
      findUserContactsByIds: vi.fn().mockResolvedValue([
        { userId: 'queue-1', fullName: 'MPD Queue User', email: 'submitted@example.com', activeFlag: 1 },
      ]),
      findCCUsers: vi.fn().mockResolvedValue([]),
    } as any;
    const permissions = {
      findUsersWithRolePermission: vi.fn().mockResolvedValue([
        { userId: 'queue-1', fullName: 'MPD Queue User' },
      ]),
    } as any;

    const service = new FiveM1ENotificationService(mailer, repository, permissions);
    const result = await service.sendWorkflowNotification({
      eventKey: 'fivem1e.submitted',
      recordId: '5m1e-1',
      controlNo: '5M1E-0001',
      pic: 'SUPPLIER',
      action: 'SUBMIT',
      actorName: 'Supplier User',
      message: 'The 5M1E application has been submitted by the supplier.',
      record: {
        ID: '5m1e-1',
        Title: 'Motor Change',
        supplier_name: 'Toshiba Supplier',
        site_name: 'Main Site',
        approval_status: 'SUBMITTED',
        approval_seq: 1,
      },
      fallbackFormIds: ['5M1EApprovalSecDes-06-17'],
    });

    expect(permissions.findUsersWithRolePermission).toHaveBeenCalledWith('5M1EApprovalSecDes-06-17', 'viewlist');
    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        eventKey: 'fivem1e.submitted',
        to: [{ email: 'submitted@example.com', name: 'MPD Queue User' }],
        metadata: expect.objectContaining({
          module: '5M1E',
          recipientSource: 'queue-fallback',
        }),
      }),
    );
    expect(result.recipientSource).toBe('queue-fallback');
    expect(result.localUrl).toBe('http://localhost:5000/dashboard/5m1e/view/5m1e-1');
  });

  it('prefers the explicit owner recipient when present', async () => {
    const mailer = {
      send: vi.fn().mockResolvedValue({
        delivered: true,
        transport: 'file',
        referenceId: '/tmp/emails/5m1e-owner.json',
      }),
    } as any;
    const repository = {
      findEmailElements: vi.fn().mockResolvedValue([]),
      findUserContactsByIds: vi.fn().mockResolvedValue([
        { userId: 'checker-1', fullName: 'SQE Checker', email: 'checker@example.com', activeFlag: 1 },
      ]),
      findCCUsers: vi.fn().mockResolvedValue([]),
    } as any;
    const permissions = {
      findUsersWithRolePermission: vi.fn(),
    } as any;

    const service = new FiveM1ENotificationService(mailer, repository, permissions);
    const result = await service.sendWorkflowNotification({
      eventKey: 'fivem1e.checked',
      recordId: '5m1e-2',
      controlNo: '5M1E-0002',
      pic: 'SQEChecker',
      action: 'APPROVE',
      actorName: 'Checker User',
      message: 'Checked by SQE.',
      record: {
        ID: '5m1e-2',
        Title: 'Bearing Update',
        supplier_name: 'Toshiba Supplier',
        approval_status: 'FOR APPROVAL',
        approval_seq: 5,
        checker: 'checker-1',
        checker_name: 'SQE Checker',
      },
    });

    expect(permissions.findUsersWithRolePermission).not.toHaveBeenCalled();
    expect(result.recipientSource).toBe('explicit-owner');
    expect(result.recipients).toEqual(['checker@example.com']);
  });
});
