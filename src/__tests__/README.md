# Backend Testing Infrastructure

This directory contains the testing infrastructure for the QMQA backend module.

## Setup

The testing infrastructure includes:

- **Jest**: Testing framework with TypeScript support via ts-jest
- **Fast-check**: Property-based testing library
- **Supertest**: HTTP assertion library for API testing
- **Winston**: Structured logging library

## Directory Structure

```
src/__tests__/
├── setup.ts              # Global test setup and configuration
├── unit/                 # Unit tests for individual functions/modules
│   └── logger.test.ts    # Logger utility tests
├── integration/          # Integration tests for complete workflows
└── property/             # Property-based tests
    └── generators/       # Data generators for property tests
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Configuration

- **jest.config.js**: Jest configuration with TypeScript and ESM support
- **tsconfig.json**: TypeScript configuration for the project
- **setup.ts**: Global test setup that runs before all tests

## Writing Tests

### Unit Tests

Place unit tests in `src/__tests__/unit/` directory:

```typescript
import { myFunction } from '../../utils/my-module.js';

describe('My Module', () => {
  it('should do something', () => {
    expect(myFunction()).toBe(expected);
  });
});
```

### Property-Based Tests

Place property tests in `src/__tests__/property/` directory:

```typescript
import * as fc from 'fast-check';

describe('Property: My Property', () => {
  it('should hold for all inputs', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        // Property assertion
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
```

### Integration Tests

Place integration tests in `src/__tests__/integration/` directory:

```typescript
import request from 'supertest';
import app from '../../app.js';

describe('API Integration', () => {
  it('should handle complete workflow', async () => {
    const response = await request(app)
      .post('/api/endpoint')
      .send(data);
    
    expect(response.status).toBe(200);
  });
});
```

## Structured Logging

The logger utility (`src/utils/logger.ts`) provides structured logging with Winston:

```typescript
import logger from '../utils/logger.js';

// Log with structured metadata
logger.info('Workflow transition', {
  correlationId: 'req-123',
  userId: 'user-456',
  controlNo: 'P-2026-001',
  fromStatus: 'DRAFT',
  toStatus: 'AWAITING_APPROVAL',
});

// Log errors with stack traces
logger.error('Database operation failed', {
  error: err,
  operation: 'insert',
  table: 'qmqa_records',
});
```

### Log Levels

- **error**: Error events that might still allow the application to continue
- **warn**: Warning events that might lead to errors
- **info**: Informational messages about application progress
- **debug**: Detailed information for debugging (only in development)
- **http**: HTTP request/response logging

### Log Configuration

- **Development**: Colorized console output with pretty formatting
- **Production**: JSON format for log aggregation tools
- **Test**: Error level only to reduce noise

### Log Files

Logs are written to:
- `logs/error.log`: Error level logs only
- `logs/combined.log`: All log levels

## Environment Variables

- `NODE_ENV`: Set to 'test' during testing
- `LOG_LEVEL`: Override default log level (error, warn, info, debug)

## Coverage

Coverage reports are generated in the `coverage/` directory and include:
- Text summary in console
- HTML report for browser viewing
- LCOV format for CI/CD integration

Target coverage: 80% for business logic utilities
