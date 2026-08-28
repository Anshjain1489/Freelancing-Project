const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../../middleware/auth.middleware');
const jobRunner = require('../../jobs/jobRunner.service');
const config = require('../../config/environment');
const { HTTP_STATUS } = require('../../constants/statusCodes');
const supabase = require('../../config/supabase');

/**
 * GET /api/v1/admin/system-health
 * Operational system health & monitoring dashboard for administrators.
 */
router.get('/', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    let dbStatus = 'CONNECTED';
    let dbError = null;

    if (supabase) {
      const { error } = await supabase.from('store_settings').select('key').limit(1);
      if (error) {
        dbStatus = 'DEGRADED';
        dbError = error.message;
      }
    }

    const jobHistory = await jobRunner.getJobRunLogs(10);
    const alerts = await jobRunner.getSystemAlerts(10);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        application: {
          service: 'chaudhary-kirana-api',
          version: '1.0.0',
          environment: config.env,
          uptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
          memoryUsageMb: Math.round(process.memoryUsage().rss / (1024 * 1024))
        },
        database: {
          status: dbStatus,
          error: dbError
        },
        automation: {
          jobRunnerActive: jobRunner.isRunning(),
          recentJobRuns: jobHistory,
          activeAlertsCount: alerts.length
        },
        alerts
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
