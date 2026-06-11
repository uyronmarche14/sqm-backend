import { describe, expect, it } from 'vitest';
import {
  extractOriginalFilenameMarker,
  formatAttachmentRemarks,
  stripOriginalFilenameMarker,
} from '../../src/shared/utils/attachment-remarks.js';

describe('attachment remark helpers', () => {
  it('strips and restores a single original filename marker', () => {
    expect(stripOriginalFilenameMarker('Root cause note (Original: report.pdf)')).toBe('Root cause note');
    expect(formatAttachmentRemarks('Root cause note (Original: report.pdf)', 'report.pdf')).toBe(
      'Root cause note (Original: report.pdf)',
    );
  });

  it('preserves the previous original filename when only remarks are edited', () => {
    expect(
      formatAttachmentRemarks('Updated note', undefined, extractOriginalFilenameMarker('Old note (Original: audit.xlsx)')),
    ).toBe('Updated note (Original: audit.xlsx)');
  });

  it('supports legacy non-parenthesized markers without duplicating them', () => {
    expect(extractOriginalFilenameMarker('Original: finding.docx')).toBe('finding.docx');
    expect(formatAttachmentRemarks('Original: finding.docx', 'finding.docx')).toBe('Original: finding.docx');
  });
});

