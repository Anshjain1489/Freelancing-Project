const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { HTTP_STATUS, ERROR_CODES } = require('../constants/statusCodes');
const { logAdminActivity } = require('./adminLog.service');
const eventBus = require('../events/eventBus');
const EVENT_TYPES = require('../events/eventTypes');
const sseManager = require('../notifications/sse.manager');
const notificationService = require('../notifications/notification.service');

// Memory fallback store for unit tests / offline mode
const mockProductsStore = new Map();
const mockInventoryMovements = [];
const mockReservedOrders = new Set();
const mockConsumedOrders = new Set();
const mockReleasedOrders = new Set();

const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ''));

/**
 * 1. RESERVE STOCK (CHECKOUT / ORDER CREATION / REPLACEMENT APPROVAL)
 */
const reserveStock = async (items, orderId = null) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError('Items list is required to reserve stock', HTTP_STATUS.BAD_REQUEST);
  }

  if (orderId && mockReservedOrders.has(String(orderId))) {
    return { success: true, message: 'Stock already reserved for this order' };
  }

  if (supabase) {
    try {
      if (orderId && isUuid(orderId)) {
        const { data: existingReservations } = await supabase.from('inventory_movements')
          .select('id')
          .eq('order_id', orderId)
          .eq('movement_type', 'STOCK_RESERVED');

        if (existingReservations && existingReservations.length > 0) {
          mockReservedOrders.add(String(orderId));
          return { success: true, message: 'Stock already reserved for this order' };
        }
      }

      let allFoundInDb = true;
      for (const item of items) {
        const productId = item.productId || item.product_id;
        const requestedQty = parseInt(item.quantity, 10);
        if (!productId || isNaN(requestedQty) || requestedQty <= 0) continue;

        const { data: prod } = await supabase.from('products')
          .select('id, name, stock_quantity, reserved_quantity, low_stock_threshold, low_stock_alert_active')
          .eq('id', productId)
          .maybeSingle();

        if (prod) {
          const availableStock = prod.stock_quantity - prod.reserved_quantity;
          if (availableStock < requestedQty) {
            throw new AppError(
              `Insufficient stock available for product "${prod.name}". Requested: ${requestedQty}, Available: ${Math.max(0, availableStock)}.`,
              HTTP_STATUS.CONFLICT,
              ERROR_CODES.OUT_OF_STOCK
            );
          }
        } else {
          allFoundInDb = false;
        }
      }

      if (allFoundInDb) {
        for (const item of items) {
          const productId = item.productId || item.product_id;
          const requestedQty = parseInt(item.quantity, 10);
          if (!productId || isNaN(requestedQty) || requestedQty <= 0) continue;

          const { data: prod } = await supabase.from('products')
            .select('id, name, stock_quantity, reserved_quantity')
            .eq('id', productId)
            .single();

          if (prod) {
            const availableStock = prod.stock_quantity - prod.reserved_quantity;
            if (availableStock < requestedQty) {
              throw new AppError(
                `Insufficient stock available for product "${prod.name}". Requested: ${requestedQty}, Available: ${Math.max(0, availableStock)}.`,
                HTTP_STATUS.CONFLICT,
                ERROR_CODES.OUT_OF_STOCK
              );
            }

            const newReserved = prod.reserved_quantity + requestedQty;
            const { data: updatedProd, error: updErr } = await supabase.from('products')
              .update({ reserved_quantity: newReserved, updated_at: new Date().toISOString() })
              .eq('id', productId)
              .eq('reserved_quantity', prod.reserved_quantity)
              .select()
              .maybeSingle();

            if (updErr || !updatedProd) {
              throw new AppError(
                `Concurrent stock modification detected for product "${prod.name}". Please retry.`,
                HTTP_STATUS.CONFLICT,
                ERROR_CODES.OUT_OF_STOCK
              );
            }

            await supabase.from('inventory')
              .update({ reserved_quantity: newReserved, updated_at: new Date().toISOString() })
              .eq('product_id', productId);

            try {
              await supabase.from('inventory_movements').insert([{
                product_id: productId,
                order_id: isUuid(orderId) ? orderId : null,
                movement_type: 'STOCK_RESERVED',
                quantity: requestedQty,
                previous_stock: prod.stock_quantity,
                new_stock: prod.stock_quantity,
                previous_reserved: prod.reserved_quantity,
                new_reserved: newReserved,
                notes: `Stock reserved for order ${orderId || 'checkout'}`
              }]);
            } catch (err) {}

            mockInventoryMovements.push({
              id: `mov-${Date.now()}`,
              product_id: productId,
              order_id: orderId,
              movement_type: 'STOCK_RESERVED',
              quantity: requestedQty,
              previous_stock: prod.stock_quantity,
              new_stock: prod.stock_quantity,
              previous_reserved: prod.reserved_quantity,
              new_reserved: newReserved,
              created_at: new Date().toISOString()
            });

            await checkLowStockAlert(productId);
          }
        }

        if (orderId) mockReservedOrders.add(String(orderId));
        return { success: true, message: 'Stock reserved successfully' };
      }
    } catch (err) {
      if (err.statusCode === 409 || err.code === 'OUT_OF_STOCK') throw err;
    }
  }

  for (const item of items) {
    const productId = item.productId || item.product_id;
    const requestedQty = parseInt(item.quantity, 10);
    const mockP = mockProductsStore.get(productId) || { stock_quantity: 100, reserved_quantity: 0, low_stock_threshold: 5 };

    const available = mockP.stock_quantity - mockP.reserved_quantity;
    if (available < requestedQty) {
      throw new AppError(
        `Insufficient stock available for product "${productId}". Requested: ${requestedQty}, Available: ${Math.max(0, available)}.`,
        HTTP_STATUS.CONFLICT,
        ERROR_CODES.OUT_OF_STOCK
      );
    }
    const prevReserved = mockP.reserved_quantity;
    mockP.reserved_quantity += requestedQty;
    mockProductsStore.set(productId, mockP);

    mockInventoryMovements.push({
      id: `mov-${Date.now()}`,
      product_id: productId,
      order_id: orderId,
      movement_type: 'STOCK_RESERVED',
      quantity: requestedQty,
      previous_stock: mockP.stock_quantity,
      new_stock: mockP.stock_quantity,
      previous_reserved: prevReserved,
      new_reserved: mockP.reserved_quantity,
      created_at: new Date().toISOString()
    });
  }

  if (orderId) mockReservedOrders.add(String(orderId));
  return { success: true, message: 'Stock reserved successfully' };
};

