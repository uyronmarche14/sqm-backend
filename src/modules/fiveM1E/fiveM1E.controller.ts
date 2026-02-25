import { Request, Response, NextFunction } from 'express';
import { fiveM1EService } from './fiveM1E.service.js';

export class FiveM1EController {
  
  /**
   * Submit a new 5M1E Application
   */
  async createApplication(req: Request, res: Response, next: NextFunction) {
    try {
      // req.user is guaranteed by requireAuth middleware
      const userId = req.user!.userId; 
      
      const result = await fiveM1EService.createApplication(req.body, userId);
      
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch all 5M1E Applications
   */
  async getAllApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const records = await fiveM1EService.getAllApplications(status);
      
      res.status(200).json({
        success: true,
        data: records
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fetch a specific Application by its Control Number
   */
  async getApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string; // ID acts as controlNo in our URL schema
      
      const record = await fiveM1EService.getApplication(id);
      
      res.status(200).json({
        success: true,
        data: record
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an existing Application
   */
  async updateApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      
      const result = await fiveM1EService.updateApplication(id, req.body);
      
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const fiveM1EController = new FiveM1EController();
