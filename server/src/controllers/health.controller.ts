import { Request, Response } from 'express';
import { HealthService } from '../services/health.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getHealth = (_req: Request, res: Response): void => {
  const healthData = HealthService.getHealthStatus();
  sendSuccess(res, healthData, 'API health status retrieved successfully');
};
