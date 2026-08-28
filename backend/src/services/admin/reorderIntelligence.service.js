const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');

// Memory store fallback for unit tests and offline mode
const mockReorderRecommendations = new Map();

/**
 * 1. Calculate Reorder Recommendation for a Single Product
 */
const calculateProductReorderStatus = (product, sales30DaysQty = 0, leadTimeDays = 3, safetyStockDays = 5) => {
  const stockQuantity = Math.max(0, parseInt(product.stock_quantity || product.stockQuantity || 0, 10));
  const reservedQuantity = Math.max(0, parseInt(product.reserved_quantity || product.reservedQuantity || 0, 10));
  const availableStock = Math.max(0, stockQuantity - reservedQuantity);

  const salesQty30d = Math.max(0, parseInt(sales30DaysQty || 0, 10));
  const avgDailySales = Math.round((salesQty30d / 30) * 100) / 100;

  let daysOfSupply = 999;
  let statusLevel = 'HEALTHY';

  if (availableStock <= 0) {
    statusLevel = 'OUT_OF_STOCK';
    daysOfSupply = 0;
  } else if (avgDailySales === 0) {
    statusLevel = 'NO_SALES_DATA';
    daysOfSupply = 999;
  } else {
    daysOfSupply = Math.round((availableStock / avgDailySales) * 10) / 10;
    if (daysOfSupply <= leadTimeDays) {
      statusLevel = 'CRITICAL';
    } else if (daysOfSupply <= (leadTimeDays + safetyStockDays) || availableStock <= (product.low_stock_threshold || 10)) {
      statusLevel = 'REORDER_SOON';
    } else {
      statusLevel = 'HEALTHY';
    }
  }

  // Calculate recommended reorder quantity if reorder is needed
  let recommendedQty = 0;
  if (['OUT_OF_STOCK', 'CRITICAL', 'REORDER_SOON'].includes(statusLevel)) {
    const targetCoverageDays = 30;
    const requiredStock = Math.ceil((leadTimeDays + safetyStockDays + targetCoverageDays) * avgDailySales);
    recommendedQty = Math.max(20, requiredStock - availableStock);
  }

  const snapshot = {
    productId: product.id,
    productName: product.name,
    sku: product.sku || 'SKU-GENERIC',
    currentStock: stockQuantity,
    reservedStock: reservedQuantity,
    availableStock,
    salesQty30d,
    avgDailySales,
    daysOfSupply,
    leadTimeDays,
    safetyStockDays,
    statusLevel,
    recommendedQty,
    snapshotTimestamp: new Date().toISOString()
  };

  return snapshot;
};

/**
 * 2. Generate and Sync All Product Reorder Recommendations
 */
