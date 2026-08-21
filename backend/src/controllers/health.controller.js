const asyncHandler = require('../utils/asyncHandler');
const config = require('../config/environment');
const supabase = require('../config/supabase');

const getHealthStatus = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Chaudhary Kirana Store API is running',
    environment: config.env,
    timestamp: new Date().toISOString()
  });
});

const getHealthReadiness = asyncHandler(async (req, res) => {
  let dbStatus = 'disconnected_local_mock';

  if (supabase) {
    try {
      const { data, error } = await supabase.from('categories').select('id').limit(1);
      if (!error) {
        dbStatus = 'connected_supabase_postgresql';
      }
    } catch {
      dbStatus = 'connection_error';
    }
  }

  res.status(200).json({
    success: true,
    message: 'Chaudhary Kirana Store System Readiness Check',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

module.exports = { getHealthStatus, getHealthReadiness };
