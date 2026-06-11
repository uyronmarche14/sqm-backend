import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to automatically parse JSON string fields from FormData.
 * 
 * When frontend sends FormData with JSON-stringified objects (e.g., nonConformity, 
 * disposition, ccList), this middleware parses them back to objects before 
 * validation schemas process them.
 * 
 * Usage: Apply this middleware BEFORE multer upload middleware on routes that 
 * expect FormData with nested JSON objects.
 * 
 * @example
 * router.post('/', parseFormDataJson, upload.any(), controller.create);
 */

// Fields that should be auto-parsed as JSON
const JSON_FIELDS = [
  'nonConformity',
  'non_conformity',
  'response8D',
  'response_8d',
  'disposition',
  'disposition_data',
  'approval',
  'ccList',
  'cc_list',
  'copiedUsers',
  'attachments',
  'defects',
  'parts',
  'action_items',
  'check_items',
  'visual_categories',
  'data_categories',
  'dimension_categories',
  'main_documents',
  'appendix_documents',
  'cc_list',
  'lots'
];

/**
 * Safely parse a JSON string, returning null if parsing fails
 */
function safeJsonParse(str: string): unknown | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

/**
 * Check if a value looks like a JSON string (starts with { or [)
 */
function looksLikeJson(value: string): boolean {
  const trimmed = value.trim();
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
         (trimmed.startsWith('[') && trimmed.endsWith(']'));
}

/**
 * Parse FormData JSON middleware
 */
export function parseFormDataJson(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // Only process if we have a body
  if (!req.body || typeof req.body !== 'object') {
    return next();
  }

  // Parse known JSON fields
  for (const field of JSON_FIELDS) {
    const value = req.body[field];
    if (typeof value === 'string' && looksLikeJson(value)) {
      const parsed = safeJsonParse(value);
      if (parsed !== null) {
        req.body[field] = parsed;
      }
    }
  }

  // Also check for any field ending with _json that should be parsed
  for (const [key, value] of Object.entries(req.body)) {
    if (key.endsWith('_json') && typeof value === 'string') {
      const parsed = safeJsonParse(value);
      if (parsed !== null) {
        req.body[key] = parsed;
      }
    }
  }

  next();
}

/**
 * Factory to create a field-specific JSON parser
 * Use when you only need specific fields parsed
 */
export function createJsonParserForFields(fields: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.body || typeof req.body !== 'object') {
      return next();
    }

    for (const field of fields) {
      const value = req.body[field];
      if (typeof value === 'string' && looksLikeJson(value)) {
        const parsed = safeJsonParse(value);
        if (parsed !== null) {
          req.body[field] = parsed;
        }
      }
    }

    next();
  };
}