const generateReorderRecommendations = async () => {
  const thirtyDaysAgoISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  if (supabase) {
    // 1. Fetch products
    const { data: products } = await supabase.from('products')
      .select('id, name, sku, category, stock_quantity, reserved_quantity, low_stock_threshold, is_active')
      .eq('is_active', true);

    // 2. Fetch 30-day sales items
    const { data: orderItems } = await supabase.from('order_items')
      .select('product_id, quantity, created_at')
      .gte('created_at', thirtyDaysAgoISO);

    const { data: posItems } = await supabase.from('pos_sale_items')
      .select('product_id, quantity, created_at')
      .gte('created_at', thirtyDaysAgoISO);

    const salesMap = {};
    (orderItems || []).forEach(item => {
      salesMap[item.product_id] = (salesMap[item.product_id] || 0) + parseFloat(item.quantity || 1);
    });
    (posItems || []).forEach(item => {
      salesMap[item.product_id] = (salesMap[item.product_id] || 0) + parseFloat(item.quantity || 1);
    });

    const recommendations = [];

    for (const prod of (products || [])) {
      const sold30d = salesMap[prod.id] || 0;
      const snapshot = calculateProductReorderStatus(prod, sold30d);

      if (['OUT_OF_STOCK', 'CRITICAL', 'REORDER_SOON'].includes(snapshot.statusLevel)) {
        const recRecord = {
          id: `rec-${prod.id}`,
          product_id: prod.id,
          product_name: prod.name,
          current_stock: snapshot.currentStock,
          reserved_stock: snapshot.reservedStock,
          available_stock: snapshot.availableStock,
          sales_qty_30d: snapshot.salesQty30d,
          avg_daily_sales: snapshot.avgDailySales,
          days_of_supply: snapshot.daysOfSupply,
          lead_time_days: snapshot.leadTimeDays,
          safety_stock: snapshot.safetyStockDays,
          status_level: snapshot.statusLevel,
          recommended_qty: snapshot.recommendedQty,
          status: 'PENDING',
          calculation_snapshot: snapshot,
          updated_at: new Date().toISOString()
        };

        await supabase.from('inventory_reorder_recommendations').upsert([recRecord], { onConflict: 'id' });
        recommendations.push(recRecord);
      }
    }

    return { count: recommendations.length, recommendations };
  }

  // Memory Fallback
  const mockProducts = [
    { id: 'p100', name: 'Aashirvaad Shuddh Chakki Atta 5kg', stock_quantity: 8, reserved_quantity: 2, low_stock_threshold: 10 },
    { id: 'p101', name: 'Fortune Sunlite Sunflower Oil 1L', stock_quantity: 0, reserved_quantity: 0, low_stock_threshold: 10 },
    { id: 'p102', name: 'Tata Salt Vacuum Evaporated 1kg', stock_quantity: 4, reserved_quantity: 1, low_stock_threshold: 10 }
  ];

  const results = mockProducts.map(p => {
    const snapshot = calculateProductReorderStatus(p, 60);
    const rec = {
      id: `rec-${p.id}`,
      product_id: p.id,
      product_name: p.name,
      current_stock: snapshot.currentStock,
      reserved_stock: snapshot.reservedStock,
      available_stock: snapshot.availableStock,
      sales_qty_30d: snapshot.salesQty30d,
      avg_daily_sales: snapshot.avgDailySales,
      days_of_supply: snapshot.daysOfSupply,
      lead_time_days: snapshot.leadTimeDays,
      safety_stock: snapshot.safetyStockDays,
      status_level: snapshot.statusLevel,
      recommended_qty: snapshot.recommendedQty,
      status: 'PENDING',
      calculation_snapshot: snapshot
    };
    mockReorderRecommendations.set(rec.id, rec);
    return rec;
  });

  return { count: results.length, recommendations: results };
};

/**
 * 3. List Reorder Recommendations
 */
const getReorderRecommendations = async (query = {}) => {
  if (supabase) {
    let q = supabase.from('inventory_reorder_recommendations').select('*').eq('status', 'PENDING');
    if (query.statusLevel) q = q.eq('status_level', query.statusLevel);
    const { data: recs } = await q;
    return { recommendations: recs || [] };
  }

  return { recommendations: Array.from(mockReorderRecommendations.values()) };
};

/**
 * 4. Dismiss Reorder Recommendation
 */
const dismissRecommendation = async (recommendationId) => {
  if (supabase) {
    const { data, error } = await supabase.from('inventory_reorder_recommendations')
      .update({ status: 'DISMISSED', updated_at: new Date().toISOString() })
      .eq('id', recommendationId)
      .select()
      .maybeSingle();

    if (error || !data) {
      throw new AppError('Reorder recommendation not found or already dismissed', HTTP_STATUS.NOT_FOUND);
    }
    return { success: true, recommendation: data };
  }

  if (mockReorderRecommendations.has(recommendationId)) {
    const item = mockReorderRecommendations.get(recommendationId);
    item.status = 'DISMISSED';
    return { success: true, recommendation: item };
  }

  throw new AppError('Reorder recommendation not found', HTTP_STATUS.NOT_FOUND);
};

module.exports = {
  calculateProductReorderStatus,
  generateReorderRecommendations,
  getReorderRecommendations,
  dismissRecommendation
};
