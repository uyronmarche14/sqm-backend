import { describe, expect, it } from 'vitest';
import {
  SQMP_STAGE_CODE,
  SQMP_WORKFLOW_STAGE,
  SQMP_WORKFLOW_STAGE_DEFINITION,
  SQMP_WORKFLOW_ACTION,
  SQMP_WORKFLOW_ACTION_LABEL,
  SQMP_REOPENABLE_RESPONSE_STAGE_CODES,
} from '../workflow.constants.js';

const SQMP_EXPECTED_STAGES = [
  SQMP_WORKFLOW_STAGE.CLOSED,
  SQMP_WORKFLOW_STAGE.DRAFT,
  SQMP_WORKFLOW_STAGE.CHECKER,
  SQMP_WORKFLOW_STAGE.APPROVER,
  SQMP_WORKFLOW_STAGE.REJECTED_BY_CHECKER,
  SQMP_WORKFLOW_STAGE.REJECTED_BY_APPROVER,
  SQMP_WORKFLOW_STAGE.CANCELLED,
  SQMP_WORKFLOW_STAGE.ISSUER,
  SQMP_WORKFLOW_STAGE.SUPPLIER,
  SQMP_WORKFLOW_STAGE.ISSUER_2ND,
  SQMP_WORKFLOW_STAGE.CHECKER_2ND,
  SQMP_WORKFLOW_STAGE.APPROVER_2ND,
  SQMP_WORKFLOW_STAGE.ISSUER_3RD,
  SQMP_WORKFLOW_STAGE.REJECTED_BY_CHECKER_2ND,
  SQMP_WORKFLOW_STAGE.REJECTED_BY_APPROVER_2ND,
  SQMP_WORKFLOW_STAGE.NOT_ACCEPTED_BY_ISSUER,
];

const SQMP_EXPECTED_ACTIONS = [
  SQMP_WORKFLOW_ACTION.SUBMIT_MAIN,
  SQMP_WORKFLOW_ACTION.CHECK_MAIN,
  SQMP_WORKFLOW_ACTION.APPROVE_MAIN,
  SQMP_WORKFLOW_ACTION.REJECT_MAIN,
  SQMP_WORKFLOW_ACTION.ISSUE_MAIN,
  SQMP_WORKFLOW_ACTION.CANCEL_MAIN,
  SQMP_WORKFLOW_ACTION.SAVE_RESPONSE,
  SQMP_WORKFLOW_ACTION.SUBMIT_RESPONSE,
  SQMP_WORKFLOW_ACTION.SAVE_CLOSURE,
  SQMP_WORKFLOW_ACTION.SUBMIT_CLOSURE,
  SQMP_WORKFLOW_ACTION.CHECK_CLOSURE,
  SQMP_WORKFLOW_ACTION.APPROVE_CLOSURE,
  SQMP_WORKFLOW_ACTION.REJECT_CLOSURE,
  SQMP_WORKFLOW_ACTION.ACCEPT_CLOSURE,
  SQMP_WORKFLOW_ACTION.NOT_ACCEPT_CLOSURE,
];

describe('SQMP Workflow Constants', () => {
  describe('version parity', () => {
    it('has matching stage codes and workflow stage enums', () => {
      const codeKeys = Object.keys(SQMP_STAGE_CODE).filter(k => isNaN(Number(k)));
      const stageKeys = Object.keys(SQMP_WORKFLOW_STAGE).filter(k => isNaN(Number(k)));
      expect(codeKeys.sort()).toEqual(stageKeys.sort());
    });

    it('stage count matches between codes and definitions', () => {
      expect(Object.keys(SQMP_WORKFLOW_STAGE_DEFINITION).length).toBe(SQMP_EXPECTED_STAGES.length);
    });

    it('action count matches between enum and labels', () => {
      const actionKeys = Object.keys(SQMP_WORKFLOW_ACTION).filter(k => k !== 'length');
      expect(actionKeys.length).toBe(SQMP_EXPECTED_ACTIONS.length);
    });
  });

  describe('stage definitions have complete data', () => {
    it.each(Object.keys(SQMP_WORKFLOW_STAGE_DEFINITION))('stage code %s is complete', (code) => {
      const def = SQMP_WORKFLOW_STAGE_DEFINITION[code];
      expect(def.code).toBe(code);
      expect(def.name).toBeTruthy();
      expect(def.label).toBeTruthy();
      expect(def.status).toBeTruthy();
    });
  });

  describe('stage codes are consistent', () => {
    const codeKeys = Object.keys(SQMP_STAGE_CODE).filter(k => isNaN(Number(k)));
    const defKeys = Object.keys(SQMP_WORKFLOW_STAGE_DEFINITION);

    it.each(codeKeys)('stage code key %s exists in definition', (key) => {
      const code = SQMP_STAGE_CODE[key as keyof typeof SQMP_STAGE_CODE];
      expect(defKeys).toContain(code);
      expect(SQMP_WORKFLOW_STAGE_DEFINITION[code]?.code).toBe(code);
    });
  });

  describe('stage names match expected values', () => {
    it.each(SQMP_EXPECTED_STAGES)('defines stage %s', (stageName) => {
      const found = Object.values(SQMP_WORKFLOW_STAGE_DEFINITION).find(d => d.name === stageName);
      expect(found).toBeDefined();
    });
  });

  describe('action labels are complete', () => {
    it.each(SQMP_EXPECTED_ACTIONS)('action %s has a label', (action) => {
      expect(SQMP_WORKFLOW_ACTION_LABEL[action]).toBeTruthy();
      expect(typeof SQMP_WORKFLOW_ACTION_LABEL[action]).toBe('string');
    });
  });

  describe('response cycle reopenable stage codes', () => {
    it('has reopenable response stages defined', () => {
      expect(SQMP_REOPENABLE_RESPONSE_STAGE_CODES.size).toBeGreaterThan(0);
    });
  });
});
