const supabase = require('../../config/supabase');
const { getPaginationParams, formatPaginatedResponse } = require('../../utils/pagination');

const getAdminActivityLogs = async (queryParams = {}) => {
  const { page, limit, offset } = getPaginationParams(queryParams.page, queryParams.limit);

  if (supabase) {
    const { data, count } = await supabase.from('admin_activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const formatted = (data || []).map(a => ({
      id: a.id,
      adminName: a.users?.full_name || 'Admin',
      action: a.action,
      resourceType: a.entity_type || a.resource_type,
      resourceId: a.entity_id || a.resource_id,
      metadata: a.metadata,
      ipAddress: a.ip_address,
      createdAt: a.created_at
    }));

    return formatPaginatedResponse(formatted, page, limit, count || 0);
  }

  // Mock Fallback
  const mockLogs = [
    { id: 'act-1', adminName: 'Akash Chaudhary', action: 'INVENTORY_UPDATED', resourceType: 'inventory', resourceId: 'p1', metadata: { oldQty: 3, newQty: 20 }, createdAt: new Date().toISOString() }
  ];
  return formatPaginatedResponse(mockLogs, page, limit, mockLogs.length);
};

module.exports = { getAdminActivityLogs };
