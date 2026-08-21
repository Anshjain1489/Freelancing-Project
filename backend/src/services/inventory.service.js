const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { HTTP_STATUS, ERROR_CODES } = require('../constants/statusCodes');
const { logAdminActivity } = require('./adminLog.service');

const getInventoryDetails = async (productId) => {
  if (supabase) {
    const { data: inv, error } = await supabase
      .from('inventory')
      .select('*, products ( id, name, sku )')
      .eq('product_id', productId)
      .single();

    if (error || !inv) {
      throw new AppError('Inventory record not found for product', HTTP_STATUS.NOT_FOUND);
    }

    const { data: movements } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      productId: inv.product_id,
      productName: inv.products?.name,
      sku: inv.products?.sku,
      quantity: inv.quantity,
      reservedQuantity: inv.reserved_quantity,
      availableQuantity: Math.max(0, inv.quantity - inv.reserved_quantity),
      lowStockThreshold: inv.low_stock_threshold,
      reorderLevel: inv.reorder_level,
      recentMovements: movements || []
    };
  }

  return {
    productId,
    quantity: 40,
    reservedQuantity: 0,
    availableQuantity: 40,
    lowStockThreshold: 5,
    reorderLevel: 10
  };
};

const updateInventory = async (productId, updateData, adminId, req = null) => {
  const payload = {};
  if (updateData.quantity !== undefined) payload.quantity = updateData.quantity;
  if (updateData.lowStockThreshold !== undefined) payload.low_stock_threshold = updateData.lowStockThreshold;
  if (updateData.reorderLevel !== undefined) payload.reorder_level = updateData.reorderLevel;

  if (supabase) {
    const { data, error } = await supabase
      .from('inventory')
      .update(payload)
      .eq('product_id', productId)
      .select()
      .single();

    if (error) throw new AppError('Failed to update inventory: ' + error.message, HTTP_STATUS.BAD_REQUEST);

    await logAdminActivity(adminId, 'INVENTORY_UPDATED', 'inventory', productId, payload, req);
    return data;
  }

  return { productId, ...updateData };
};

const adjustInventory = async (productId, { quantityChange, movementType, notes }, adminId, req = null) => {
  if (supabase) {
    const { data: currentInv } = await supabase
      .from('inventory')
      .select('quantity')
      .eq('product_id', productId)
      .single();

    if (!currentInv) throw new AppError('Inventory record not found', HTTP_STATUS.NOT_FOUND);

    const newQuantity = currentInv.quantity + quantityChange;
    if (newQuantity < 0) {
      throw new AppError(`Cannot adjust stock: Insufficient stock available. Current: ${currentInv.quantity}, Requested change: ${quantityChange}`, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.OUT_OF_STOCK);
    }

    // Update quantity
    const { data: updatedInv, error: updateErr } = await supabase
      .from('inventory')
      .update({ quantity: newQuantity })
      .eq('product_id', productId)
      .select()
      .single();

    if (updateErr) throw new AppError('Failed to adjust stock', HTTP_STATUS.INTERNAL_SERVER_ERROR);

    // Record movement audit
    await supabase.from('inventory_movements').insert([{
      product_id: productId,
      quantity_change: quantityChange,
      movement_type: movementType,
      notes: notes || 'Manual admin inventory adjustment',
      created_by: adminId
    }]);

    await logAdminActivity(adminId, 'INVENTORY_ADJUSTED', 'inventory', productId, { quantityChange, movementType, newQuantity }, req);

    return {
      productId,
      previousQuantity: currentInv.quantity,
      newQuantity,
      quantityChange,
      movementType
    };
  }

  return { productId, quantityChange, movementType, notes };
};

const getLowStockAlerts = async () => {
  if (supabase) {
    const { data, error } = await supabase.from('inventory').select(`
      id, quantity, reserved_quantity, low_stock_threshold,
      products ( id, name, sku, unit, unit_value, is_active, categories ( name ) )
    `);

    if (error) throw new AppError('Failed to fetch low stock alerts', HTTP_STATUS.INTERNAL_SERVER_ERROR);

    const lowStockItems = data.filter(inv => {
      const available = inv.quantity - inv.reserved_quantity;
      return available <= inv.low_stock_threshold && inv.products?.is_active !== false;
    }).map(inv => ({
      productId: inv.products?.id,
      productName: inv.products?.name,
      sku: inv.products?.sku,
      categoryName: inv.products?.categories?.name,
      quantity: inv.quantity,
      reservedQuantity: inv.reserved_quantity,
      availableQuantity: Math.max(0, inv.quantity - inv.reserved_quantity),
      lowStockThreshold: inv.low_stock_threshold
    }));

    return lowStockItems;
  }

  return [
    { productId: 'p3', productName: 'Rajdhani Sooji 500g', availableQuantity: 3, lowStockThreshold: 5 }
  ];
};

module.exports = {
  getInventoryDetails,
  updateInventory,
  adjustInventory,
  getLowStockAlerts
};
