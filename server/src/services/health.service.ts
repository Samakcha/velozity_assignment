export interface HealthCheckResult {
  status: string;
  service: string;
  uptime: number;
  environment: string;
}

export class HealthService {
  public static getHealthStatus(): HealthCheckResult {
    return {
      status: 'ok',
      service: 'Real-Time Client Dashboard API',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
