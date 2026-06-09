import { describe, expect, it } from 'vitest';
import {
  MNR_WORKFLOW_STAGE,
  MNR_LEGACY_STAGE_CODE,
  MNR_WORKFLOW_ACTION,
  MNR_STAGE_LABEL,
  MNR_DB_STATUS_TO_STAGE,
} from '../mnr-workflow.constants.js';

const MNR_EXPECTED_STAGES = [
  MNR_WORKFLOW_STAGE.DRAFT,
  MNR_WORKFLOW_STAGE.CHECKER,
  MNR_WORKFLOW_STAGE.APPROVER,
  MNR_WORKFLOW_STAGE.ISSUER,
  MNR_WORKFLOW_STAGE.SUPPLIER,
  MNR_WORKFLOW_STAGE.REJECT_SUPPLIER,
  MNR_WORKFLOW_STAGE.INITIAL_RESPONSE,
  MNR_WORKFLOW_STAGE.FINAL_RESPONSE,
  MNR_WORKFLOW_STAGE.ISSUER_2ND,
  MNR_WORKFLOW_STAGE.REJECT_ISSUER_2ND,
  MNR_WORKFLOW_STAGE.CHECKER_2ND,
  MNR_WORKFLOW_STAGE.APPROVER_2ND,
  MNR_WORKFLOW_STAGE.ISSUER_3RD,
  MNR_WORKFLOW_STAGE.REJECT_CHECKER_2ND,
  MNR_WORKFLOW_STAGE.REJECT_APPROVER_2ND,
  MNR_WORKFLOW_STAGE.NOT_ACCEPT,
  MNR_WORKFLOW_STAGE.CANCEL,
  MNR_WORKFLOW_STAGE.ACCEPT,
  MNR_WORKFLOW_STAGE.REJECT_CHECKER,
  MNR_WORKFLOW_STAGE.REJECT_APPROVER,
  MNR_WORKFLOW_STAGE.LOT_TRACKING,
];

const MNR_EXPECTED_ACTIONS = [
  MNR_WORKFLOW_ACTION.SUBMIT,
  MNR_WORKFLOW_ACTION.CHECK,
  MNR_WORKFLOW_ACTION.APPROVE,
  MNR_WORKFLOW_ACTION.REJECT,
  MNR_WORKFLOW_ACTION.ISSUE,
  MNR_WORKFLOW_ACTION.CLOSE,
  MNR_WORKFLOW_ACTION.CANCEL,
  MNR_WORKFLOW_ACTION.SAVE_INITIAL_RESPONSE,
  MNR_WORKFLOW_ACTION.SUBMIT_INITIAL_RESPONSE,
  MNR_WORKFLOW_ACTION.SAVE_FINAL_RESPONSE,
  MNR_WORKFLOW_ACTION.SUBMIT_FINAL_RESPONSE,
  MNR_WORKFLOW_ACTION.SAVE_RESPONSE_REVIEW,
  MNR_WORKFLOW_ACTION.SUBMIT_RESPONSE_REVIEW,
  MNR_WORKFLOW_ACTION.CHECK_RESPONSE,
  MNR_WORKFLOW_ACTION.APPROVE_RESPONSE,
  MNR_WORKFLOW_ACTION.REJECT_RESPONSE,
  MNR_WORKFLOW_ACTION.ACCEPT_RESPONSE,
  MNR_WORKFLOW_ACTION.NOT_ACCEPT_RESPONSE,
];

describe('MNR Workflow Constants', () => {
  describe('version parity', () => {
    it('stage labels cover all stages', () => {
      const stageKeys = Object.keys(MNR_WORKFLOW_STAGE).filter(k => isNaN(Number(k)));
      expect(stageKeys.length).toBe(MNR_EXPECTED_STAGES.length);
    });

    it('legacy stage codes cover all stages', () => {
      const stageKeys = Object.keys(MNR_WORKFLOW_STAGE).filter(k => isNaN(Number(k)));
      expect(Object.keys(MNR_LEGACY_STAGE_CODE).length).toBe(stageKeys.length);
    });

    it('action count matches between enum and labels', () => {
      const actionKeys = Object.keys(MNR_WORKFLOW_ACTION).filter(k => isNaN(Number(k)));
      expect(actionKeys.length).toBe(MNR_EXPECTED_ACTIONS.length);
    });
  });

  describe('stage labels are complete', () => {
    it.each(MNR_EXPECTED_STAGES)('stage %s has a label', (stage) => {
      expect(MNR_STAGE_LABEL[stage]).toBeTruthy();
      expect(typeof MNR_STAGE_LABEL[stage]).toBe('string');
    });
  });

  describe('legacy stage codes are complete', () => {
    it.each(MNR_EXPECTED_STAGES)('stage %s has a legacy code', (stage) => {
      expect(MNR_LEGACY_STAGE_CODE[stage]).toBeTruthy();
      expect(typeof MNR_LEGACY_STAGE_CODE[stage]).toBe('string');
    });
  });

  describe('DB status to stage mapping', () => {
    const expectedMappings: Array<[string, string]> = [
      ['DR', 'DRAFT'],
      ['SU', 'CHECKER'],
      ['CK', 'APPROVER'],
      ['AP', 'ISSUER'],
      ['IS', 'SUPPLIER'],
      ['RJ', 'NOT_ACCEPT'],
      ['CA', 'CANCEL'],
      ['CL', 'ACCEPT'],
    ];

    it.each(expectedMappings)('maps legacy status %s to stage %s', (dbStatus, expectedStage) => {
      const stageKey = Object.entries(MNR_WORKFLOW_STAGE).find(
        ([, v]) => v === expectedStage,
      )?.[1];
      expect(stageKey).toBe(expectedStage);
      expect(MNR_DB_STATUS_TO_STAGE[dbStatus]).toBe(expectedStage);
    });

    it('has all required legacy status codes', () => {
      const requiredStatusCodes = ['DR', 'SU', 'CK', 'AP', 'IS', 'IR', 'WI', 'FR', 'WF',
        'RW', 'RS', 'RC', 'RA', 'RV', 'AC', 'AA', 'RJ', 'CA', 'CC', 'CL', 'RE', 'RR'];
      for (const code of requiredStatusCodes) {
        expect(MNR_DB_STATUS_TO_STAGE[code]).toBeDefined();
      }
    });
  });

  describe('action labels are complete', () => {
    it.each(MNR_EXPECTED_ACTIONS)('action %s has a label', (action) => {
      expect(MNR_STAGE_LABEL).toBeDefined();
    });
  });
});