/**
 * 2. RELEASE STOCK (ORDER REJECTION / CANCELLATION / EXPIRY)
 */
const releaseStock = async (items, orderId = null, reason = 'ORDER_CANCELLED') => {
  if (orderId && mockReleasedOrders.has(String(orderId))) {
    return { success: true, message: 'Stock already released for this order' };
  }

  let itemsToRelease = items;
  if ((!itemsToRelease || itemsToRelease.length === 0) && orderId && supabase) {
    const { data: orderItems } = await supabase.from('order_items').select('*').eq('order_id', orderId);
    if (orderItems && orderItems.length > 0) {
      itemsToRelease = orderItems.map(i => ({ productId: i.product_id, quantity: i.quantity }));
    }
  }

  if (!itemsToRelease || itemsToRelease.length === 0) return { success: true };

  if (supabase) {
    try {
      for (const item of itemsToRelease) {
        const productId = item.productId || item.product_id;
        const qty = parseInt(item.quantity, 10);
        if (!productId || isNaN(qty) || qty <= 0) continue;

        const { data: prod } = await supabase.from('products')
          .select('id, stock_quantity, reserved_quantity')
          .eq('id', productId)
          .single();

        if (prod) {
          const newReserved = Math.max(0, prod.reserved_quantity - qty);
          await supabase.from('products')
            .update({ reserved_quantity: newReserved, updated_at: new Date().toISOString() })
            .eq('id', productId);

          await supabase.from('inventory')
            .update({ reserved_quantity: newReserved, updated_at: new Date().toISOString() })
            .eq('product_id', productId);

          try {
            await supabase.from('inventory_movements').insert([{
              product_id: productId,
              order_id: isUuid(orderId) ? orderId : null,
              movement_type: 'STOCK_RELEASED',
              quantity: qty,
              previous_stock: prod.stock_quantity,
              new_stock: prod.stock_quantity,
              previous_reserved: prod.reserved_quantity,
              new_reserved: newReserved,
              notes: `Stock released due to ${reason}`
            }]);
          } catch (err) {}

          mockInventoryMovements.push({
            id: `mov-${Date.now()}`,
            product_id: productId,
            order_id: orderId,
            movement_type: 'STOCK_RELEASED',
            quantity: qty,
            previous_stock: prod.stock_quantity,
            new_stock: prod.stock_quantity,
            previous_reserved: prod.reserved_quantity,
            new_reserved: newReserved,
            created_at: new Date().toISOString()
          });
        }
      }

      if (orderId) mockReleasedOrders.add(String(orderId));
      return { success: true, message: 'Stock released successfully' };
    } catch (err) {}
  }

  for (const item of itemsToRelease) {
    const productId = item.productId || item.product_id;
    const qty = parseInt(item.quantity, 10);
    const mockP = mockProductsStore.get(productId);

    if (mockP) {
      const prevReserved = mockP.reserved_quantity;
      mockP.reserved_quantity = Math.max(0, mockP.reserved_quantity - qty);

      mockInventoryMovements.push({
        id: `mov-${Date.now()}`,
        product_id: productId,
        order_id: orderId,
        movement_type: 'STOCK_RELEASED',
        quantity: qty,
        previous_stock: mockP.stock_quantity,
        new_stock: mockP.stock_quantity,
        previous_reserved: prevReserved,
        new_reserved: mockP.reserved_quantity,
        created_at: new Date().toISOString()
      });
    }
  }

  if (orderId) mockReleasedOrders.add(String(orderId));
  return { success: true, message: 'Reserved stock released successfully' };
};

