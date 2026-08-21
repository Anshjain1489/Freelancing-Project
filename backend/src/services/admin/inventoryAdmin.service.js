const supabase = require('../../config/supabase');
const { logAdminActivity } = require('../adminLog.service');
const eventBus = require('../../events/eventBus');
const EVENT_TYPES = require('../../events/eventTypes');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getInventoryOverview = async (queryParams = {}) => {
  if (supabase) {
    const { data: inv, error } = await supabase.from('inventory')
      .select('*, products ( id, name, slug, brand, selling_price, is_active )');

    if (error) throw new AppError('Failed to fetch inventory overview', HTTP_STATUS.INTERNAL_SERVER_ERROR);

    const formatted = inv.map(i => ({
      id: i.id,
      productId: i.product_id,
      productName: i.products?.name || 'Unknown Product',
      brand: i.products?.brand,
      sellingPrice: i.products?.selling_price,
      quantity: i.quantity,
      lowStockThreshold: i.low_stock_threshold,
      status: i.quantity === 0 ? 'OUT_OF_STOCK' : i.quantity <= i.low_stock_threshold ? 'LOW_STOCK' : 'IN_STOCK',
      updatedAt: i.updated_at
    }));

    return { items: formatted };
  }

  // Mock Fallback
  return {
    items: [
      { id: 'inv-1', productId: 'p1', productName: 'Aashirvaad Atta 5kg', quantity: 3, lowStockThreshold: 5, status: 'LOW_STOCK' },
      { id: 'inv-2', productId: 'p2', productName: 'Fortune Oil 1L', quantity: 24, lowStockThreshold: 5, status: 'IN_STOCK' },
      { id: 'inv-3', productId: 'p3', productName: 'Amul Butter 500g', quantity: 0, lowStockThreshold: 5, status: 'OUT_OF_STOCK' }
    ]
  };
};

const adjustStock = async (userId, productId, { quantityChange, reason = 'RESTOCK' }, req = null) => {
  if (!quantityChange || isNaN(quantityChange)) {
    throw new AppError('Valid quantity change is required', HTTP_STATUS.BAD_REQUEST);
  }

  if (supabase) {
    const { data: currentInv } = await supabase.from('inventory').select('*').eq('product_id', productId).single();
    if (!currentInv) throw new AppError('Inventory record not found for product', HTTP_STATUS.NOT_FOUND);

    const newQuantity = currentInv.quantity + parseInt(quantityChange, 10);
    if (newQuantity < 0) {
      throw new AppError('Stock adjustment would result in negative stock quantity', HTTP_STATUS.BAD_REQUEST);
    }

    // 1. Update inventory stock
    const { data: updated } = await supabase.from('inventory')
      .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
      .eq('product_id', productId)
      .select()
      .single();

    // 2. Insert audit movement record
    await supabase.from('inventory_movements').insert([{
      product_id: productId,
      quantity_change: quantityChange,
      movement_type: quantityChange > 0 ? 'RESTOCK' : 'MANUAL_ADJUSTMENT',
      notes: reason,
      created_by: userId
    }]);

    await logAdminActivity(userId, 'INVENTORY_UPDATED', 'inventory', productId, { oldQty: currentInv.quantity, newQty: newQuantity, reason }, req);

    // 3. Trigger low stock event if stock dropped below threshold
    if (newQuantity <= currentInv.low_stock_threshold) {
      eventBus.emit(EVENT_TYPES.LOW_STOCK, {
        productId,
        productName: 'Adjusted Product',
        currentStock: newQuantity
      });
    }

    return { productId, newQuantity, message: 'Stock updated successfully' };
  }

  return { productId, newQuantity: 20, message: 'Stock updated successfully' };
};

module.exports = {
  getInventoryOverview,
  adjustStock
};
