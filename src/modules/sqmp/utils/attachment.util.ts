import { formatAttachmentRemarks } from '../../../shared/utils/attachment-remarks.js';

export function sanitizeAttachmentRemarks(
  remarks: string | undefined | null,
  originalFilename: string | undefined | null
): string {
  return formatAttachmentRemarks(remarks, originalFilename) || '';
}