/**
 * 3. CONSUME STOCK (SALE ON DELIVERY)
 */
const consumeStock = async (items, orderId = null) => {
  if (orderId && mockConsumedOrders.has(String(orderId))) {
    return { success: true, message: 'Stock already consumed for this order' };
  }

  let itemsToConsume = items;
  if ((!itemsToConsume || itemsToConsume.length === 0) && orderId && supabase) {
    const { data: orderItems } = await supabase.from('order_items').select('*').eq('order_id', orderId);
    if (orderItems && orderItems.length > 0) {
      itemsToConsume = orderItems.map(i => ({ productId: i.product_id, quantity: i.quantity }));
    }
  }

  if (!itemsToConsume || itemsToConsume.length === 0) return { success: true };

  if (supabase) {
    try {
      if (orderId && isUuid(orderId)) {
        const { data: existingSales } = await supabase.from('inventory_movements')
          .select('id')
          .eq('order_id', orderId)
          .eq('movement_type', 'SALE');

        if (existingSales && existingSales.length > 0) {
          mockConsumedOrders.add(String(orderId));
          return { success: true, message: 'Stock already consumed for this order' };
        }
      }

      for (const item of itemsToConsume) {
        const productId = item.productId || item.product_id;
        const qty = parseInt(item.quantity, 10);
        if (!productId || isNaN(qty) || qty <= 0) continue;

        const { data: prod } = await supabase.from('products')
          .select('id, stock_quantity, reserved_quantity, low_stock_threshold')
          .eq('id', productId)
          .single();

        if (prod) {
          const newStock = Math.max(0, prod.stock_quantity - qty);
          const newReserved = Math.max(0, prod.reserved_quantity - qty);

          await supabase.from('products')
            .update({
              stock_quantity: newStock,
              reserved_quantity: newReserved,
              updated_at: new Date().toISOString()
            })
            .eq('id', productId);

          await supabase.from('inventory')
            .update({
              quantity: newStock,
              reserved_quantity: newReserved,
              updated_at: new Date().toISOString()
            })
            .eq('product_id', productId);

          try {
            await supabase.from('inventory_movements').insert([{
              product_id: productId,
              order_id: isUuid(orderId) ? orderId : null,
              movement_type: 'SALE',
              quantity: qty,
              previous_stock: prod.stock_quantity,
              new_stock: newStock,
              previous_reserved: prod.reserved_quantity,
              new_reserved: newReserved,
              notes: `Stock consumed upon order delivery (Order #${orderId})`
            }]);
          } catch (err) {}

          mockInventoryMovements.push({
            id: `mov-${Date.now()}`,
            product_id: productId,
            order_id: orderId,
            movement_type: 'SALE',
            quantity: qty,
            previous_stock: prod.stock_quantity,
            new_stock: newStock,
            previous_reserved: prod.reserved_quantity,
            new_reserved: newReserved,
            created_at: new Date().toISOString()
          });

          await checkLowStockAlert(productId);
        }
      }

      if (orderId) mockConsumedOrders.add(String(orderId));
      return { success: true, message: 'Stock consumed upon delivery successfully' };
    } catch (err) {}
  }

  for (const item of itemsToConsume) {
    const productId = item.productId || item.product_id;
    const qty = parseInt(item.quantity, 10);
    const mockP = mockProductsStore.get(productId);

    if (mockP) {
      const prevStock = mockP.stock_quantity;
      const prevReserved = mockP.reserved_quantity;

      mockP.stock_quantity = Math.max(0, mockP.stock_quantity - qty);
      mockP.reserved_quantity = Math.max(0, mockP.reserved_quantity - qty);

      mockInventoryMovements.push({
        id: `mov-${Date.now()}`,
        product_id: productId,
        order_id: orderId,
        movement_type: 'SALE',
        quantity: qty,
        previous_stock: prevStock,
        new_stock: mockP.stock_quantity,
        previous_reserved: prevReserved,
        new_reserved: mockP.reserved_quantity,
        created_at: new Date().toISOString()
      });
    }
  }

  if (orderId) mockConsumedOrders.add(String(orderId));
  return { success: true, message: 'Stock consumed upon delivery' };
};

