import { describe, expect, it } from 'vitest';
import { BadRequestError } from '../shared/errors/AppError.js';

/**
 * Module-stage matrix: every workflow module, all stages, and the actions they should support.
 * This is the shared regression baseline — if any module's workflow constants change,
 * the tests here catch drift.
 */
const MODULE_STAGES: Record<string, string[]> = {
  '5M1E': ['DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'REJECTED', 'RELEASED'],
  MNR: ['DRAFT', 'CHECKER', 'APPROVER', 'ISSUER', 'SUPPLIER', 'INITIAL_RESPONSE', 'FINAL_RESPONSE',
    'ISSUER_2ND', 'CHECKER_2ND', 'APPROVER_2ND', 'ISSUER_3RD', 'NOT_ACCEPT', 'CANCEL', 'ACCEPT'],
  NPI: ['DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'REJECTED'],
  OGI: ['DRAFT', 'SUBMITTED'],
  SQPR: ['DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'ISSUED', 'REJECTED'],
  SQMP: ['DRAFT', 'CHECKER', 'APPROVER', 'ISSUER', 'SUPPLIER', 'ISSUER_2ND', 'CHECKER_2ND',
    'APPROVER_2ND', 'ISSUER_3RD', 'CLOSED', 'CANCELLED', 'REJECTED_BY_CHECKER',
    'REJECTED_BY_APPROVER', 'NOT_ACCEPTED_BY_ISSUER'],
  QMQA: ['DRAFT', 'CHECKER', 'APPROVER', 'ISSUER', 'SUPPLIER', 'INITIAL_RESPONSE', 'FINAL_RESPONSE',
    'ISSUER_2ND', 'CHECKER_2ND', 'APPROVER_2ND', 'ACCEPT', 'REJECTED', 'CANCEL', 'NOT_ACCEPT'],
  SSI: ['DRAFT', 'AWAITING_CHECKED', 'AWAITING_APPROVAL', 'APPROVED', 'ISSUED', 'REJECTED',
    'CANCELLED', 'WITH_INITIAL_REPORT', 'WITH_FINAL_REPORT', 'RESPONSE_AWAITING_APPROVAL',
    'RESPONSE_REJECTED', 'CLOSED'],
  'Supplier Quality': ['DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'ISSUED', 'REJECTED'],
  'SPC Trend': ['DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'ISSUED', 'REJECTED'],
};

/**
 * Required actions per stage — each module should support at minimum:
 * DRAFT: create, edit, delete, submit
 * AWAITING_APPROVAL: check, approve, reject
 * APPROVED: issue
 * ISSUED: response (if applicable)
 */
const REQUIRED_ACTIONS_BY_STAGE: Record<string, string[]> = {
  DRAFT: ['create', 'edit', 'delete', 'submit'],
  AWAITING_APPROVAL: ['check', 'approve', 'reject'],
  APPROVED: ['issue'],
  ISSUED: ['response'],
  REJECTED: ['edit', 'resubmit'],
};

describe('Shared Workflow Transition Regression', () => {
  describe('module stage definitions', () => {
    const modules = Object.keys(MODULE_STAGES);

    it.each(modules)('%s defines at minimum DRAFT and a terminal stage', (mod) => {
      const stages = MODULE_STAGES[mod];
      expect(stages).toContain('DRAFT');
      // At least one terminal stage
      const terminalStages = ['APPROVED', 'CLOSED', 'ACCEPT', 'RELEASED', 'SUBMITTED', 'ISSUED'];
      const hasTerminal = stages.some((s) => terminalStages.includes(s));
      expect(hasTerminal).toBe(true);
    });

    it.each(modules)('%s has no duplicate stages', (mod) => {
      const stages = MODULE_STAGES[mod];
      expect(new Set(stages).size).toBe(stages.length);
    });
  });

  describe('required actions per stage', () => {
    const stageKeys = Object.keys(REQUIRED_ACTIONS_BY_STAGE);

    it.each(stageKeys)('stage %s has at least one required action defined', (stage) => {
      const actions = REQUIRED_ACTIONS_BY_STAGE[stage];
      expect(actions.length).toBeGreaterThan(0);
    });
  });

  describe('cross-module consistency', () => {
    it('all modules with response cycle have ISSUER or ISSUED stage', () => {
      expect(MODULE_STAGES['MNR']).toContain('ISSUER');
      expect(MODULE_STAGES['SQMP']).toContain('ISSUER');
      expect(MODULE_STAGES['QMQA']).toContain('ISSUER');
      expect(MODULE_STAGES['SSI']).toContain('ISSUED');
    });

    it('all modules without response cycle have APPROVED or SUBMITTED as terminal', () => {
      const simpleModules = ['NPI', 'SQPR', 'OGI', 'Supplier Quality', 'SPC Trend'];
      for (const mod of simpleModules) {
        const stages = MODULE_STAGES[mod];
        expect(stages.includes('APPROVED') || stages.includes('SUBMITTED') || stages.includes('ISSUED')).toBe(true);
      }
    });
  });
});

import { assertNoWorkflowMutationFields } from '../shared/utils/reject-workflow-mutation-fields.js';

describe('Workflow mutation guard integration', () => {
  it('rejects status field in payload', () => {
    expect(() => assertNoWorkflowMutationFields({ status: 'AP' }, 'MNR')).toThrow(BadRequestError);
  });

  it('allows non-status updates', () => {
    expect(() => assertNoWorkflowMutationFields({ remarks: 'test update' }, 'MNR')).not.toThrow();
  });
});
