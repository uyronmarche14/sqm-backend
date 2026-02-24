/**
 * Logger Utility Tests
 * 
 * Tests for the Winston-based structured logger
 */

import logger from '../../utils/logger.js';

describe('Logger Utility', () => {
  it('should have all required log methods', () => {
    expect(logger.error).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.info).toBeDefined();
    expect(logger.debug).toBeDefined();
    expect(logger.http).toBeDefined();
  });

  it('should log error messages without throwing', () => {
    expect(() => {
      logger.error('Test error message', {
        correlationId: 'test-123',
        userId: 'user-456',
      });
    }).not.toThrow();
  });

  it('should log info messages without throwing', () => {
    expect(() => {
      logger.info('Test info message', {
        operation: 'test-operation',
        controlNo: 'P-2026-001',
      });
    }).not.toThrow();
  });

  it('should log debug messages without throwing', () => {
    expect(() => {
      logger.debug('Test debug message', {
        table: 'qmqa_records',
        recordId: '123',
      });
    }).not.toThrow();
  });

  it('should handle logging with error objects', () => {
    const testError = new Error('Test error');
    expect(() => {
      logger.error('Error occurred', {
        error: testError,
        statusCode: 500,
      });
    }).not.toThrow();
  });

  it('should handle logging without metadata', () => {
    expect(() => {
      logger.info('Simple log message');
    }).not.toThrow();
  });
});
