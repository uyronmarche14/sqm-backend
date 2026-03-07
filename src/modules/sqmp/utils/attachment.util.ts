/**
 * Sanitizes attachment remarks by ensuring the original filename is appended
 * conditionally if it is not already present, following DRY principles.
 * 
 * @param remarks The original remarks input from the payload
 * @param originalFilename The original filename extracted from the uploaded file buffer
 * @returns The sanitized remarks string ready for database insertion
 */
export function sanitizeAttachmentRemarks(
  remarks: string | undefined | null,
  originalFilename: string | undefined | null
): string {
  let finalRemarks = remarks || '';
  if (!originalFilename) return finalRemarks;

  const originalNameTrimmed = originalFilename.trim();
  const originalLower = originalNameTrimmed.toLowerCase();
  const remarksLower = finalRemarks.toLowerCase();

  // Support both legacy outputs from differing older implementations to prevent endless concatenation
  const hasParenthesis = remarksLower.includes(`(original: ${originalLower})`);
  const hasNoParenthesis = remarksLower.includes(`original: ${originalLower}`);

  if (!hasParenthesis && !hasNoParenthesis) {
    finalRemarks = finalRemarks 
      ? `${finalRemarks} (Original: ${originalNameTrimmed})` 
      : `Original: ${originalNameTrimmed}`;
  }

  return finalRemarks;
}
