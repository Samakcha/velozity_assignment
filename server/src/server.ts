import { app, httpServer } from './app.js';
import { config } from './config/env.js';
import { initOverdueTasksJob } from './jobs/overdueTasks.job.js';

const PORT = config.port;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${config.nodeEnv} mode`);
  console.log(`🔗 Health check available at http://localhost:${PORT}/api/health`);

  // Register background jobs in local development mode
  if (process.env.VERCEL !== '1') {
    initOverdueTasksJob();
  }
});

export default app;
