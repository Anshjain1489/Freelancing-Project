const supabase = require('../../config/supabase');
const { parseDateRange } = require('./dateRange.service');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getDashboardSummary = async (query = {}) => {
  const { startDateISO, endDateISO } = parseDateRange(query.range || 'today', query.startDate, query.endDate);

  if (supabase) {
    // 1. Fetch Orders in range
    const { data: orders } = await supabase.from('orders')
      .select('id, status, total_amount, created_at')
      .gte('created_at', startDateISO)
      .lte('created_at', endDateISO);

    // 2. Fetch Low Stock Count
    const { count: lowStockCount } = await supabase.from('inventory')
      .select('id', { count: 'exact', head: true })
      .lte('quantity', 5);

    // 3. Fetch Customer Count
    const { count: totalCustomers } = await supabase.from('users')
      .select('id', { count: 'exact', head: true });

    const validOrders = orders || [];
    const paidOrders = validOrders.filter(o => o.status !== 'CANCELLED' && o.status !== 'PAYMENT_FAILED');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const orderCount = paidOrders.length;
    const averageOrderValue = orderCount > 0 ? Math.round((totalRevenue / orderCount) * 100) / 100 : 0;

    const orderStatusMap = {
      pending: validOrders.filter(o => o.status === 'PENDING_PAYMENT').length,
      confirmed: validOrders.filter(o => o.status === 'CONFIRMED').length,
      processing: validOrders.filter(o => o.status === 'PROCESSING').length,
      outForDelivery: validOrders.filter(o => o.status === 'OUT_FOR_DELIVERY').length,
      delivered: validOrders.filter(o => o.status === 'DELIVERED').length,
      cancelled: validOrders.filter(o => o.status === 'CANCELLED').length
    };

    return {
      summary: {
        revenue: Math.round(totalRevenue),
        orders: orderCount,
        averageOrderValue,
        lowStockProducts: lowStockCount || 0,
        totalCustomers: totalCustomers || 0
      },
      orderStatus: orderStatusMap
    };
  }

  // Local Mock Fallback
  return {
    summary: {
      revenue: 12450,
      orders: 18,
      averageOrderValue: 691.67,
      lowStockProducts: 6,
      totalCustomers: 243
    },
    orderStatus: {
      pending: 2,
      confirmed: 4,
      processing: 3,
      outForDelivery: 2,
      delivered: 7,
      cancelled: 0
    }
  };
};

module.exports = { getDashboardSummary };
