/**
 * Standardized API Response Helper
 * ==================================
 * Ensures consistent response format across all modules:
 * { success: boolean, data: T, message?: string, error?: string }
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
}

/**
 * Success response wrapper
 */
export function successResponse<T>(data: T, message?: string, meta?: ApiResponse['meta']): ApiResponse<T> {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  if (message) response.message = message;
  if (meta) response.meta = meta;
  return response;
}

/**
 * Error response wrapper
 */
export function errorResponse(message: string, error?: string): ApiResponse {
  return {
    success: false,
    error: error || message,
    message,
  };
}

/**
 * List response wrapper with pagination metadata
 */
export function listResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): ApiResponse<T[]> {
  return {
    success: true,
    data: items,
    meta: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Create response wrapper (returns the created entity with its ID)
 */
export function createResponse<T extends { id: string }>(
  data: T,
  message = 'Record created successfully'
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Update response wrapper
 */
export function updateResponse<T>(
  data: T,
  message = 'Record updated successfully'
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Delete response wrapper
 */
export function deleteResponse(
  id: string,
  message = 'Record deleted successfully'
): ApiResponse<{ id: string }> {
  return {
    success: true,
    data: { id },
    message,
  };
}
