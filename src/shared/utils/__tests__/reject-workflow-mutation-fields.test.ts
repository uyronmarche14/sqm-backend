import { describe, expect, it } from 'vitest';
import { assertNoWorkflowMutationFields } from '../reject-workflow-mutation-fields.js';
import { BadRequestError } from '../../errors/AppError.js';

describe('assertNoWorkflowMutationFields', () => {
  describe('default forbidden fields (status, request_status)', () => {
    it('throws when status is present with a meaningful value', () => {
      expect(() => assertNoWorkflowMutationFields({ status: 'APR' }, 'MNR')).toThrow(BadRequestError);
    });

    it('throws when request_status is present with a meaningful value', () => {
      expect(() => assertNoWorkflowMutationFields({ request_status: 'DR' }, 'MNR')).toThrow(BadRequestError);
    });

    it('passes when status is undefined', () => {
      expect(() => assertNoWorkflowMutationFields({ field: 'value' }, 'MNR')).not.toThrow();
    });

    it('passes when status is null', () => {
      expect(() => assertNoWorkflowMutationFields({ status: null, field: 'value' }, 'MNR')).not.toThrow();
    });

    it('passes when status is an empty string', () => {
      expect(() => assertNoWorkflowMutationFields({ status: '', field: 'value' }, 'MNR')).not.toThrow();
    });

    it('passes for payload with non-protected fields only', () => {
      expect(() =>
        assertNoWorkflowMutationFields({ remarks: 'updated', file_name: 'report.pdf' }, 'MNR'),
      ).not.toThrow();
    });
  });

  describe('custom forbidden fields', () => {
    it('throws when custom field is present', () => {
      expect(() =>
        assertNoWorkflowMutationFields({ stage: 'APPROVED' }, '5M1E', ['status', 'stage']),
      ).toThrow(BadRequestError);
    });

    it('throws for standard fields even with custom list', () => {
      expect(() =>
        assertNoWorkflowMutationFields({ status: 'AP' }, '5M1E', ['status', 'stage']),
      ).toThrow(BadRequestError);
    });

    it('passes when custom forbidden field is not present', () => {
      expect(() =>
        assertNoWorkflowMutationFields({ remarks: 'test' }, '5M1E', ['status', 'stage']),
      ).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('passes when payload is undefined', () => {
      expect(() => assertNoWorkflowMutationFields(undefined, 'MNR')).not.toThrow();
    });

    it('passes when payload is null', () => {
      expect(() => assertNoWorkflowMutationFields(null as unknown as Record<string, unknown>, 'MNR')).not.toThrow();
    });

    it('passes when payload is empty object', () => {
      expect(() => assertNoWorkflowMutationFields({}, 'MNR')).not.toThrow();
    });

    it('treats boolean false as meaningful and throws', () => {
      expect(() => assertNoWorkflowMutationFields({ status: false }, 'MNR')).toThrow(BadRequestError);
    });

    it('treats number 0 as meaningful and throws', () => {
      expect(() => assertNoWorkflowMutationFields({ status: 0 }, 'MNR')).toThrow(BadRequestError);
    });

    it('passes whitespace-only string', () => {
      expect(() => assertNoWorkflowMutationFields({ status: '   ' }, 'MNR')).not.toThrow();
    });
  });

  describe('module-specific error messages', () => {
    it('includes module name in error message', () => {
      expect(() => assertNoWorkflowMutationFields({ status: 'APR' }, 'SQPR')).toThrow(/SQPR/);
      expect(() => assertNoWorkflowMutationFields({ status: 'APR' }, 'OGI')).toThrow(/OGI/);
      expect(() => assertNoWorkflowMutationFields({ status: 'APR' }, 'NPI')).toThrow(/NPI/);
    });
  });
});
