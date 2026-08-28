const supabase = require('../../config/supabase');
const { parseDateRange, getIstDateParts, createIstUtcDate } = require('./dateRange.service');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');

/**
 * 1. DASHBOARD OVERVIEW METRICS (Today IST)
 */
const getDashboardOverview = async () => {
  const { startDateISO: todayStartISO, endDateISO: todayEndISO } = parseDateRange('today');
  const { startDateISO: yestStartISO, endDateISO: yestEndISO } = parseDateRange('yesterday');

  if (supabase) {
    // 1. Fetch Today Online Orders (excluding CANCELLED)
    const { data: todayOrders } = await supabase.from('orders')
      .select('id, total_amount, status, created_at, order_items(quantity)')
      .gte('created_at', todayStartISO)
      .lte('created_at', todayEndISO)
      .neq('status', 'CANCELLED');

    // 2. Fetch Today POS Sales (excluding CANCELLED)
    const { data: todayPos } = await supabase.from('pos_sales')
      .select('id, total_amount, status, created_at, pos_sale_items(quantity)')
      .gte('created_at', todayStartISO)
      .lte('created_at', todayEndISO)
      .neq('status', 'CANCELLED');

    // 3. Fetch Yesterday Online Orders + POS Sales for Growth Rate
    const { data: yestOrders } = await supabase.from('orders')
      .select('total_amount')
      .gte('created_at', yestStartISO)
      .lte('created_at', yestEndISO)
      .neq('status', 'CANCELLED');

    const { data: yestPos } = await supabase.from('pos_sales')
      .select('total_amount')
      .gte('created_at', yestStartISO)
      .lte('created_at', yestEndISO)
      .neq('status', 'CANCELLED');

    // 4. Fetch Cancelled Orders & Refunds Today
    const { data: cancelledOrders } = await supabase.from('orders')
      .select('total_amount')
      .gte('created_at', todayStartISO)
      .lte('created_at', todayEndISO)
      .eq('status', 'CANCELLED');

    const { data: cancelledPos } = await supabase.from('pos_sales')
      .select('total_amount')
      .gte('created_at', todayStartISO)
      .lte('created_at', todayEndISO)
      .eq('status', 'CANCELLED');

    // 5. Fetch Inventory counts
    const { data: products } = await supabase.from('products')
      .select('id, stock_quantity, low_stock_threshold, is_active')
      .eq('is_active', true);

    // Calculate Today Financials
    const todayOnlineRev = (todayOrders || []).reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const todayPosRev = (todayPos || []).reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0);
    const todayTotalRev = Math.round((todayOnlineRev + todayPosRev) * 100) / 100;

    const todayOnlineOrdersCount = (todayOrders || []).length;
    const todayPosSalesCount = (todayPos || []).length;
    const todayTotalOrdersCount = todayOnlineOrdersCount + todayPosSalesCount;

    // Yesterday Financials
    const yestOnlineRev = (yestOrders || []).reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const yestPosRev = (yestPos || []).reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0);
    const yestTotalRev = yestOnlineRev + yestPosRev;

    // Growth %
    let revenueGrowthPct = 0;
    if (yestTotalRev > 0) {
      revenueGrowthPct = Math.round(((todayTotalRev - yestTotalRev) / yestTotalRev) * 1000) / 10;
    } else if (todayTotalRev > 0) {
      revenueGrowthPct = 100;
    }

    // Average Order Value (AOV)
    const avgOrderValue = todayTotalOrdersCount > 0 ? Math.round((todayTotalRev / todayTotalOrdersCount) * 100) / 100 : 0;

    // Items Sold Today
    let itemsSoldCount = 0;
    (todayOrders || []).forEach(o => {
      (o.order_items || []).forEach(item => { itemsSoldCount += parseFloat(item.quantity || 1); });
    });
    (todayPos || []).forEach(p => {
      (p.pos_sale_items || []).forEach(item => { itemsSoldCount += parseFloat(item.quantity || 1); });
    });

    // Cancelled Orders & Impact
    const cancelledCount = (cancelledOrders || []).length + (cancelledPos || []).length;
    const refundImpact = Math.round((
      (cancelledOrders || []).reduce((s, o) => s + parseFloat(o.total_amount || 0), 0) +
      (cancelledPos || []).reduce((s, p) => s + parseFloat(p.total_amount || 0), 0)
    ) * 100) / 100;

    // Inventory Alerts
    const lowStockCount = (products || []).filter(p => p.stock_quantity > 0 && p.stock_quantity <= (p.low_stock_threshold || 10)).length;
    const outOfStockCount = (products || []).filter(p => p.stock_quantity <= 0).length;

    return {
      todayRevenue: todayTotalRev,
      todayOnlineSales: Math.round(todayOnlineRev * 100) / 100,
      todayPosSales: Math.round(todayPosRev * 100) / 100,
      todayOrdersCount: todayTotalOrdersCount,
      todayOnlineOrdersCount,
      todayPosSalesCount,
      revenueGrowthPct,
      avgOrderValue,
      itemsSoldCount,
      cancelledOrdersCount: cancelledCount,
      refundImpact,
      lowStockCount,
      outOfStockCount,
      timezone: 'Asia/Kolkata (IST)'
    };
  }

  // Memory Fallback / Offline Mock
  return {
    todayRevenue: 12540,
    todayOnlineSales: 6340,
    todayPosSales: 6200,
    todayOrdersCount: 42,
    todayOnlineOrdersCount: 20,
    todayPosSalesCount: 22,
    revenueGrowthPct: 12.5,
    avgOrderValue: 298,
    itemsSoldCount: 127,
    cancelledOrdersCount: 2,
    refundImpact: 450,
    lowStockCount: 4,
    outOfStockCount: 1,
    timezone: 'Asia/Kolkata (IST)'
  };
};

