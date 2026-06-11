/**
 * NPI Controller (Refactored)
 * Handles HTTP requests for NPI module using clean service architecture
 */

import { Request, Response, NextFunction } from 'express';
import { NpiCrudService } from './services/NpiCrudService.js';
import { NpiWorkflowService } from './services/NpiWorkflowService.js';
import { NpiRepository } from './npi.repository.js';
import { NpiMapper } from './services/NpiMapper.js';
import { NpiCreateSchema, NpiUpdateSchema, NpiIdParamSchema, NpiActionSchema, NpiAttachmentParamSchema } from './npi.schema.js';
import { successResponse, createResponse } from '../../shared/utils/api-response.js';
import { attachmentService } from '../../shared/services/attachment.service.js';

// Initialize services
const repository = new NpiRepository();
const mapper = new NpiMapper();
const crudService = new NpiCrudService(repository, mapper);
const workflowService = new NpiWorkflowService(repository);

export class NpiController {
  
  /**
   * GET /api/npi
   * Get all NPI records
   */
  async getAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const records = await crudService.getAllRecords();
      res.json(successResponse(records));
    } catch (error) {
      console.error('[NPI] GET ALL error:', error);
      return next(error);
    }
  }

  /**
   * GET /api/npi/:id
   * Get single NPI record by ID
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = NpiIdParamSchema.parse({ params: req.params }).params;
      const record = await crudService.getRecordById(id);
      res.json(successResponse(record));
    } catch (error) {
      console.error('[NPI] GET BY ID error:', error);
      return next(error);
    }
  }

  /**
   * POST /api/npi
   * Create new NPI record
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = NpiCreateSchema.parse({ body: req.body }).body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const files = (req as any).files || [];
      
      const result = await crudService.createRecord(payload, userId, files);
      res
        .status(201)
        .json(createResponse(result.data || { id: 'new' }, result.message));
      return;
    } catch (error) {
      console.error('[NPI] CREATE error:', error);
      return next(error);
    }
  }

  /**
   * PUT /api/npi/:id
   * Update existing NPI record
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = NpiUpdateSchema.parse({ params: req.params, body: req.body });
      const { id } = parsed.params;
      const payload = parsed.body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const files = (req as any).files || [];

      const result = await crudService.updateRecord(id, payload, userId, files);
      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[NPI] UPDATE error:', error);
      return next(error);
    }
  }

  /**
   * DELETE /api/npi/:id
   * Delete NPI record
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = NpiIdParamSchema.parse({ params: req.params }).params;
      const result = await crudService.deleteRecord(id);
      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[NPI] DELETE error:', error);
      return next(error);
    }
  }

  /**
   * GET /api/npi/stats
   * Get statistics by status
   */
  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { db } = await import('../../shared/infrastructure/db.js');
      const stats = await db.selectFrom('NPI_LOTS')
        .select(['request_status as status', db.fn.count('npi_lot_id').as('count')])
        .groupBy('request_status')
        .execute();

      res.json(successResponse(stats));
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /api/npi/sequence
   * Generate next sequence number
   */
  async generateSequence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const siteId = req.query.siteId as string;
      if (!siteId) {
        res.status(400).json({ message: 'Site Code required' });
        return;
      }
      
      const sequence = await crudService.generateSequence(siteId);
      res.json(successResponse({ sequence }));
      return;
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /api/npi/:id/attachments/:attachmentId
   * Download attachment
   */
  async downloadAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { attachmentId } = NpiAttachmentParamSchema.parse({ params: req.params }).params;
      const { filePath, fileName, mimeType } = await attachmentService.downloadAttachment(
        'npi-main', 
        attachmentId as string
      );
      
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.download(filePath);
      return;
    } catch (error) {
      console.error('[NPI] DOWNLOAD error:', error);
      return next(error);
    }
  }

  // ============================================================================
  // Workflow Actions
  // ============================================================================

  /**
   * POST /api/npi/:id/submit
   * Submit record for approval
   */
  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = NpiActionSchema.parse({ params: req.params, body: req.body }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      
      const result = await workflowService.submitForApproval(id, userId);
      res.json(successResponse(result.data || result, result.message));
      return;
    } catch (error) {
      console.error('[NPI] SUBMIT error:', error);
      return next(error);
    }
  }

  /**
   * POST /api/npi/:id/check
   * Check record (checker approval)
   */
  async check(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = NpiActionSchema.parse({ params: req.params, body: req.body }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const remarks = req.body?.remarks;
      
      const result = await workflowService.checkRecord(id, userId, remarks);
      res.json(successResponse(result.data || result, result.message));
      return;
    } catch (error) {
      console.error('[NPI] CHECK error:', error);
      return next(error);
    }
  }

  /**
   * POST /api/npi/:id/approve
   * Approve record (approver approval)
   */
  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = NpiActionSchema.parse({ params: req.params, body: req.body }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const remarks = req.body?.remarks;
      
      const result = await workflowService.approveRecord(id, userId, remarks);
      res.json(successResponse(result.data || result, result.message));
      return;
    } catch (error) {
      console.error('[NPI] APPROVE error:', error);
      return next(error);
    }
  }

  /**
   * POST /api/npi/:id/reject
   * Reject record (return to draft)
   */
  async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { params, body } = NpiActionSchema.parse({ params: req.params, body: req.body });
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const remarks = body?.remarks;
      
      if (!remarks) {
        res.status(400).json({ message: 'Remarks are required for rejection' });
        return;
      }
      
      const result = await workflowService.rejectRecord(params.id, userId, remarks);
      res.json(successResponse(result.data || result, result.message));
      return;
    } catch (error) {
      console.error('[NPI] REJECT error:', error);
      return next(error);
    }
  }
}

export const npiController = new NpiController();
