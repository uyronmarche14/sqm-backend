# Correlation ID Middleware Usage

## Overview

The correlation ID middleware automatically generates or extracts a unique identifier for each request, enabling request tracing across the application and in logs.

## Integration

### 1. Add to Express App

In your `app.js` or main application file, add the middleware early in the middleware chain:

```javascript
import express from 'express';
import { correlationIdMiddleware } from './middleware/correlation-id.middleware.js';

const app = express();

// Add correlation ID middleware early (before routes)
app.use(correlationIdMiddleware);

// ... other middleware and routes
```

### 2. Using Correlation ID in Controllers

The correlation ID is automatically attached to the request object:

```javascript
export const createQMQA = async (req, res, next) => {
  try {
    const correlationId = req.correlationId;
    
    // Pass to service layer
    const result = await qmqaService.createRecord(req.body, req.user.id, correlationId);
    
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
```

### 3. Using Correlation ID in Services

Services can accept and use the correlation ID for logging:

```javascript
export const createRecord = async (data, userId, correlationId) => {
  logger.info('Creating QMQA record', {
    operation: 'createRecord',
    userId,
    correlationId,
    timestamp: new Date().toISOString()
  });
  
  // ... business logic
};
```

### 4. Client-Side Usage

Clients can send a correlation ID in the request header:

```javascript
// JavaScript/TypeScript client
fetch('/api/qmqa/records', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-correlation-id': 'custom-correlation-id-123'
  },
  body: JSON.stringify(data)
});
```

If no correlation ID is provided, the middleware will generate one automatically.

### 5. Response Headers

The correlation ID is automatically included in response headers:

```
x-correlation-id: 550e8400-e29b-41d4-a716-446655440000
```

Clients can use this to track requests and report issues.

## Benefits

1. **Request Tracing**: Track a single request across multiple services and log entries
2. **Debugging**: Quickly find all logs related to a specific request
3. **Error Reporting**: Include correlation ID in error reports for easier troubleshooting
4. **Monitoring**: Aggregate metrics and traces by correlation ID
5. **Client Tracking**: Clients can provide their own correlation IDs for end-to-end tracing

## Log Format

All logs will include the correlation ID:

```json
{
  "level": "info",
  "message": "Workflow transition: Submit for approval",
  "operation": "submitForApproval",
  "controlNo": "P-2026-001",
  "userId": "user-123",
  "fromStatus": "DRAFT",
  "toStatus": "AWAITING_APPROVAL",
  "timestamp": "2026-02-19T10:30:00.000Z",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Best Practices

1. **Always pass correlation ID**: When calling services or repositories, pass the correlation ID from the request
2. **Include in error logs**: Always include correlation ID when logging errors
3. **Use in external API calls**: Pass correlation ID to external services for distributed tracing
4. **Document in API**: Document the `x-correlation-id` header in your API documentation
5. **Monitor correlation IDs**: Set up monitoring to track request flows using correlation IDs