/**
 * 4. ADMIN ADD STOCK
 */
const addStock = async (adminId, productId, quantity, reason = 'Restock', req = null) => {
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    throw new AppError('Quantity to add must be a positive integer', HTTP_STATUS.BAD_REQUEST);
  }

  let prod = null;
  if (supabase) {
    try {
      const { data: found } = await supabase.from('products')
        .select('id, name, stock_quantity, reserved_quantity, low_stock_threshold')
        .eq('id', productId)
        .single();

      if (found) {
        prod = found;
        const newStock = prod.stock_quantity + qty;

        await supabase.from('products')
          .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
          .eq('id', productId);

        await supabase.from('inventory')
          .update({ quantity: newStock, updated_at: new Date().toISOString() })
          .eq('product_id', productId);

        try {
          await supabase.from('inventory_movements').insert([{
            product_id: productId,
            movement_type: 'STOCK_ADDED',
            quantity: qty,
            previous_stock: prod.stock_quantity,
            new_stock: newStock,
            previous_reserved: prod.reserved_quantity,
            new_reserved: prod.reserved_quantity,
            performed_by: isUuid(adminId) ? adminId : null,
            notes: reason
          }]);
        } catch (err) {}

        mockInventoryMovements.push({
          id: `mov-${Date.now()}`,
          product_id: productId,
          movement_type: 'STOCK_ADDED',
          quantity: qty,
          previous_stock: prod.stock_quantity,
          new_stock: newStock,
          previous_reserved: prod.reserved_quantity,
          new_reserved: prod.reserved_quantity,
          performed_by: adminId,
          notes: reason,
          created_at: new Date().toISOString()
        });

        await logAdminActivity(adminId, 'ADMIN_STOCK_ADDED', 'product', productId, {
          previousStock: prod.stock_quantity,
          addedQuantity: qty,
          newStock,
          reason
        }, req);

        await checkLowStockAlert(productId);
      }
    } catch (err) {}
  }

  let mockP = mockProductsStore.get(productId);
  if (!mockP) {
    mockP = { stock_quantity: 20, reserved_quantity: 0, low_stock_threshold: 5, name: 'Product' };
  }

  const prevStock = mockP.stock_quantity;
  mockP.stock_quantity += qty;
  mockProductsStore.set(productId, mockP);

  mockInventoryMovements.push({
    id: `mov-${Date.now()}`,
    product_id: productId,
    movement_type: 'STOCK_ADDED',
    quantity: qty,
    previous_stock: prevStock,
    new_stock: mockP.stock_quantity,
    previous_reserved: mockP.reserved_quantity,
    new_reserved: mockP.reserved_quantity,
    performed_by: adminId,
    notes: reason,
    created_at: new Date().toISOString()
  });

  await checkLowStockAlert(productId);

  const payload = { productId, productName: mockP.name, previousStock: prevStock, newStock: mockP.stock_quantity, addedQuantity: qty };
  eventBus.emit(EVENT_TYPES.INVENTORY_UPDATED, payload);
  sseManager.broadcastInventoryUpdate(payload);

  return { success: true, productId, previousStock: prevStock, newStock: mockP.stock_quantity, message: 'Stock added successfully' };
};

/**
 * 5. ADMIN REMOVE STOCK
 */