/**
 * 2. SALES ANALYTICS & TRENDS
 */
const getSalesAnalytics = async (query = {}) => {
  const { startDateISO, endDateISO } = parseDateRange(query.range || '30days', query.startDate, query.endDate);

  if (supabase) {
    // Online Orders
    const { data: orders } = await supabase.from('orders')
      .select('created_at, total_amount, payment_method, status')
      .gte('created_at', startDateISO)
      .lte('created_at', endDateISO)
      .neq('status', 'CANCELLED');

    // POS Sales
    const { data: posSales } = await supabase.from('pos_sales')
      .select('created_at, total_amount, payment_method, status')
      .gte('created_at', startDateISO)
      .lte('created_at', endDateISO)
      .neq('status', 'CANCELLED');

    // Daily Trend Grouping (IST)
    const dailyMap = {};

    const processRecord = (rec, type) => {
      // Convert UTC timestamp to IST date string (YYYY-MM-DD)
      const d = new Date(rec.created_at);
      const istParts = getIstDateParts(d);
      const dateKey = `${istParts.year}-${String(istParts.month + 1).padStart(2, '0')}-${String(istParts.day).padStart(2, '0')}`;

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, onlineRevenue: 0, posRevenue: 0, totalRevenue: 0, orderCount: 0 };
      }
      const amt = parseFloat(rec.total_amount || 0);
      if (type === 'ONLINE') dailyMap[dateKey].onlineRevenue += amt;
      if (type === 'POS') dailyMap[dateKey].posRevenue += amt;
      dailyMap[dateKey].totalRevenue += amt;
      dailyMap[dateKey].orderCount += 1;
    };

    (orders || []).forEach(o => processRecord(o, 'ONLINE'));
    (posSales || []).forEach(p => processRecord(p, 'POS'));

    const dailyRevenueTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)).map(d => ({
      ...d,
      onlineRevenue: Math.round(d.onlineRevenue * 100) / 100,
      posRevenue: Math.round(d.posRevenue * 100) / 100,
      totalRevenue: Math.round(d.totalRevenue * 100) / 100
    }));

    // POS vs Online Revenue Breakdown
    const totalOnline = dailyRevenueTrend.reduce((s, d) => s + d.onlineRevenue, 0);
    const totalPos = dailyRevenueTrend.reduce((s, d) => s + d.posRevenue, 0);
    const grandTotal = totalOnline + totalPos;

    const posVsOnlineBreakdown = {
      onlineRevenue: Math.round(totalOnline * 100) / 100,
      onlinePct: grandTotal > 0 ? Math.round((totalOnline / grandTotal) * 1000) / 10 : 0,
      posRevenue: Math.round(totalPos * 100) / 100,
      posPct: grandTotal > 0 ? Math.round((totalPos / grandTotal) * 1000) / 10 : 0,
      totalRevenue: Math.round(grandTotal * 100) / 100
    };

    // Payment Method Distribution
    const paymentMap = { CASH: 0, UPI: 0, CARD: 0, ONLINE: 0 };
    (orders || []).forEach(o => {
      const pm = (o.payment_method || 'ONLINE').toUpperCase();
      paymentMap[pm] = (paymentMap[pm] || 0) + parseFloat(o.total_amount || 0);
    });
    (posSales || []).forEach(p => {
      const pm = (p.payment_method || 'CASH').toUpperCase();
      paymentMap[pm] = (paymentMap[pm] || 0) + parseFloat(p.total_amount || 0);
    });

    const paymentMethodDistribution = Object.keys(paymentMap).map(method => ({
      method,
      amount: Math.round(paymentMap[method] * 100) / 100,
      percentage: grandTotal > 0 ? Math.round((paymentMap[method] / grandTotal) * 1000) / 10 : 0
    }));

    // Hourly Sales Pattern (00:00 to 23:00 IST)
    const hourlyMap = Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2, '0')}:00`, revenue: 0, orders: 0 }));

    const processHourly = (rec) => {
      const d = new Date(rec.created_at);
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(d.getTime() + istOffsetMs);
      const h = istDate.getUTCHours();
      hourlyMap[h].revenue += parseFloat(rec.total_amount || 0);
      hourlyMap[h].orders += 1;
    };

    (orders || []).forEach(processHourly);
    (posSales || []).forEach(processHourly);

    const hourlySalesPattern = hourlyMap.map(h => ({ ...h, revenue: Math.round(h.revenue * 100) / 100 }));

    return {
      dailyRevenueTrend,
      posVsOnlineBreakdown,
      paymentMethodDistribution,
      hourlySalesPattern
    };
  }

  // Mock Fallback
  return {
    dailyRevenueTrend: [
      { date: '2026-08-22', onlineRevenue: 3400, posRevenue: 2800, totalRevenue: 6200, orderCount: 22 },
      { date: '2026-08-23', onlineRevenue: 4100, posRevenue: 3900, totalRevenue: 8000, orderCount: 28 },
      { date: '2026-08-24', onlineRevenue: 5200, posRevenue: 4500, totalRevenue: 9700, orderCount: 35 },
      { date: '2026-08-25', onlineRevenue: 6100, posRevenue: 5400, totalRevenue: 11500, orderCount: 40 },
      { date: '2026-08-26', onlineRevenue: 5800, posRevenue: 6200, totalRevenue: 12000, orderCount: 41 },
      { date: '2026-08-27', onlineRevenue: 6340, posRevenue: 6200, totalRevenue: 12540, orderCount: 42 }
    ],
    posVsOnlineBreakdown: { onlineRevenue: 30940, onlinePct: 51.6, posRevenue: 29000, posPct: 48.4, totalRevenue: 59940 },
    paymentMethodDistribution: [
      { method: 'UPI', amount: 27000, percentage: 45.0 },
      { method: 'CASH', amount: 16800, percentage: 28.0 },
      { method: 'CARD', amount: 7200, percentage: 12.0 },
      { method: 'ONLINE', amount: 8940, percentage: 15.0 }
    ],
    hourlySalesPattern: [
      { hour: '08:00', revenue: 1200, orders: 4 },
      { hour: '10:00', revenue: 3400, orders: 12 },
      { hour: '12:00', revenue: 4500, orders: 15 },
      { hour: '16:00', revenue: 2800, orders: 8 },
      { hour: '19:00', revenue: 6200, orders: 20 }
    ]
  };
};

/**
 * 3. PRODUCT & CATEGORY INTELLIGENCE
 */
const getProductAnalytics = async (query = {}) => {
  const { startDateISO, endDateISO } = parseDateRange(query.range || '30days', query.startDate, query.endDate);

  if (supabase) {
    // Top selling products from order_items and pos_sale_items
    const { data: orderItems } = await supabase.from('order_items')
      .select('product_id, product_name, quantity, total_price, created_at')
      .gte('created_at', startDateISO)
      .lte('created_at', endDateISO);

    const { data: posItems } = await supabase.from('pos_sale_items')
      .select('product_id, product_name, quantity, total_amount, created_at')
      .gte('created_at', startDateISO)
      .lte('created_at', endDateISO);

    const { data: products } = await supabase.from('products')
      .select('id, name, category, stock_quantity, low_stock_threshold, selling_price, mrp');

    const productStats = {};
    const categoryStats = {};

    const processItem = (productId, name, qty, rev) => {
      const pName = name || 'Grocery Product';
      if (!productStats[pName]) {
        productStats[pName] = { id: productId, name: pName, quantitySold: 0, revenue: 0 };
      }
      productStats[pName].quantitySold += parseFloat(qty || 1);
      productStats[pName].revenue += parseFloat(rev || 0);
    };

    (orderItems || []).forEach(item => processItem(item.product_id, item.product_name, item.quantity, item.total_price));
    (posItems || []).forEach(item => processItem(item.product_id, item.product_name, item.quantity, item.total_amount));

    // Top Selling Products
    const topSellingProducts = Object.values(productStats)
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10)
      .map(p => ({ ...p, revenue: Math.round(p.revenue * 100) / 100 }));

    // Category Performance
    (products || []).forEach(p => {
      const cat = p.category || 'General Kirana';
      if (!categoryStats[cat]) categoryStats[cat] = { category: cat, revenue: 0, itemsSold: 0 };
      const stats = productStats[p.name];
      if (stats) {
        categoryStats[cat].revenue += stats.revenue;
        categoryStats[cat].itemsSold += stats.quantitySold;
      }
    });

    const categoryPerformance = Object.values(categoryStats).sort((a, b) => b.revenue - a.revenue).map(c => ({
      ...c,
      revenue: Math.round(c.revenue * 100) / 100
    }));

    // Slow-Moving Products (stock > 5 and quantitySold <= 2 in last 30 days)
    const slowMovingProducts = (products || []).filter(p => {
      const stats = productStats[p.name];
      const sold = stats ? stats.quantitySold : 0;
      return p.stock_quantity > 5 && sold <= 2;
    }).map(p => ({
      id: p.id,
      name: p.name,
      category: p.category || 'General',
      stockQuantity: p.stock_quantity,
      quantitySold30Days: productStats[p.name] ? productStats[p.name].quantitySold : 0
    })).slice(0, 10);

    return {
      topSellingProducts,
      slowMovingProducts,
      categoryPerformance
    };
  }

  // Mock Fallback
  return {
    topSellingProducts: [
      { name: 'Aashirvaad Shuddh Chakki Atta 5kg', quantitySold: 248, revenue: 58280 },
      { name: 'Amul Taaza Toned Milk 1L', quantitySold: 196, revenue: 13328 },
      { name: 'Maggi 2-Minute Noodles 420g', quantitySold: 172, revenue: 16340 },
      { name: 'Tata Salt Vacuum Evaporated 1kg', quantitySold: 145, revenue: 4060 },
      { name: 'Fortune Sunlite Sunflower Oil 1L', quantitySold: 112, revenue: 16240 }
    ],
    slowMovingProducts: [
      { name: 'Exotic Organic Quinoa 500g', stockQuantity: 24, quantitySold30Days: 0 },
      { name: 'Imported Dark Chocolate 100g', stockQuantity: 18, quantitySold30Days: 1 },
      { name: 'Specialty Herbal Tea 100g', stockQuantity: 15, quantitySold30Days: 1 }
    ],
    categoryPerformance: [
      { category: 'Atta & Grains', revenue: 42500, itemsSold: 310 },
      { category: 'Dairy & Eggs', revenue: 31200, itemsSold: 450 },
      { category: 'Snacks & Packaged', revenue: 28700, itemsSold: 280 },
      { category: 'Beverages', revenue: 18400, itemsSold: 190 }
    ]
  };
};

/**
 * 4. INVENTORY INTELLIGENCE & ESTIMATED RETAIL VALUATION
 */
const getInventoryAnalytics = async () => {
  if (supabase) {
    const { data: products } = await supabase.from('products')
      .select('id, name, sku, category, stock_quantity, low_stock_threshold, selling_price, mrp, is_active')
      .eq('is_active', true);

    const totalProducts = (products || []).length;
    let totalStockUnits = 0;
    let estimatedRetailInventoryValue = 0;

    const lowStockItems = [];
    const outOfStockItems = [];

    (products || []).forEach(p => {
      const qty = Math.max(0, p.stock_quantity || 0);
      const price = parseFloat(p.selling_price || p.mrp || 0);
      totalStockUnits += qty;
      estimatedRetailInventoryValue += qty * price;

      const threshold = p.low_stock_threshold || 10;
      if (qty <= 0) {
        outOfStockItems.push({ id: p.id, name: p.name, sku: p.sku, category: p.category, stockQuantity: qty, threshold });
      } else if (qty <= threshold) {
        lowStockItems.push({ id: p.id, name: p.name, sku: p.sku, category: p.category, stockQuantity: qty, threshold });
      }
    });

    return {
      totalProducts,
      totalStockUnits,
      estimatedRetailInventoryValue: Math.round(estimatedRetailInventoryValue * 100) / 100,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      lowStockItems,
      outOfStockItems
    };
  }

  // Mock Fallback
  return {
    totalProducts: 85,
    totalStockUnits: 2450,
    estimatedRetailInventoryValue: 348500,
    lowStockCount: 3,
    outOfStockCount: 1,
    lowStockItems: [
      { name: 'Tata Salt Vacuum Evaporated 1kg', stockQuantity: 3, threshold: 10 },
      { name: 'Surf Excel Easy Wash 1kg', stockQuantity: 5, threshold: 12 }
    ],
    outOfStockItems: [
      { name: 'Fortune Sunlite Sunflower Oil 1L', stockQuantity: 0, threshold: 10 }
    ]
  };
};

/**
 * 5. GST TAX SLAB REPORTS (Aggregated directly from invoice_items table)
 */
const getGstReport = async (query = {}) => {
  const { startDateISO, endDateISO } = parseDateRange(query.range || '30days', query.startDate, query.endDate);

  if (supabase) {
    // 1. Fetch Invoices in date range
    const { data: invoices } = await supabase.from('invoices')
      .select('id, invoice_number, invoice_type, created_at, subtotal, discount_amount, tax_amount, total_amount, invoice_status')
      .gte('created_at', startDateISO)
      .lte('created_at', endDateISO)
      .neq('invoice_status', 'CANCELLED');

    const invoiceIds = (invoices || []).map(i => i.id);

    // 2. Fetch invoice_items for tax slab aggregation
    let items = [];
    if (invoiceIds.length > 0) {
      const { data: fetchedItems } = await supabase.from('invoice_items')
        .select('invoice_id, product_name, quantity, selling_price, discount_amount, tax_percentage, tax_amount, subtotal')
        .in('invoice_id', invoiceIds);
      items = fetchedItems || [];
    }

    const slabMap = {
      '0%': { rate: 0, taxableAmount: 0, gstCollected: 0, itemHits: 0 },
      '5%': { rate: 5, taxableAmount: 0, gstCollected: 0, itemHits: 0 },
      '12%': { rate: 12, taxableAmount: 0, gstCollected: 0, itemHits: 0 },
      '18%': { rate: 18, taxableAmount: 0, gstCollected: 0, itemHits: 0 },
      '28%': { rate: 28, taxableAmount: 0, gstCollected: 0, itemHits: 0 }
    };

    items.forEach(item => {
      const pct = parseFloat(item.tax_percentage || 0);
      let slabKey = '5%';
      if (pct === 0) slabKey = '0%';
      else if (pct <= 5) slabKey = '5%';
      else if (pct <= 12) slabKey = '12%';
      else if (pct <= 18) slabKey = '18%';
      else slabKey = '28%';

      const lineSubtotal = parseFloat(item.subtotal || (item.quantity * item.selling_price));
      const lineDisc = parseFloat(item.discount_amount || 0);
      const taxable = Math.max(0, lineSubtotal - lineDisc);
      const tax = parseFloat(item.tax_amount || (taxable * (pct / 100)));

      slabMap[slabKey].taxableAmount += taxable;
      slabMap[slabKey].gstCollected += tax;
      slabMap[slabKey].itemHits += 1;
    });

    const taxSlabBreakdown = Object.keys(slabMap).map(slab => ({
      gstRate: slab,
      taxableAmount: Math.round(slabMap[slab].taxableAmount * 100) / 100,
      gstCollected: Math.round(slabMap[slab].gstCollected * 100) / 100,
      itemHits: slabMap[slab].itemHits
    }));

    const totalGstCollected = taxSlabBreakdown.reduce((sum, s) => sum + s.gstCollected, 0);
    const totalTaxableAmount = taxSlabBreakdown.reduce((sum, s) => sum + s.taxableAmount, 0);

    // POS vs Online GST Breakdown
    let posGst = 0;
    let onlineGst = 0;
    (invoices || []).forEach(inv => {
      const tax = parseFloat(inv.tax_amount || 0);
      if (inv.invoice_type === 'POS_SALE') posGst += tax;
      else onlineGst += tax;
    });

    return {
      invoiceCount: (invoices || []).length,
      totalTaxableAmount: Math.round(totalTaxableAmount * 100) / 100,
      totalGstCollected: Math.round(totalGstCollected * 100) / 100,
      posGstCollected: Math.round(posGst * 100) / 100,
      onlineGstCollected: Math.round(onlineGst * 100) / 100,
      taxSlabBreakdown
    };
  }

  // Mock Fallback
  return {
    invoiceCount: 42,
    totalTaxableAmount: 92000,
    totalGstCollected: 7350,
    posGstCollected: 3600,
    onlineGstCollected: 3750,
    taxSlabBreakdown: [
      { gstRate: '0%', taxableAmount: 12000, gstCollected: 0, itemHits: 45 },
      { gstRate: '5%', taxableAmount: 45000, gstCollected: 2250, itemHits: 120 },
      { gstRate: '12%', taxableAmount: 20000, gstCollected: 2400, itemHits: 60 },
      { gstRate: '18%', taxableAmount: 15000, gstCollected: 2700, itemHits: 35 },
      { gstRate: '28%', taxableAmount: 0, gstCollected: 0, itemHits: 0 }
    ]
  };
};

/**
 * 6. DELIVERY PERFORMANCE ANALYTICS
 */
const getDeliveryAnalytics = async (query = {}) => {
  const { startDateISO, endDateISO } = parseDateRange(query.range || '30days', query.startDate, query.endDate);

  if (supabase) {
    const { data: deliveries } = await supabase.from('deliveries')
      .select('id, order_id, delivery_partner_id, status, delivery_charge, distance_km, confirmed_at, delivered_at, created_at')
      .gte('created_at', startDateISO)
      .lte('created_at', endDateISO);

    const { data: partners } = await supabase.from('delivery_partners')
      .select('id, name, phone');

    const partnerMap = {};
    (partners || []).forEach(p => {
      partnerMap[p.id] = { id: p.id, name: p.name, phone: p.phone, deliveredCount: 0, totalDistanceKm: 0, totalChargesCollected: 0 };
    });

    let totalDeliveries = 0;
    let completedDeliveries = 0;
    let cancelledDeliveries = 0;
    let totalDeliveryTimeMinutes = 0;
    let validTimeCount = 0;
    let totalCharges = 0;
    let totalDistance = 0;

    (deliveries || []).forEach(d => {
      totalDeliveries++;
      const charge = parseFloat(d.delivery_charge || 0);
      const dist = parseFloat(d.distance_km || 0);

      if (d.status === 'DELIVERED') {
        completedDeliveries++;
        totalCharges += charge;
        totalDistance += dist;

        // Calculate average delivery time safely (filtering out null/malformed timestamps)
        if (d.delivered_at && d.confirmed_at) {
          const tStart = new Date(d.confirmed_at).getTime();
          const tEnd = new Date(d.delivered_at).getTime();
          if (!isNaN(tStart) && !isNaN(tEnd) && tEnd > tStart) {
            const durationMins = (tEnd - tStart) / (1000 * 60);
            totalDeliveryTimeMinutes += durationMins;
            validTimeCount++;
          }
        }

        // Partner Leaderboard
        if (d.delivery_partner_id && partnerMap[d.delivery_partner_id]) {
          partnerMap[d.delivery_partner_id].deliveredCount += 1;
          partnerMap[d.delivery_partner_id].totalDistanceKm += dist;
          partnerMap[d.delivery_partner_id].totalChargesCollected += charge;
        }
      } else if (d.status === 'CANCELLED' || d.status === 'FAILED') {
        cancelledDeliveries++;
      }
    });

    const avgDeliveryTimeMinutes = validTimeCount > 0 ? Math.round(totalDeliveryTimeMinutes / validTimeCount) : 22;

    const partnerLeaderboard = Object.values(partnerMap).map(p => ({
      ...p,
      totalDistanceKm: Math.round(p.totalDistanceKm * 10) / 10,
      totalChargesCollected: Math.round(p.totalChargesCollected * 100) / 100,
      avgDistancePerDelivery: p.deliveredCount > 0 ? Math.round((p.totalDistanceKm / p.deliveredCount) * 10) / 10 : 0
    })).sort((a, b) => b.deliveredCount - a.deliveredCount);

    return {
      totalDeliveries,
      completedDeliveries,
      cancelledDeliveries,
      avgDeliveryTimeMinutes,
      totalDeliveryChargesCollected: Math.round(totalCharges * 100) / 100,
      totalDistanceCoveredKm: Math.round(totalDistance * 10) / 10,
      partnerLeaderboard
    };
  }

  // Mock Fallback
  return {
    totalDeliveries: 45,
    completedDeliveries: 42,
    cancelledDeliveries: 3,
    avgDeliveryTimeMinutes: 24,
    totalDeliveryChargesCollected: 1420,
    totalDistanceCoveredKm: 142.0,
    partnerLeaderboard: [
      { name: 'Ramesh Kumar', phone: '9876543210', deliveredCount: 24, totalDistanceKm: 78.5, totalChargesCollected: 780, avgDistancePerDelivery: 3.3 },
      { name: 'Vikram Singh', phone: '9876543211', deliveredCount: 18, totalDistanceKm: 63.5, totalChargesCollected: 640, avgDistancePerDelivery: 3.5 }
    ]
  };
};

/**
 * 7. REPORTS & EXPORTS (CSV Generator)
 */
const generateCsvExport = async (type = 'sales', query = {}) => {
  const sanitize = (val) => `"${String(val || '').replace(/"/g, '""')}"`;

  if (type === 'sales') {
    const salesData = await getSalesAnalytics(query);
    let csv = 'Date,Online Revenue (INR),POS Revenue (INR),Total Revenue (INR),Orders Count\n';
    (salesData.dailyRevenueTrend || []).forEach(row => {
      csv += `${sanitize(row.date)},${row.onlineRevenue},${row.posRevenue},${row.totalRevenue},${row.orderCount}\n`;
    });
    return csv;
  }

  if (type === 'products') {
    const prodData = await getProductAnalytics(query);
    let csv = 'Rank,Product Name,Units Sold,Total Revenue (INR)\n';
    (prodData.topSellingProducts || []).forEach((p, i) => {
      csv += `${i + 1},${sanitize(p.name)},${p.quantitySold},${p.revenue}\n`;
    });
    return csv;
  }

  if (type === 'inventory') {
    const invData = await getInventoryAnalytics();
    let csv = 'Status,Product Name,SKU,Category,Current Stock,Low Stock Threshold\n';
    (invData.lowStockItems || []).forEach(p => {
      csv += `LOW_STOCK,${sanitize(p.name)},${sanitize(p.sku)},${sanitize(p.category)},${p.stockQuantity},${p.threshold}\n`;
    });
    (invData.outOfStockItems || []).forEach(p => {
      csv += `OUT_OF_STOCK,${sanitize(p.name)},${sanitize(p.sku)},${sanitize(p.category)},0,${p.threshold}\n`;
    });
    return csv;
  }

  if (type === 'gst') {
    const gstData = await getGstReport(query);
    let csv = 'GST Rate Slab,Taxable Amount (INR),GST Tax Collected (INR),Item Count\n';
    (gstData.taxSlabBreakdown || []).forEach(s => {
      csv += `${sanitize(s.gstRate)},${s.taxableAmount},${s.gstCollected},${s.itemHits}\n`;
    });
    return csv;
  }

  throw new AppError(`Unsupported CSV export type "${type}". Allowed: sales, products, inventory, gst`, HTTP_STATUS.BAD_REQUEST);
};

