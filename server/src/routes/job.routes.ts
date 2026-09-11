import { Router, Request, Response } from 'express';
import { runOverdueTasksCheck } from '../jobs/overdueTasks.job.js';

const router = Router();

/**
 * GET /api/jobs/overdue
 * Production endpoint for Vercel Cron invocation.
 * Verifies Authorization: Bearer <CRON_SECRET> header.
 */
router.get('/overdue', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ success: false, message: 'Unauthorized cron execution' });
    return;
  }

  try {
    const result = await runOverdueTasksCheck();
    res.json({
      success: true,
      message: 'Overdue task check executed successfully',
      result,
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: (err as Error).message || 'Failed to execute overdue task job',
    });
  }
});

export default router;
