const PARENTHESIZED_ORIGINAL_PATTERN = /\s*\(Original:\s*([^)]+?)\)\s*/gi;
const BARE_ORIGINAL_PATTERN = /\bOriginal:\s*([^\r\n]+)\s*/i;

export function extractOriginalFilenameMarker(remarks?: string | null): string | null {
  if (!remarks) return null;

  const parenthesizedMatches = [...remarks.matchAll(PARENTHESIZED_ORIGINAL_PATTERN)];
  const parenthesizedOriginal = parenthesizedMatches.at(-1)?.[1]?.trim();
  if (parenthesizedOriginal) {
    return parenthesizedOriginal;
  }

  const bareMatch = remarks.match(BARE_ORIGINAL_PATTERN);
  return bareMatch?.[1]?.trim() || null;
}

export function stripOriginalFilenameMarker(remarks?: string | null): string {
  if (!remarks) return '';

  const withoutParenthesized = remarks.replace(PARENTHESIZED_ORIGINAL_PATTERN, ' ');
  const withoutBare = withoutParenthesized.replace(BARE_ORIGINAL_PATTERN, ' ');

  return withoutBare.replace(/\s+/g, ' ').trim();
}

export function formatAttachmentRemarks(
  remarks?: string | null,
  originalFilename?: string | null,
  fallbackOriginalFilename?: string | null,
): string | null {
  const baseRemarks = stripOriginalFilenameMarker(remarks);
  const resolvedOriginalName =
    originalFilename?.trim() ||
    fallbackOriginalFilename?.trim() ||
    extractOriginalFilenameMarker(remarks) ||
    null;

  if (!resolvedOriginalName) {
    return baseRemarks || null;
  }

  return baseRemarks
    ? `${baseRemarks} (Original: ${resolvedOriginalName})`
    : `Original: ${resolvedOriginalName}`;
}

