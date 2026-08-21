const supabase = require('../../config/supabase');
const { parseDateRange } = require('./dateRange.service');

const getRevenueAnalytics = async (query = {}) => {
  const { startDateISO, endDateISO } = parseDateRange(query.range || '30days', query.startDate, query.endDate);

  if (supabase) {
    const { data: orders } = await supabase.from('orders')
      .select('created_at, total_amount, status')
      .gte('created_at', startDateISO)
      .lte('created_at', endDateISO)
      .neq('status', 'CANCELLED');

    const dailyMap = {};
    (orders || []).forEach(o => {
      const dateKey = o.created_at.slice(0, 10);
      dailyMap[dateKey] = (dailyMap[dateKey] || 0) + parseFloat(o.total_amount || 0);
    });

    const trend = Object.keys(dailyMap).map(date => ({
      date,
      revenue: Math.round(dailyMap[date])
    }));

    return { trend };
  }

  // Mock Fallback
  return {
    trend: [
      { date: '2026-08-15', revenue: 4200 },
      { date: '2026-08-16', revenue: 6800 },
      { date: '2026-08-17', revenue: 5400 },
      { date: '2026-08-18', revenue: 9100 },
      { date: '2026-08-19', revenue: 7800 },
      { date: '2026-08-20', revenue: 11200 },
      { date: '2026-08-21', revenue: 12450 }
    ]
  };
};

const getTopProducts = async (query = {}) => {
  if (supabase) {
    const { data: items } = await supabase.from('order_items')
      .select('product_name, unit_price, quantity, total_price');

    const productMap = {};
    (items || []).forEach(item => {
      const name = item.product_name || 'Grocery Item';
      if (!productMap[name]) {
        productMap[name] = { name, quantitySold: 0, revenue: 0 };
      }
      productMap[name].quantitySold += item.quantity || 1;
      productMap[name].revenue += parseFloat(item.total_price || 0);
    });

    const topList = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return { products: topList };
  }

  // Mock Fallback
  return {
    products: [
      { name: 'Aashirvaad Shuddh Chakki Atta 5kg', quantitySold: 42, revenue: 9870 },
      { name: 'Fortune Sunlite Sunflower Oil 1L', quantitySold: 38, revenue: 5510 },
      { name: 'Amul Taaza Toned Milk 1L', quantitySold: 65, revenue: 4420 },
      { name: 'Tata Salt Vacuum Evaporated 1kg', quantitySold: 45, revenue: 1260 },
      { name: 'India Gate Basmati Rice Feast 5kg', quantitySold: 12, revenue: 7080 }
    ]
  };
};

module.exports = {
  getRevenueAnalytics,
  getTopProducts
};
