import { Request, Response, NextFunction } from 'express';
import { NpiCrudService } from './services/NpiCrudService.js';
import { NpiWorkflowService } from './services/NpiWorkflowService.js';
import { NpiRepository } from './npi.repository.js';
import { NpiMapper } from './services/NpiMapper.js';
import {
  NpiActionSchema,
  NpiAttachmentParamSchema,
  NpiCreateSchema,
  NpiIdParamSchema,
  NpiUpdateSchema,
} from './npi.schema.js';
import { createResponse, successResponse } from '../../shared/utils/api-response.js';
import { attachmentService } from '../../shared/services/attachment.service.js';

const repository = new NpiRepository();
const mapper = new NpiMapper();
const crudService = new NpiCrudService(repository, mapper);
const workflowService = new NpiWorkflowService(repository);

export class NpiController {
  constructor() {
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.getStats = this.getStats.bind(this);
    this.generateSequence = this.generateSequence.bind(this);
    this.downloadAttachment = this.downloadAttachment.bind(this);
    this.submit = this.submit.bind(this);
    this.check = this.check.bind(this);
    this.approve = this.approve.bind(this);
    this.reject = this.reject.bind(this);
    this.delete = this.delete.bind(this);
  }

  private getActor(req: Request) {
    return {
      userId: req.user?.userId || 'SYSTEM',
    };
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        siteId: req.query.siteId as string | undefined,
        supplierId: req.query.supplierId as string | undefined,
        keyword: req.query.keyword as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
      };
      const records = await crudService.getAllRecords(this.getActor(req), filters);
      res.json(successResponse(records));
    } catch (error) {
      console.error('[NPI] GET ALL error:', error);
      return next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = NpiIdParamSchema.parse({ params: req.params }).params;
      const record = await crudService.getRecordById(id, this.getActor(req));
      res.json(successResponse(record));
    } catch (error) {
      console.error('[NPI] GET BY ID error:', error);
      return next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = NpiCreateSchema.parse({ body: req.body }).body;
      const userId = this.getActor(req).userId;
      const files = ((req as unknown as { files?: unknown[] }).files || []) as any[];
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

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = NpiUpdateSchema.parse({ params: req.params, body: req.body });
      const files = ((req as unknown as { files?: unknown[] }).files || []) as any[];
      const result = await crudService.updateRecord(parsed.params.id, parsed.body, this.getActor(req).userId, files);
      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[NPI] UPDATE error:', error);
      return next(error);
    }
  }

  async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { db } = await import('../../shared/infrastructure/db.js');
      const stats = await db
        .selectFrom('NPI_LOTS')
        .select(['request_status as status', db.fn.count('npi_lot_id').as('count')])
        .groupBy('request_status')
        .execute();

      res.json(successResponse(stats));
    } catch (error) {
      return next(error);
    }
  }

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

  async downloadAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { attachmentId } = NpiAttachmentParamSchema.parse({ params: req.params }).params;
      const { filePath, fileName, mimeType } = await attachmentService.downloadAttachment('npi-main', attachmentId);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.download(filePath);
      return;
    } catch (error) {
      console.error('[NPI] DOWNLOAD error:', error);
      return next(error);
    }
  }

  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = NpiActionSchema.parse({ params: req.params, body: req.body }).params;
      const result = await workflowService.submitForApproval(id, this.getActor(req).userId);
      res.json(successResponse(result.data || result, result.message));
      return;
    } catch (error) {
      console.error('[NPI] SUBMIT error:', error);
      return next(error);
    }
  }

  async check(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = NpiActionSchema.parse({ params: req.params, body: req.body });
      const result = await workflowService.checkRecord(
        parsed.params.id,
        this.getActor(req).userId,
        parsed.body?.remarks,
      );
      res.json(successResponse(result.data || result, result.message));
      return;
    } catch (error) {
      console.error('[NPI] CHECK error:', error);
      return next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = NpiActionSchema.parse({ params: req.params, body: req.body });
      const result = await workflowService.approveRecord(
        parsed.params.id,
        this.getActor(req).userId,
        parsed.body?.remarks,
      );
      res.json(successResponse(result.data || result, result.message));
      return;
    } catch (error) {
      console.error('[NPI] APPROVE error:', error);
      return next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = NpiActionSchema.parse({ params: req.params, body: req.body });
      const result = await workflowService.rejectRecord(
        parsed.params.id,
        this.getActor(req).userId,
        parsed.body?.remarks || '',
      );
      res.json(successResponse(result.data || result, result.message));
      return;
    } catch (error) {
      console.error('[NPI] REJECT error:', error);
      return next(error);
    }
  }

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
}

export const npiController = new NpiController();
