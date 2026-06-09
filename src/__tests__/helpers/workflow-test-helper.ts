/**
 * Workflow test utilities — reusable patterns for testing workflow constants
 * across all modules. Provides factories for parameterized tests.
 */

import { describe, expect, it } from 'vitest';

/**
 * Create a parameterized test suite that validates all stage definitions
 * have the expected structure (code, name, label, status).
 */
export function runStageDefinitionTests<
  T extends string,
  U extends { code: string; name: T; label: string; status: string },
>(
  moduleName: string,
  definitions: Record<string, U>,
  expectedStages: readonly T[],
) {
  describe(`${moduleName} stage definitions`, () => {
    const stageKeys = Object.keys(definitions);

    it.each(stageKeys)('stage code %s has a complete definition', (code) => {
      const def = definitions[code];
      expect(def).toBeDefined();
      expect(def.code).toBe(code);
      expect(def.name).toBeTruthy();
      expect(def.label).toBeTruthy();
      expect(def.status).toBeTruthy();
    });

    it(`has all ${expectedStages.length} expected stages`, () => {
      const stageNames = stageKeys.map((k) => definitions[k]?.name).filter(Boolean);
      for (const stage of expectedStages) {
        expect(stageNames).toContain(stage);
      }
    });
  });
}

/**
 * Create parameterized tests for legacy DB status-to-stage mappings.
 */
export function runLegacyStatusMappingTests<TStage extends string>(
  moduleName: string,
  mapping: Record<string, TStage>,
  expectedMappings: Array<[string, TStage]>,
) {
  describe(`${moduleName} legacy status mappings`, () => {
    it.each(expectedMappings)('maps status %s to stage %s', (dbStatus, expectedStage) => {
      expect(mapping[dbStatus]).toBe(expectedStage);
    });
  });
}

/**
 * Create parameterized tests for action label mappings.
 */
export function runActionLabelTests<TAction extends string>(
  moduleName: string,
  actionEnum: Record<string, TAction>,
  labels: Record<TAction, string>,
) {
  describe(`${moduleName} action labels`, () => {
    const actions = Object.values(actionEnum);

    it.each(actions)('action %s has a label', (action) => {
      expect(labels[action]).toBeTruthy();
      expect(typeof labels[action]).toBe('string');
    });
  });
}
