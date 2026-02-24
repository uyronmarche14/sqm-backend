/**
 * Validation Middleware Integration Tests
 * Tests validation middleware with QMQA routes
 */

import request from 'supertest';
import express from 'express';
import { validateRequest } from '../middleware/validation.middleware.js';
import { errorHandler } from '../middleware/error-handler.middleware.js';
import { qmqaScheduleSchema, qmqaAuditPlanSchema } from '../schemas/qmqa.schema.js';

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Test route with schedule validation
  app.post('/test/schedule', 
    validateRequest({ body: qmqaScheduleSchema }),
    (req, res) => {
      res.status(200).json({ success: true, data: req.body });
    }
  );
  
  // Test route with audit plan validation
  app.post('/test/audit',
    validateRequest({ body: qmqaAuditPlanSchema }),
    (req, res) => {
      res.status(200).json({ success: true, data: req.body });
    }
  );
  
  // Error handler
  app.use(errorHandler);
  
  return app;
};

describe('Validation Middleware Integration', () => {
  let app;
  
  beforeEach(() => {
    app = createTestApp();
  });
  
  describe('Schedule Validation', () => {
    test('should accept valid schedule data', async () => {
      const validData = {
        mfgSiteId: 'site-123',
        categoryId: 'cat-456',
        sqePicId: 'user-789',
        supplierId: 'sup-012',
        auditPlanDate: '2026-03-15',
        remarks: 'Test schedule'
      };
      
      const response = await request(app)
        .post('/test/schedule')
        .send(validData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(validData);
    });
    
    test('should reject schedule with missing required fields', async () => {
      const invalidData = {
        mfgSiteId: 'site-123',
        // Missing categoryId, sqePicId, supplierId, auditPlanDate
      };
      
      const response = await request(app)
        .post('/test/schedule')
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.name).toBe('ValidationError');
      expect(response.body.error.message).toBe('Validation failed');
    });
    
    test('should reject schedule with empty required fields', async () => {
      const invalidData = {
        mfgSiteId: '',
        categoryId: '',
        sqePicId: '',
        supplierId: '',
        auditPlanDate: ''
      };
      
      const response = await request(app)
        .post('/test/schedule')
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    test('should accept schedule without optional remarks', async () => {
      const validData = {
        mfgSiteId: 'site-123',
        categoryId: 'cat-456',
        sqePicId: 'user-789',
        supplierId: 'sup-012',
        auditPlanDate: '2026-03-15'
        // No remarks - optional field
      };
      
      const response = await request(app)
        .post('/test/schedule')
        .send(validData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });
  });
  
  describe('Audit Plan Validation', () => {
    test('should accept valid audit plan data', async () => {
      const validData = {
        mfgSiteId: 'site-123',
        supplierId: 'sup-012',
        categoryId: 'cat-456',
        auditPlanDate: '2026-03-15',
        sqePicId: 'user-789',
        auditTypeId: 'type-001'
      };
      
      const response = await request(app)
        .post('/test/audit')
        .send(validData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(validData);
    });
    
    test('should reject audit plan with missing required fields', async () => {
      const invalidData = {
        mfgSiteId: 'site-123',
        supplierId: 'sup-012'
        // Missing categoryId, auditPlanDate, sqePicId, auditTypeId
      };
      
      const response = await request(app)
        .post('/test/audit')
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.name).toBe('ValidationError');
    });
    
    test('should accept audit plan with optional fields', async () => {
      const validData = {
        mfgSiteId: 'site-123',
        supplierId: 'sup-012',
        categoryId: 'cat-456',
        auditPlanDate: '2026-03-15',
        sqePicId: 'user-789',
        auditTypeId: 'type-001',
        remarks: 'Optional remarks',
        scheduleId: 'schedule-123',
        controlNo: 'P-2026-001'
      };
      
      const response = await request(app)
        .post('/test/audit')
        .send(validData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(validData);
    });
  });
});
