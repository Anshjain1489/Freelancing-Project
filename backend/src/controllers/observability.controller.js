const asyncHandler = require('../utils/asyncHandler');
const metricsService = require('../monitoring/metrics.service');
const sloTracker = require('../monitoring/sloTracker.service');
const alertManager = require('../monitoring/alertManager.service');
const errorTracker = require('../monitoring/errorTracker.service');
const gracefulShutdown = require('../services/gracefulShutdown.service');

const getObservabilityDashboard = asyncHandler(async (req, res) => {
  // Evaluate alerts to ensure fresh state
  alertManager.evaluateAlerts();

  const metrics = metricsService.getAggregateMetrics();
  const sloData = sloTracker.evaluateSlos();
  const activeAlerts = alertManager.getActiveAlerts();
  const recentErrors = errorTracker.getRecentErrors(5);

  // Business metrics estimation (safe aggregates)
  let businessMetrics = {
    totalOrdersCount: 0,
    deliveredOrdersCount: 0,
    cancelledOrdersCount: 0,
    failedDeliveriesCount: 0,
    activeAssignmentsCount: 0
  };

  try {
    const supabase = require('../config/supabase');
    if (supabase) {
      const { count: ordCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
      const { count: delCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'DELIVERED');
      const { count: canCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'CANCELLED');
      const { count: failCount } = await supabase.from('delivery_assignments').select('*', { count: 'exact', head: true }).eq('status', 'FAILED');
      const { count: actCount } = await supabase.from('delivery_assignments').select('*', { count: 'exact', head: true }).eq('status', 'ACCEPTED');

      businessMetrics = {
        totalOrdersCount: ordCount || 0,
        deliveredOrdersCount: delCount || 0,
        cancelledOrdersCount: canCount || 0,
        failedDeliveriesCount: failCount || 0,
        activeAssignmentsCount: actCount || 0
      };
    }
  } catch (err) {
    // If DB is offline/unreachable in local tests, keep default business metrics safely
  }

  res.status(200).json({
    success: true,
    data: {
      generatedAt: new Date().toISOString(),
      operationalState: gracefulShutdown.getState(),
      slo: sloData,
      http: metrics.http,
      errors: {
        stats: metrics.errors,
        recent: recentErrors.map(e => ({
          fingerprint: e.fingerprint,
          name: e.name,
          message: e.message,
          occurrenceCount: e.occurrenceCount,
          lastSeen: e.lastSeen,
          severity: e.severity
        }))
      },
      jobs: metrics.jobs,
      sse: metrics.sse,
      cache: metrics.cache,
      alerts: {
        activeCount: activeAlerts.length,
        items: activeAlerts
      },
      business: businessMetrics
    }
  });
});

module.exports = {
  getObservabilityDashboard
};