/**
 * 8. PDF PRINTABLE HTML BUSINESS REPORT
 */
const generatePdfMonthlyReportHtml = async (query = {}) => {
  const overview = await getDashboardOverview();
  const sales = await getSalesAnalytics({ range: '30days' });
  const gst = await getGstReport({ range: '30days' });
  const delivery = await getDeliveryAnalytics({ range: '30days' });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Chaudhary Kirana Store — Monthly Business Report</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #0F172A; }
    .header { text-align: center; border-bottom: 3px solid #06C167; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { margin: 0; color: #047857; font-size: 1.8rem; }
    .header p { margin: 4px 0 0 0; color: #64748B; font-size: 0.9rem; }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .card { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; border-radius: 10px; }
    .card-label { font-size: 0.78rem; color: #64748B; font-weight: 700; text-transform: uppercase; }
    .card-val { font-size: 1.4rem; font-weight: 800; color: #047857; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 0.9rem; }
    th, td { border: 1px solid #CBD5E1; padding: 8px 12px; text-align: left; }
    th { background: #ECFDF5; color: #047857; font-weight: 800; }
    .footer { margin-top: 40px; border-top: 1px solid #E2E8F0; padding-top: 12px; font-size: 0.8rem; color: #94A3B8; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>CHAUDHARY KIRANA STORE 🏪</h1>
    <p>Monthly Business Performance & GST Tax Compliance Report</p>
    <p>Timezone: Asia/Kolkata (IST) · Generated At: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
  </div>

  <div class="grid">
    <div class="card"><div class="card-label">Monthly Total Sales</div><div class="card-val">₹${sales.posVsOnlineBreakdown.totalRevenue.toLocaleString('en-IN')}</div></div>
    <div class="card"><div class="card-label">POS Counter Sales</div><div class="card-val">₹${sales.posVsOnlineBreakdown.posRevenue.toLocaleString('en-IN')}</div></div>
    <div class="card"><div class="card-label">Online Customer Sales</div><div class="card-val">₹${sales.posVsOnlineBreakdown.onlineRevenue.toLocaleString('en-IN')}</div></div>
    <div class="card"><div class="card-label">Total GST Tax Collected</div><div class="card-val">₹${gst.totalGstCollected.toLocaleString('en-IN')}</div></div>
    <div class="card"><div class="card-label">Completed Deliveries</div><div class="card-val">${delivery.completedDeliveries}</div></div>
    <div class="card"><div class="card-label">Avg Delivery Duration</div><div class="card-val">${delivery.avgDeliveryTimeMinutes} Mins</div></div>
  </div>

  <h2>GST Tax Slab Distribution (Immutable Invoice Items)</h2>
  <table>
    <thead>
      <tr><th>GST Rate Slab</th><th>Taxable Amount (INR)</th><th>GST Collected (INR)</th></tr>
    </thead>
    <tbody>
      ${(gst.taxSlabBreakdown || []).map(s => `
        <tr><td>${s.gstRate}</td><td>₹${s.taxableAmount.toLocaleString('en-IN')}</td><td>₹${s.gstCollected.toLocaleString('en-IN')}</td></tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    Verified & Confidential Report · Chaudhary Kirana Store Billing & Business Intelligence Engine
  </div>
</body>
</html>
  `;

  return html;
};

module.exports = {
  getDashboardOverview,
  getSalesAnalytics,
  getProductAnalytics,
  getInventoryAnalytics,
  getGstReport,
  getDeliveryAnalytics,
  generateCsvExport,
  generatePdfMonthlyReportHtml
};
