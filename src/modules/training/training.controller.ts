import type { NextFunction, Request, Response } from 'express';
import {
  createResponse,
  deleteResponse,
  successResponse,
  updateResponse,
} from '../../shared/utils/api-response.js';
import {
  TrainingAchievementQuerySchema,
  TrainingIdParamSchema,
  TrainingListQuerySchema,
  TrainingRecordInputSchema,
  TrainingSearchQuerySchema,
} from './training.schema.js';
import { trainingService } from './training.service.js';

class TrainingController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = TrainingListQuerySchema.parse({ query: req.query });
      const records = await trainingService.list(req.user?.userId, query);
      return res.json(successResponse(records));
    } catch (error) {
      return next(error);
    }
  }

  async calendar(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = TrainingListQuerySchema.parse({ query: req.query });
      const records = await trainingService.list(req.user?.userId, query);
      return res.json(successResponse(records));
    } catch (error) {
      return next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = TrainingIdParamSchema.parse({ params: req.params }).params;
      const record = await trainingService.getById(id, req.user?.userId);
      return res.json(successResponse(record));
    } catch (error) {
      return next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = TrainingRecordInputSchema.parse(req.body);
      const record = await trainingService.create(req.user!.userId, payload);
      return res.status(201).json(createResponse(record));
    } catch (error) {
      return next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = TrainingIdParamSchema.parse({ params: req.params }).params;
      const payload = TrainingRecordInputSchema.parse(req.body);
      const record = await trainingService.update(id, req.user!.userId, payload);
      return res.json(updateResponse(record));
    } catch (error) {
      return next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = TrainingIdParamSchema.parse({ params: req.params }).params;
      await trainingService.delete(id);
      return res.json(deleteResponse(id));
    } catch (error) {
      return next(error);
    }
  }

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = TrainingSearchQuerySchema.parse({ query: req.query });
      const records = await trainingService.search(req.user?.userId, query);
      return res.json(successResponse(records));
    } catch (error) {
      return next(error);
    }
  }

  async achievement(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = TrainingAchievementQuerySchema.parse({ query: req.query });
      const records = await trainingService.achievement(req.user?.userId, query);
      return res.json(successResponse(records));
    } catch (error) {
      return next(error);
    }
  }
}

export const trainingController = new TrainingController();