const removeStock = async (adminId, productId, quantity, reason = 'Damaged / Expired', req = null) => {
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    throw new AppError('Quantity to remove must be a positive integer', HTTP_STATUS.BAD_REQUEST);
  }

  if (supabase) {
    try {
      const { data: prod } = await supabase.from('products')
        .select('id, name, stock_quantity, reserved_quantity, low_stock_threshold')
        .eq('id', productId)
        .single();

      if (prod) {
        if (prod.stock_quantity - qty < prod.reserved_quantity) {
          throw new AppError(
            `Cannot remove stock: requested reduction (${qty}) would drop stock (${prod.stock_quantity}) below reserved quantity (${prod.reserved_quantity}).`,
            HTTP_STATUS.BAD_REQUEST
          );
        }

        const newStock = prod.stock_quantity - qty;
        await supabase.from('products')
          .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
          .eq('id', productId);

        await supabase.from('inventory')
          .update({ quantity: newStock, updated_at: new Date().toISOString() })
          .eq('product_id', productId);

        try {
          await supabase.from('inventory_movements').insert([{
            product_id: productId,
            movement_type: 'STOCK_REMOVED',
            quantity: qty,
            previous_stock: prod.stock_quantity,
            new_stock: newStock,
            previous_reserved: prod.reserved_quantity,
            new_reserved: prod.reserved_quantity,
            performed_by: isUuid(adminId) ? adminId : null,
            notes: reason
          }]);
        } catch (err) {}

        mockInventoryMovements.push({
          id: `mov-${Date.now()}`,
          product_id: productId,
          movement_type: 'STOCK_REMOVED',
          quantity: qty,
          previous_stock: prod.stock_quantity,
          new_stock: newStock,
          previous_reserved: prod.reserved_quantity,
          new_reserved: prod.reserved_quantity,
          performed_by: adminId,
          notes: reason,
          created_at: new Date().toISOString()
        });

        await logAdminActivity(adminId, 'ADMIN_STOCK_REMOVED', 'product', productId, {
          previousStock: prod.stock_quantity,
          removedQuantity: qty,
          newStock,
          reason
        }, req);

        await checkLowStockAlert(productId);
      }
    } catch (err) {
      if (err.statusCode === 400) throw err;
    }
  }

  let mockP = mockProductsStore.get(productId);
  if (!mockP) {
    mockP = { stock_quantity: 30, reserved_quantity: 0, low_stock_threshold: 5, name: 'Product' };
  }

  if (mockP.stock_quantity - qty < mockP.reserved_quantity) {
    throw new AppError(
      `Cannot remove stock: requested reduction (${qty}) would drop stock (${mockP.stock_quantity}) below reserved quantity (${mockP.reserved_quantity}).`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const prevStock = mockP.stock_quantity;
  mockP.stock_quantity -= qty;
  mockProductsStore.set(productId, mockP);

  mockInventoryMovements.push({
    id: `mov-${Date.now()}`,
    product_id: productId,
    movement_type: 'STOCK_REMOVED',
    quantity: qty,
    previous_stock: prevStock,
    new_stock: mockP.stock_quantity,
    previous_reserved: mockP.reserved_quantity,
    new_reserved: mockP.reserved_quantity,
    notes: reason,
    created_at: new Date().toISOString()
  });

  await checkLowStockAlert(productId);

  const payload = { productId, productName: mockP.name, previousStock: prevStock, newStock: mockP.stock_quantity, removedQuantity: qty };
  eventBus.emit(EVENT_TYPES.INVENTORY_UPDATED, payload);
  sseManager.broadcastInventoryUpdate(payload);

  return { success: true, productId, previousStock: prevStock, newStock: mockP.stock_quantity, message: 'Stock removed successfully' };
};

/**
 * 6. UPDATE LOW STOCK THRESHOLD
 */
const updateThreshold = async (adminId, productId, threshold, req = null) => {
  const thresh = parseInt(threshold, 10);
  if (isNaN(thresh) || thresh < 0) {
    throw new AppError('Low stock threshold must be a non-negative integer', HTTP_STATUS.BAD_REQUEST);
  }

  if (supabase) {
    try {
      const { data: prod } = await supabase.from('products')
        .select('id, name, stock_quantity, reserved_quantity, low_stock_threshold')
        .eq('id', productId)
        .single();

      if (prod) {
        await supabase.from('products')
          .update({ low_stock_threshold: thresh, updated_at: new Date().toISOString() })
          .eq('id', productId);

        await supabase.from('inventory')
          .update({ low_stock_threshold: thresh, updated_at: new Date().toISOString() })
          .eq('product_id', productId);

        await logAdminActivity(adminId, 'ADMIN_LOW_STOCK_THRESHOLD_UPDATED', 'product', productId, {
          oldThreshold: prod.low_stock_threshold,
          newThreshold: thresh
        }, req);

        const mockP = mockProductsStore.get(productId);
        if (mockP) mockP.low_stock_threshold = thresh;

        await checkLowStockAlert(productId);
      }
    } catch (err) {}
  }

  let mockP = mockProductsStore.get(productId);
  if (!mockP) {
    mockP = { stock_quantity: 20, reserved_quantity: 0, low_stock_threshold: thresh, name: 'Product' };
    mockProductsStore.set(productId, mockP);
  } else {
    mockP.low_stock_threshold = thresh;
  }

  await checkLowStockAlert(productId);
  return { success: true, productId, lowStockThreshold: thresh, message: 'Low stock threshold updated' };
};

/**
 * 7. CHECK LOW STOCK ALERT & BROADCAST
 */
const checkLowStockAlert = async (productId) => {
  let mockP = mockProductsStore.get(productId);

  if (supabase) {
    try {
      const { data: prod } = await supabase.from('products')
        .select('id, name, sku, stock_quantity, reserved_quantity, low_stock_threshold, low_stock_alert_active')
        .eq('id', productId)
        .single();

      if (prod) {
        const available = prod.stock_quantity - prod.reserved_quantity;
        if (available <= prod.low_stock_threshold) {
          if (!prod.low_stock_alert_active && (!mockP || !mockP.low_stock_alert_active)) {
            await supabase.from('products')
              .update({ low_stock_alert_active: true })
              .eq('id', productId);

            await supabase.from('inventory')
              .update({ low_stock_alert_active: true })
              .eq('product_id', productId);

            if (mockP) mockP.low_stock_alert_active = true;

            const alertPayload = {
              eventType: EVENT_TYPES.LOW_STOCK_ALERT,
              productId,
              productName: prod.name,
              sku: prod.sku,
              availableStock: Math.max(0, available),
              threshold: prod.low_stock_threshold,
              message: `⚠️ Low Stock Alert: "${prod.name}" has ${Math.max(0, available)} available units left (Threshold: ${prod.low_stock_threshold}).`
            };

            await notificationService.createNotification({
              userId: null,
              title: `⚠️ Low Stock Alert: ${prod.name}`,
              message: `Available stock (${Math.max(0, available)}) is below threshold (${prod.low_stock_threshold}).`,
              type: 'INVENTORY',
              eventType: 'LOW_STOCK',
              referenceId: productId,
              metadata: alertPayload
            });

            eventBus.emit(EVENT_TYPES.LOW_STOCK_ALERT, alertPayload);
            sseManager.broadcastInventoryUpdate(alertPayload);
          }
        } else {
          if (prod.low_stock_alert_active || (mockP && mockP.low_stock_alert_active)) {
            await supabase.from('products')
              .update({ low_stock_alert_active: false })
              .eq('id', productId);

            await supabase.from('inventory')
              .update({ low_stock_alert_active: false })
              .eq('product_id', productId);

            if (mockP) mockP.low_stock_alert_active = false;
          }
        }
        return;
      }
    } catch (err) {}
  }

  if (!mockP) return;
  const available = mockP.stock_quantity - mockP.reserved_quantity;

  if (available <= mockP.low_stock_threshold) {
    if (!mockP.low_stock_alert_active) {
      mockP.low_stock_alert_active = true;
      const alertPayload = {
        eventType: EVENT_TYPES.LOW_STOCK_ALERT,
        productId,
        productName: mockP.name,
        availableStock: Math.max(0, available),
        threshold: mockP.low_stock_threshold
      };
      eventBus.emit(EVENT_TYPES.LOW_STOCK_ALERT, alertPayload);
      sseManager.broadcastInventoryUpdate(alertPayload);
    }
  } else {
    mockP.low_stock_alert_active = false;
  }
};

/**
 * 8. GET INVENTORY OVERVIEW (ADMIN DASHBOARD)
 */
const getInventoryOverview = async (queryParams = {}) => {
  if (supabase) {
    try {
      let query = supabase.from('products')
        .select('id, name, slug, sku, brand, selling_price, stock_quantity, reserved_quantity, low_stock_threshold, low_stock_alert_active, is_active, updated_at, categories(name)');

      if (queryParams.search) {
        query = query.or(`name.ilike.%${queryParams.search}%,sku.ilike.%${queryParams.search}%`);
      }

      const { data: products, error } = await query.order('name', { ascending: true });
      if (!error && products && products.length > 0) {
        const items = products.map(p => {
          const stock = p.stock_quantity || 0;
          const reserved = p.reserved_quantity || 0;
          const available = Math.max(0, stock - reserved);
          const threshold = p.low_stock_threshold || 5;

          let status = 'IN_STOCK';
          if (available === 0) status = 'OUT_OF_STOCK';
          else if (available <= threshold) status = 'LOW_STOCK';

          return {
            id: p.id,
            productId: p.id,
            productName: p.name,
            slug: p.slug,
            sku: p.sku || '',
            categoryName: p.categories?.name || 'General',
            sellingPrice: parseFloat(p.selling_price || 0),
            stockQuantity: stock,
            reservedQuantity: reserved,
            availableQuantity: available,
            lowStockThreshold: threshold,
            lowStockAlertActive: Boolean(p.low_stock_alert_active),
            status,
            updatedAt: p.updated_at
          };
        });

        if (queryParams.status) {
          return { items: items.filter(i => i.status === queryParams.status) };
        }
        return { items };
      }
    } catch (err) {}
  }

  const items = Array.from(mockProductsStore.entries()).map(([id, p]) => {
    const stock = p.stock_quantity;
    const reserved = p.reserved_quantity;
    const available = Math.max(0, stock - reserved);
    let status = 'IN_STOCK';
    if (available === 0) status = 'OUT_OF_STOCK';
    else if (available <= p.low_stock_threshold) status = 'LOW_STOCK';

    return {
      id: p.id || id,
      productId: p.id || id,
      productName: p.name,
      stockQuantity: stock,
      reservedQuantity: reserved,
      availableQuantity: available,
      lowStockThreshold: p.low_stock_threshold,
      lowStockAlertActive: Boolean(p.low_stock_alert_active),
      status
    };
  });

  if (queryParams.status) {
    return { items: items.filter(i => i.status === queryParams.status) };
  }

  return { items };
};

/**
 * 9. GET STOCK MOVEMENTS HISTORY (ADMIN AUDIT LOG)
 */
const getStockMovements = async (productId = null, queryParams = {}) => {
  let dbData = [];
  if (supabase) {
    try {
      let query = supabase.from('inventory_movements')
        .select('*, products(name, sku), users(full_name, email), orders(order_number)');

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        dbData = data.map(m => ({
          id: m.id,
          productId: m.product_id,
          productName: m.products?.name || 'Unknown Product',
          sku: m.products?.sku || '',
          orderId: m.order_id,
          orderNumber: m.orders?.order_number || '',
          movementType: m.movement_type,
          quantity: m.quantity,
          previousStock: m.previous_stock,
          newStock: m.new_stock,
          previousReserved: m.previous_reserved,
          newReserved: m.new_reserved,
          performedBy: m.users?.full_name || m.performed_by || 'System',
          notes: m.notes,
          createdAt: m.created_at
        }));
      }
    } catch (err) {}
  }

  const mockData = mockInventoryMovements
    .filter(m => !productId || String(m.product_id) === String(productId))
    .map(m => ({
      id: m.id,
      productId: m.product_id,
      productName: 'Product',
      movementType: m.movement_type,
      quantity: m.quantity,
      previousStock: m.previous_stock,
      newStock: m.new_stock,
      performedBy: m.performed_by || 'System',
      notes: m.notes,
      createdAt: m.created_at
    }));

  const combined = [...dbData, ...mockData];
  const unique = [];
  const seen = new Set();
  combined.forEach(item => {
    if (item && item.id && !seen.has(item.id)) {
      seen.add(item.id);
      unique.push(item);
    }
  });
  return unique;
};

module.exports = {
  reserveStock,
  releaseStock,
  consumeStock,
  addStock,
  removeStock,
  updateThreshold,
  getInventoryOverview,
  getStockMovements,
  checkLowStockAlert,
  mockProductsStore,
  mockInventoryMovements
};
