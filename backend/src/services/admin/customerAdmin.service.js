const supabase = require('../../config/supabase');
const { getPaginationParams, formatPaginatedResponse } = require('../../utils/pagination');

const getAdminCustomers = async (queryParams = {}) => {
  const { page, limit, offset } = getPaginationParams(queryParams.page, queryParams.limit);

  if (supabase) {
    const { data, count, error } = await supabase.from('users')
      .select('id, full_name, email, phone, is_active, created_at, orders ( id, total_amount, status )', { count: 'exact' })
      .range(offset, offset + limit - 1);

    const formatted = (data || []).map(u => {
      const orders = u.orders || [];
      const totalSpend = orders.filter(o => o.status !== 'CANCELLED').reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
      return {
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        phone: u.phone,
        isActive: u.is_active,
        totalOrders: orders.length,
        totalSpend: Math.round(totalSpend),
        createdAt: u.created_at
      };
    });

    return formatPaginatedResponse(formatted, page, limit, count || 0);
  }

  // Mock Fallback
  const mockCust = [
    { id: 'u-1', fullName: 'Rahul Sharma', email: 'rahul@example.com', phone: '9876543210', totalOrders: 5, totalSpend: 3250, createdAt: new Date().toISOString() },
    { id: 'u-2', fullName: 'Priya Gupta', email: 'priya@example.com', phone: '9123456789', totalOrders: 2, totalSpend: 1800, createdAt: new Date().toISOString() }
  ];
  return formatPaginatedResponse(mockCust, page, limit, mockCust.length);
};

module.exports = { getAdminCustomers };
