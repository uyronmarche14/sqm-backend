import { describe, expect, it } from 'vitest';
import {
  QMQA_WORKFLOW_STAGE,
  QMQA_LEGACY_STAGE_CODE,
  QMQA_WORKFLOW_ACTION,
  QMQA_STAGE_LABEL,
} from '../qmqa-workflow.constants.js';

const QMQA_EXPECTED_STAGES = [
  QMQA_WORKFLOW_STAGE.ACCEPT,
  QMQA_WORKFLOW_STAGE.DRAFT,
  QMQA_WORKFLOW_STAGE.CHECKER,
  QMQA_WORKFLOW_STAGE.APPROVER,
  QMQA_WORKFLOW_STAGE.REJECT_CHECKER,
  QMQA_WORKFLOW_STAGE.REJECT_APPROVER,
  QMQA_WORKFLOW_STAGE.CANCEL,
  QMQA_WORKFLOW_STAGE.ISSUER,
  QMQA_WORKFLOW_STAGE.SUPPLIER,
  QMQA_WORKFLOW_STAGE.REJECT_SUPPLIER,
  QMQA_WORKFLOW_STAGE.INITIAL_RESPONSE,
  QMQA_WORKFLOW_STAGE.FINAL_RESPONSE,
  QMQA_WORKFLOW_STAGE.ISSUER_2ND,
  QMQA_WORKFLOW_STAGE.CHECKER_2ND,
  QMQA_WORKFLOW_STAGE.APPROVER_2ND,
  QMQA_WORKFLOW_STAGE.ISSUER_3RD,
  QMQA_WORKFLOW_STAGE.REJECT_ISSUER_2ND,
  QMQA_WORKFLOW_STAGE.REJECT_CHECKER_2ND,
  QMQA_WORKFLOW_STAGE.REJECT_APPROVER_2ND,
  QMQA_WORKFLOW_STAGE.NOT_ACCEPT,
];

describe('QMQA Workflow Constants', () => {
  describe('version parity', () => {
    it('stage count matches expected', () => {
      const stageKeys = Object.keys(QMQA_WORKFLOW_STAGE).filter(k => isNaN(Number(k)));
      expect(stageKeys.length).toBe(QMQA_EXPECTED_STAGES.length);
    });

    it('legacy stage codes cover all stages', () => {
      const stageKeys = Object.keys(QMQA_WORKFLOW_STAGE).filter(k => isNaN(Number(k)));
      expect(Object.keys(QMQA_LEGACY_STAGE_CODE).length).toBe(stageKeys.length);
    });
  });

  describe('stage labels are complete', () => {
    it.each(QMQA_EXPECTED_STAGES)('stage %s has a label', (stage) => {
      expect(QMQA_STAGE_LABEL[stage]).toBeTruthy();
      expect(typeof QMQA_STAGE_LABEL[stage]).toBe('string');
    });
  });

  describe('legacy stage codes are complete', () => {
    it.each(QMQA_EXPECTED_STAGES)('stage %s has a legacy code', (stage) => {
      expect(QMQA_LEGACY_STAGE_CODE[stage]).toBeTruthy();
      expect(typeof QMQA_LEGACY_STAGE_CODE[stage]).toBe('string');
    });
  });

  describe('action labels', () => {
    it('has actions defined', () => {
      const actionKeys = Object.keys(QMQA_WORKFLOW_ACTION);
      expect(actionKeys.length).toBeGreaterThan(0);
    });

    it.each(Object.keys(QMQA_WORKFLOW_ACTION))('action key %s is defined', (key) => {
      expect(QMQA_WORKFLOW_ACTION[key as keyof typeof QMQA_WORKFLOW_ACTION]).toBeTruthy();
    });
  });
});
