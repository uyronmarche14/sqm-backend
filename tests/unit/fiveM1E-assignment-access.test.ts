import { describe, expect, it } from 'vitest';

import { resolveAssignedFiveM1EForms } from '../../src/modules/auth/fiveM1E-assignment-access.js';

describe('resolveAssignedFiveM1EForms', () => {
  it('does not grant FApproved forms to a future actor referenced on a reviewer-stage record', () => {
    const forms = resolveAssignedFiveM1EForms(
      {
        approval_status: 'FOR APPROVAL',
        approval_seq: 4,
        created_by: 'creator-1',
        reviewer: 'reviewer-1',
        approver: 'future-sqe-approver',
      },
      'future-sqe-approver',
    );

    expect(forms).toEqual([]);
  });

  it('grants FApproved forms to the actual current reviewer on a reviewer-stage record', () => {
    const forms = resolveAssignedFiveM1EForms(
      {
        approval_status: 'FOR APPROVAL',
        approval_seq: 4,
        created_by: 'creator-1',
        reviewer: 'reviewer-1',
        approver: 'future-sqe-approver',
      },
      'reviewer-1',
    );

    expect(forms).toEqual([
      '5M1EApprovalSecEnvi-06-17',
      '5M1EApprovalSecQA-06-17',
    ]);
  });

  it('grants Submitted forms only to the actual MPD approver on an MPD approver-stage record', () => {
    const forms = resolveAssignedFiveM1EForms(
      {
        approval_status: 'FOR APPROVAL',
        approval_seq: 2,
        created_by: 'creator-1',
        mpd_approver: 'mpd-approver-1',
        reviewer: 'reviewer-1',
      },
      'mpd-approver-1',
    );

    expect(forms).toEqual(['5M1EApprovalSecDes-06-17']);
  });

  it('grants RAR forms only to the record creator', () => {
    const creatorForms = resolveAssignedFiveM1EForms(
      {
        approval_status: 'RAR',
        created_by: 'creator-1',
      },
      'creator-1',
    );
    const otherForms = resolveAssignedFiveM1EForms(
      {
        approval_status: 'RAR',
        created_by: 'creator-1',
      },
      'other-user',
    );

    expect(creatorForms).toEqual(['5M1ERAR-06-17', '5M1ESupplier_Submition']);
    expect(otherForms).toEqual([]);
  });
});
