const supabase = require('../config/supabase');
const logger = require('../utils/logger');

const logAdminActivity = async (adminId, action, entityType, entityId = null, metadata = {}, req = null) => {
  try {
    const ipAddress = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || null;
    const userAgent = req?.headers['user-agent'] || null;

    if (supabase) {
      const { error } = await supabase.from('admin_activity_logs').insert([{
        admin_id: adminId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata,
        ip_address: ipAddress,
        user_agent: userAgent
      }]);
      if (error) {
        logger.error(`Failed to insert admin_activity_logs: ${error.message}`);
      }
    } else {
      logger.info(`[ADMIN LOG] ${action} on ${entityType} (${entityId}) by Admin ${adminId}`);
    }
  } catch (error) {
    logger.error('Failed to write admin activity log:', error);
  }
};

module.exports = { logAdminActivity };
