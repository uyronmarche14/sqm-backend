import { Request, Response, NextFunction } from 'express';
import { fiveM1EService } from './fiveM1E.service.js';
import { successResponse } from '../../shared/utils/api-response.js';

export class FiveM1EController {
  
  /**
   * Submit a new 5M1E Application
   */
  async createApplication(req: Request, res: Response, next: NextFunction) {
    try {
      // req.user is guaranteed by requireAuth middleware
      const userId = req.user!.userId; 
      const files = (req as any).files || [];
      
      console.log(`[5M1E Controller] Create - ${files.length} file(s) received`);
      
      // 🔗 DATA CONNECTION LOGGER (Requested for Verification)
      console.log("🚀 [BACKEND E2E VERIFICATION] Received Create Payload:");
      console.log(JSON.stringify(req.body, null, 2));

      const result = await fiveM1EService.createApplication(req.body, userId, files);
      
      res.status(201).json(successResponse(result.data, result.message));
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
      
      res.status(200).json(successResponse(records));
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
      
      res.status(200).json(successResponse(record));
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
      const files = (req as any).files || [];
      const userId = req.user!.userId;
      
      console.log(`[5M1E Controller] Update [${id}] - ${files.length} file(s) received for user ${userId}`);
      
      // 🔗 DATA CONNECTION LOGGER (Requested for Verification)
      console.log(`🚀 [BACKEND E2E VERIFICATION] Received Update Payload for ${id}:`);
      console.log(JSON.stringify(req.body, null, 2));

      const result = await fiveM1EService.updateApplication(id, req.body, files, userId);
      
      res.status(200).json(successResponse(result.data, result.message));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete an Application and all child data
   */
  async deleteApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await fiveM1EService.deleteApplication(id);
      res.status(200).json(successResponse({ id }, result.message));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Workflow: Submit
   */
  async submitApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.userId;
      const result = await fiveM1EService.submitApplication(id, userId);
      res.status(200).json(successResponse(result.data, result.message));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Workflow: Approve
   */
  async approveApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.userId;
      const result = await fiveM1EService.approveApplication(id, userId, req.body?.remarks, req.body?.status);
      res.status(200).json(successResponse(result.data, result.message));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Workflow: Reject
   */
  async rejectApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.userId;
      const result = await fiveM1EService.rejectApplication(id, userId, req.body?.remarks);
      res.status(200).json(successResponse(result.data, result.message));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Workflow: Release
   */
  async releaseApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.userId;
      const result = await fiveM1EService.releaseApplication(id, userId);
      res.status(200).json(successResponse(result.data, result.message));
    } catch (error) {
      next(error);
    }
  }
}

export const fiveM1EController = new FiveM1EController();
