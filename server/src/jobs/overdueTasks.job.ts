import cron from 'node-cron';
import { OverdueTaskService, OverdueJobResult } from '../services/overdueTask.service.js';

let isJobRunning = false;
let isJobInitialized = false;

/**
 * Manually trigger the overdue task check.
 * Safe against concurrent overlapping runs.
 */
export const runOverdueTasksCheck = async (): Promise<OverdueJobResult | null> => {
  if (isJobRunning) {
    console.log('⏰ Overdue tasks job skipped: Previous execution is still in progress.');
    return null;
  }

  isJobRunning = true;
  try {
    const result = await OverdueTaskService.processOverdueTasks();
    if (result.updatedCount > 0) {
      console.log(
        `✅ Overdue tasks job completed: Marked ${result.updatedCount} task(s) as OVERDUE.`
      );
    }
    return result;
  } catch (error) {
    console.error('❌ Overdue tasks job encountered an error:', error);
    return null;
  } finally {
    isJobRunning = false;
  }
};

/**
 * Register the overdue tasks cron job on server startup.
 * Runs once on schedule and avoids duplicate registrations.
 */
export const initOverdueTasksJob = (): void => {
  if (isJobInitialized) {
    console.log('⚠️ Overdue tasks cron job already initialized.');
    return;
  }

  const cronSchedule = process.env.OVERDUE_JOB_CRON_SCHEDULE || '0 * * * *'; // Default: once every hour

  if (!cron.validate(cronSchedule)) {
    console.error(`❌ Invalid cron expression: "${cronSchedule}". Overdue job not started.`);
    return;
  }

  cron.schedule(cronSchedule, async () => {
    console.log('⏰ Running scheduled overdue tasks check...');
    await runOverdueTasksCheck();
  });

  isJobInitialized = true;
  console.log(`⏱️ Overdue tasks cron job registered successfully [Schedule: "${cronSchedule}"].`);
};
