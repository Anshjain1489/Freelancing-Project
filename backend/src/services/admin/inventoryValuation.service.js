const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');
const { mockStockAdjustmentsMap, mockCostHistoryMap, getProductInventory } = require('./procurementAdmin.service');

/**
 * 1. Inventory Valuation & Gross Margin Report Engine
 */
const getInventoryValuationReport = async () => {
  let products = [];

  if (supabase) {
    try {
      const { data } = await supabase.from('products').select('*');
      if (data) products = data;
    } catch (e) {}
  }

  if (products.length === 0) {
    // Default fallback product sample
    products = [
      { id: 'p100', name: 'Aashirvaad Atta 5kg', category: 'Atta & Flours', price: 245.00 },
      { id: 'p101', name: 'Fortune Sunlite Oil 1L', category: 'Edible Oils', price: 140.00 },
      { id: 'p102', name: 'Tata Salt 1kg', category: 'Salt & Sugar', price: 28.00 },
      { id: 'p103', name: 'Amul Butter 500g', category: 'Dairy', price: 275.00 },
      { id: 'p104', name: 'Maggi Noodles 4-Pack', category: 'Snacks & Instant', price: 56.00 }
    ];
  }

  let totalPhysicalStock = 0;
  let totalInventoryValuation = 0.0;
  let totalPotentialRevenue = 0.0;

  const productValuations = products.map(prod => {
    const inv = getProductInventory(prod.id);
    const physicalStock = inv.stock_quantity || 0;
    const avgCostPrice = inv.average_cost_price || 100.00;
    const sellingPrice = parseFloat(prod.price || 150.00);

    const lineValuation = Math.round(physicalStock * avgCostPrice * 100) / 100;
    const linePotentialRevenue = Math.round(physicalStock * sellingPrice * 100) / 100;

    const grossProfitPerUnit = Math.round((sellingPrice - avgCostPrice) * 100) / 100;
    const grossMarginPct = sellingPrice > 0 ? Math.round((grossProfitPerUnit / sellingPrice) * 1000) / 10 : 0.0;

    totalPhysicalStock += physicalStock;
    totalInventoryValuation += lineValuation;
    totalPotentialRevenue += linePotentialRevenue;

    return {
      productId: prod.id,
      productName: prod.name,
      category: prod.category || 'General',
      physicalStock,
      reservedStock: inv.reserved_quantity || 0,
      averageCostPrice: avgCostPrice,
      sellingPrice,
      lineValuation,
      grossProfitPerUnit,
      grossMarginPct,
      lastUpdated: inv.updated_at
    };
  });

  totalInventoryValuation = Math.round(totalInventoryValuation * 100) / 100;
  totalPotentialRevenue = Math.round(totalPotentialRevenue * 100) / 100;
  const totalPotentialProfit = Math.round((totalPotentialRevenue - totalInventoryValuation) * 100) / 100;
  const overallGrossMarginPct = totalPotentialRevenue > 0 ? Math.round((totalPotentialProfit / totalPotentialRevenue) * 1000) / 10 : 0.0;

  return {
    summary: {
      totalProductsCount: products.length,
      totalPhysicalStock,
      totalInventoryValuation,
      totalPotentialRevenue,
      totalPotentialProfit,
      overallGrossMarginPct,
      valuationSource: 'OPERATIONAL_AVERAGE_COST_PRICE'
    },
    products: productValuations
  };
};

/**
 * 2. Immutable Stock Adjustment Creation
 */
const createStockAdjustment = async (adjData, userId) => {
  if (!adjData || !adjData.productId || typeof adjData.quantityChange !== 'number') {
    throw new AppError('Adjustment must include productId and integer quantityChange', HTTP_STATUS.BAD_REQUEST);
  }

  const validReasons = ['DAMAGE', 'EXPIRY', 'THEFT_LOSS', 'MANUAL_CORRECTION'];
  const reason = adjData.reason || 'MANUAL_CORRECTION';
  if (!validReasons.includes(reason)) {
    throw new AppError(`Invalid adjustment reason "${reason}". Allowed: ${validReasons.join(', ')}`, HTTP_STATUS.BAD_REQUEST);
  }

  const inv = getProductInventory(adjData.productId);
  const currentStock = inv.stock_quantity;
  const qtyChange = parseInt(adjData.quantityChange, 10);

  if (currentStock + qtyChange < 0) {
    throw new AppError(`Stock adjustment would result in negative inventory (Current: ${currentStock}, Change: ${qtyChange})`, HTTP_STATUS.BAD_REQUEST);
  }

  // Update physical stock
  inv.stock_quantity = currentStock + qtyChange;
  inv.updated_at = new Date().toISOString();

  const unitCost = parseFloat(adjData.unitCost || inv.average_cost_price || 0);
  const totalLossVal = Math.round(Math.abs(qtyChange) * unitCost * 100) / 100;

  const id = `adj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const adjustmentRecord = {
    id,
    product_id: adjData.productId,
    quantity_change: qtyChange,
    reason,
    unit_cost: unitCost,
    total_loss_value: totalLossVal,
    notes: adjData.notes || 'Manual Inventory Adjustment',
    reverses_adjustment_id: adjData.reversesAdjustmentId || null,
    created_by: userId || 'admin',
    created_at: new Date().toISOString()
  };

  mockStockAdjustmentsMap.set(id, adjustmentRecord);

  if (supabase) {
    try {
      await supabase.from('stock_adjustments').insert([adjustmentRecord]);
    } catch (e) {}
  }

  return { adjustment: adjustmentRecord, newPhysicalStock: inv.stock_quantity };
};

/**
 * 3. Immutable Stock Adjustment Reversal
 */
const reverseStockAdjustment = async (adjustmentId, notes, userId) => {
  const existingAdj = mockStockAdjustmentsMap.get(adjustmentId);

  if (!existingAdj) {
    throw new AppError('Original Stock Adjustment not found to reverse', HTTP_STATUS.NOT_FOUND);
  }

  // Compensating inverse quantity
  const reversalQty = -existingAdj.quantity_change;

  return await createStockAdjustment({
    productId: existingAdj.product_id,
    quantityChange: reversalQty,
    reason: 'MANUAL_CORRECTION',
    unitCost: existingAdj.unit_cost,
    notes: notes || `Compensating reversal of adjustment #${adjustmentId}`,
    reversesAdjustmentId: adjustmentId
  }, userId);
};

/**
 * 4. Fetch Stock Adjustments History
 */
const getStockAdjustments = async () => {
  return { adjustments: Array.from(mockStockAdjustmentsMap.values()) };
};

/**
 * 5. Fetch Product Inventory Cost History
 */
const getCostHistory = async (productId) => {
  const history = Array.from(mockCostHistoryMap.values()).filter(c => !productId || c.product_id === productId);
  return { costHistory: history };
};

module.exports = {
  getInventoryValuationReport,
  createStockAdjustment,
  reverseStockAdjustment,
  getStockAdjustments,
  getCostHistory
};
