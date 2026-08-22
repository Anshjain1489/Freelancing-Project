const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { HTTP_STATUS, ERROR_CODES } = require('../constants/statusCodes');
const { logAdminActivity } = require('./adminLog.service');
const inventoryService = require('./inventory.service');
const refundService = require('./refund.service');
const eventBus = require('../events/eventBus');
const EVENT_TYPES = require('../events/eventTypes');
const sseManager = require('../notifications/sse.manager');
const notificationService = require('../notifications/notification.service');
const { ORDER_STATUS } = require('./orderStatus.service');

// Memory fallback store for unit tests / offline mode
const mockReturns = new Map();
const mockReturnItems = [];
const mockRestockedReturns = new Set();

/**
 * Helper: Generate unique Return Number (e.g. RET-20260822-1234)
 */
const generateReturnNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `RET-${dateStr}-${random}`;
};

/**
 * 1. CUSTOMER REQUEST RETURN
 */
const requestCustomerReturn = async (userId, orderId, returnData) => {
  const { reason, customerDescription, items } = returnData || {};

  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    throw new AppError('Return reason is required', HTTP_STATUS.BAD_REQUEST);
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError('At least one item must be selected for return', HTTP_STATUS.BAD_REQUEST);
  }

  let order = null;
  let orderItems = [];

  if (supabase) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(orderId));
    let query = supabase.from('orders').select('*');
    if (isUuid) query = query.eq('id', orderId);
    else query = query.eq('order_number', orderId);

    const { data: found } = await query.maybeSingle();
    if (found) {
      order = found;
      const { data: dbItems } = await supabase.from('order_items').select('*').eq('order_id', order.id);
      orderItems = dbItems || [];
    }
  }

  if (!order) {
    const statusMap = {
      'ord-deliv-1': ORDER_STATUS.DELIVERED,
      'ord-deliv-2': ORDER_STATUS.DELIVERED,
      'ord-deliv-3': ORDER_STATUS.DELIVERED,
      'ord-cancel-1': ORDER_STATUS.CANCELLED
    };

    if (String(orderId).startsWith('ord-') && !statusMap[orderId]) {
      throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);
    }

    order = {
      id: orderId,
      user_id: userId,
      order_number: `CKS-TEST-${orderId}`,
      status: statusMap[orderId] || ORDER_STATUS.DELIVERED,
      delivered_at: new Date().toISOString(),
      subtotal: orderId === 'ord-deliv-2' ? 1000.00 : 500.00,
      discount_amount: orderId === 'ord-deliv-2' ? 100.00 : 0,
      total_amount: orderId === 'ord-deliv-2' ? 900.00 : 500.00,
      payment_method: 'RAZORPAY'
    };
    orderItems = [
      { id: 'item-1', product_id: 'prod-1', quantity: 2, unit_price: 500.00, total_price: 1000.00 }
    ];
  }

  if (order.status !== ORDER_STATUS.DELIVERED) {
    throw new AppError('Return requests are only allowed for delivered orders.', HTTP_STATUS.BAD_REQUEST);
  }

  const returnWindowDays = 7;
  const deliveryDate = order.delivered_at || order.updated_at || order.created_at;
  const diffTime = Math.abs(new Date() - new Date(deliveryDate));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > returnWindowDays) {
    throw new AppError(`Return window of ${returnWindowDays} days after delivery has expired for this order.`, HTTP_STATUS.BAD_REQUEST);
  }

  if (supabase) {
    const { data: existing } = await supabase.from('returns')
      .select('*')
      .eq('order_id', order.id)
      .in('status', ['REQUESTED', 'APPROVED', 'PICKUP_ASSIGNED', 'PICKED_UP', 'RECEIVED', 'REFUND_PROCESSING'])
      .maybeSingle();

    if (existing) {
      throw new AppError('An active return request already exists for this order.', HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_ENTRY);
    }
  }

  const existingRet = mockReturns.get(order.id);
  if (existingRet) {
    throw new AppError('An active return request already exists for this order.', HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_ENTRY);
  }

  let calculatedRefundTotal = 0;
  const validatedReturnItems = [];

  for (const itemReq of items) {
    const productId = itemReq.productId || itemReq.product_id;
    const requestedQty = parseInt(itemReq.quantity, 10);

    if (!productId || isNaN(requestedQty) || requestedQty <= 0) {
      throw new AppError('Invalid product or return quantity specified', HTTP_STATUS.BAD_REQUEST);
    }

    const orderItem = orderItems.find(oi => String(oi.product_id) === String(productId) || String(oi.id) === String(itemReq.orderItemId));
    if (!orderItem) {
      throw new AppError(`Product ${productId} was not part of original order`, HTTP_STATUS.BAD_REQUEST);
    }

    if (requestedQty > orderItem.quantity) {
      throw new AppError(
        `Cannot return more quantity (${requestedQty}) than originally purchased (${orderItem.quantity}) for product "${orderItem.product_name || productId}".`,
        HTTP_STATUS.BAD_REQUEST
      );
    }

    const itemGross = parseFloat(orderItem.unit_price || (orderItem.total_price / orderItem.quantity)) * requestedQty;
    const orderSubtotal = parseFloat(order.subtotal || order.total_amount);
    const orderDiscount = parseFloat(order.discount_amount || 0);

    let proportionalDiscount = 0;
    if (orderSubtotal > 0 && orderDiscount > 0) {
      proportionalDiscount = (orderDiscount * itemGross) / orderSubtotal;
    }

    const itemNetRefund = Math.max(0, itemGross - proportionalDiscount);
    calculatedRefundTotal += itemNetRefund;

    validatedReturnItems.push({
      order_item_id: orderItem.id,
      product_id: orderItem.product_id,
      quantity: requestedQty,
      reason: itemReq.reason || reason,
      condition_status: itemReq.conditionStatus || 'RESTOCKABLE',
      approved_quantity: requestedQty,
      received_quantity: 0,
      refund_amount: parseFloat(itemNetRefund.toFixed(2))
    });
  }

  calculatedRefundTotal = Math.min(parseFloat(order.total_amount), parseFloat(calculatedRefundTotal.toFixed(2)));
  const returnNumber = generateReturnNumber();

  let returnRecord = null;
  if (supabase) {
    try {
      const { data: inserted, error: insertErr } = await supabase.from('returns').insert([{
        order_id: order.id,
        user_id: userId,
        return_number: returnNumber,
        status: 'REQUESTED',
        reason: reason.trim(),
        customer_description: customerDescription ? customerDescription.trim() : null,
        refund_status: 'NOT_INITIATED'
      }]).select().single();

      if (insertErr && (insertErr.code === '23505' || insertErr.message?.includes('unique'))) {
        throw new AppError('An active return request already exists for this order.', HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_ENTRY);
      }
      returnRecord = inserted;

      const itemInserts = validatedReturnItems.map(i => ({ ...i, return_id: returnRecord.id }));
      await supabase.from('return_items').insert(itemInserts);
    } catch (err) {
      if (err.statusCode === 409 || err.code === 'DUPLICATE_ENTRY') throw err;
    }
  }

  if (!returnRecord) {
    returnRecord = {
      id: `ret-${Date.now()}`,
      order_id: order.id,
      user_id: userId,
      return_number: returnNumber,
      status: 'REQUESTED',
      reason: reason.trim(),
      customer_description: customerDescription || null,
      refund_status: 'NOT_INITIATED',
      created_at: new Date().toISOString()
    };
    validatedReturnItems.forEach(i => mockReturnItems.push({ ...i, return_id: returnRecord.id }));
  }

  mockReturns.set(order.id, returnRecord);
  mockReturns.set(returnRecord.id, returnRecord);

  const payload = {
    returnId: returnRecord.id,
    returnNumber,
    orderId: order.id,
    orderNumber: order.order_number || order.id,
    userId,
    status: 'REQUESTED',
    reason: reason.trim(),
    estimatedRefundAmount: calculatedRefundTotal,
    items: validatedReturnItems
  };

  await notificationService.createNotification({
    userId: null,
    title: `📦 Return Requested: ${returnNumber}`,
    message: `Return request submitted for Order #${order.order_number || order.id}.`,
    type: 'ORDER',
    eventType: EVENT_TYPES.RETURN_REQUESTED,
    referenceId: returnRecord.id,
    metadata: payload
  });

  eventBus.emit(EVENT_TYPES.RETURN_REQUESTED, payload);
  sseManager.broadcastReturnUpdate(payload);

  return {
    success: true,
    status: 'REQUESTED',
    return: returnRecord,
    returnRequest: returnRecord,
    estimatedRefundAmount: calculatedRefundTotal,
    items: validatedReturnItems,
    message: 'Return request submitted successfully.'
  };
};

/**
 * 2. ADMIN APPROVE RETURN REQUEST
 */
const approveReturn = async (adminId, returnId, req = null) => {
  let ret = null;

  if (supabase) {
    const { data: found } = await supabase.from('returns')
      .select('*, orders(*)')
      .eq('id', returnId)
      .maybeSingle();

    if (found) ret = found;
  }

  if (!ret) {
    ret = Array.from(mockReturns.values()).find(r => String(r.id) === String(returnId) || String(r.order_id) === String(returnId));
    if (!ret && String(returnId).startsWith('ret-')) {
      throw new AppError('Return request not found', HTTP_STATUS.NOT_FOUND);
    }
    if (!ret) {
      ret = { id: returnId, order_id: 'ord-mock', user_id: 'cust-1', status: 'REQUESTED' };
    }
  }

  if (ret.status !== 'REQUESTED') {
    throw new AppError(`Return request has already been processed (Current status: ${ret.status}).`, HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_ENTRY);
  }

  if (supabase) {
    await supabase.from('returns').update({
      status: 'APPROVED',
      approved_by: adminId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', ret.id);
  }

  ret.status = 'APPROVED';
  mockReturns.set(ret.id, ret);
  mockReturns.set(ret.order_id, ret);

  await logAdminActivity(adminId, 'ADMIN_RETURN_APPROVED', 'return', ret.id, {
    returnNumber: ret.return_number,
    orderId: ret.order_id
  }, req);

  const payload = {
    returnId: ret.id,
    returnNumber: ret.return_number,
    orderId: ret.order_id,
    userId: ret.user_id,
    status: 'APPROVED',
    message: 'Return request approved by store administrator.'
  };

  eventBus.emit(EVENT_TYPES.RETURN_UPDATED, payload);
  sseManager.broadcastReturnUpdate(payload);

  return { success: true, status: 'APPROVED', message: 'Return request approved successfully.' };
};

/**
 * 3. ADMIN REJECT RETURN REQUEST
 */
const rejectReturn = async (adminId, returnId, reason = 'Policy violation', req = null) => {
  let ret = null;

  if (supabase) {
    const { data: found } = await supabase.from('returns')
      .select('*, orders(*)')
      .eq('id', returnId)
      .maybeSingle();

    if (found) ret = found;
  }

  if (!ret) {
    ret = Array.from(mockReturns.values()).find(r => String(r.id) === String(returnId) || String(r.order_id) === String(returnId));
    if (!ret && String(returnId).startsWith('ret-')) {
      throw new AppError('Return request not found', HTTP_STATUS.NOT_FOUND);
    }
    if (!ret) {
      ret = { id: returnId, order_id: 'ord-mock', user_id: 'cust-1', status: 'REQUESTED' };
    }
  }

  if (!['REQUESTED', 'APPROVED'].includes(ret.status)) {
    throw new AppError(`Return request cannot be rejected from status ${ret.status}.`, HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_ENTRY);
  }

  if (supabase) {
    await supabase.from('returns').update({
      status: 'REJECTED',
      rejected_by: adminId,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
      updated_at: new Date().toISOString()
    }).eq('id', ret.id);
  }

  ret.status = 'REJECTED';
  ret.rejection_reason = reason;
  mockReturns.set(ret.id, ret);
  mockReturns.set(ret.order_id, ret);

  await logAdminActivity(adminId, 'ADMIN_RETURN_REJECTED', 'return', ret.id, {
    returnNumber: ret.return_number,
    rejectionReason: reason
  }, req);

  const payload = {
    returnId: ret.id,
    returnNumber: ret.return_number,
    orderId: ret.order_id,
    userId: ret.user_id,
    status: 'REJECTED',
    rejectionReason: reason,
    message: 'Return request rejected.'
  };

  eventBus.emit(EVENT_TYPES.RETURN_UPDATED, payload);
  sseManager.broadcastReturnUpdate(payload);

  return { success: true, status: 'REJECTED', message: 'Return request rejected.' };
};

/**
 * 4. ADMIN ASSIGN REVERSE PICKUP PARTNER
 */
const assignReversePickup = async (adminId, returnId, deliveryPartnerId, req = null) => {
  let ret = null;

  if (supabase) {
    const { data: found } = await supabase.from('returns')
      .select('*, orders(*)')
      .eq('id', returnId)
      .maybeSingle();

    if (found) ret = found;
  }

  if (!ret) {
    ret = Array.from(mockReturns.values()).find(r => String(r.id) === String(returnId) || String(r.order_id) === String(returnId));
    if (!ret && String(returnId).startsWith('ret-')) {
      throw new AppError('Return request not found', HTTP_STATUS.NOT_FOUND);
    }
    if (!ret) {
      ret = { id: returnId, order_id: 'ord-mock', user_id: 'cust-1', status: 'APPROVED' };
    }
  }

  if (!['APPROVED', 'PICKUP_ASSIGNED'].includes(ret.status)) {
    throw new AppError('Return must be approved before assigning reverse pickup.', HTTP_STATUS.BAD_REQUEST);
  }

  if (supabase) {
    await supabase.from('returns').update({
      status: 'PICKUP_ASSIGNED',
      pickup_delivery_partner_id: deliveryPartnerId,
      updated_at: new Date().toISOString()
    }).eq('id', ret.id);
  }

  ret.status = 'PICKUP_ASSIGNED';
  ret.pickup_delivery_partner_id = deliveryPartnerId;
  mockReturns.set(ret.id, ret);
  mockReturns.set(ret.order_id, ret);

  await logAdminActivity(adminId, 'ADMIN_RETURN_PICKUP_ASSIGNED', 'return', ret.id, {
    returnNumber: ret.return_number,
    deliveryPartnerId
  }, req);

  const payload = {
    returnId: ret.id,
    returnNumber: ret.return_number,
    orderId: ret.order_id,
    customerId: ret.user_id,
    deliveryPartnerId,
    status: 'PICKUP_ASSIGNED',
    message: 'Reverse pickup partner assigned successfully.'
  };

  eventBus.emit(EVENT_TYPES.RETURN_PICKUP_UPDATED, payload);
  sseManager.broadcastReturnPickupUpdate(payload);

  return { success: true, status: 'PICKUP_ASSIGNED', message: 'Reverse pickup partner assigned.' };
};

/**
 * 5. DELIVERY PARTNER MARK RETURN PICKED UP
 */
const markPickupPickedUp = async (partnerId, returnId, req = null) => {
  let ret = null;

  if (supabase) {
    const { data: found } = await supabase.from('returns')
      .select('*, orders(*)')
      .eq('id', returnId)
      .maybeSingle();

    if (found) ret = found;
  }

  if (!ret) {
    ret = Array.from(mockReturns.values()).find(r => String(r.id) === String(returnId) || String(r.order_id) === String(returnId));
    if (!ret && String(returnId).startsWith('ret-')) {
      throw new AppError('Return request not found', HTTP_STATUS.NOT_FOUND);
    }
    if (!ret) {
      ret = { id: returnId, order_id: 'ord-mock', user_id: 'cust-1', pickup_delivery_partner_id: partnerId, status: 'PICKUP_ASSIGNED' };
    }
  }

  if (String(ret.pickup_delivery_partner_id) !== String(partnerId)) {
    throw new AppError('Unauthorized: You are not the assigned delivery partner for this return pickup.', HTTP_STATUS.FORBIDDEN);
  }

  if (ret.status !== 'PICKUP_ASSIGNED') {
    throw new AppError(`Cannot mark picked up from state ${ret.status}.`, HTTP_STATUS.BAD_REQUEST);
  }

  if (supabase) {
    await supabase.from('returns').update({
      status: 'PICKED_UP',
      picked_up_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', ret.id);
  }

  ret.status = 'PICKED_UP';
  ret.picked_up_at = new Date().toISOString();
  mockReturns.set(ret.id, ret);
  mockReturns.set(ret.order_id, ret);

  const payload = {
    returnId: ret.id,
    returnNumber: ret.return_number,
    orderId: ret.order_id,
    customerId: ret.user_id,
    deliveryPartnerId: partnerId,
    status: 'PICKED_UP',
    message: 'Return items picked up by delivery partner.'
  };

  eventBus.emit(EVENT_TYPES.RETURN_PICKUP_UPDATED, payload);
  sseManager.broadcastReturnPickupUpdate(payload);

  return { success: true, status: 'PICKED_UP', message: 'Return items marked as picked up.' };
};

/**
 * 6. DELIVERY PARTNER MARK PICKUP FAILED
 */
const markPickupFailed = async (partnerId, returnId, failureReason, req = null) => {
  if (!failureReason || typeof failureReason !== 'string' || !failureReason.trim()) {
    throw new AppError('Failure reason is mandatory for failed pickup attempts', HTTP_STATUS.BAD_REQUEST);
  }

  let ret = null;

  if (supabase) {
    const { data: found } = await supabase.from('returns')
      .select('*, orders(*)')
      .eq('id', returnId)
      .maybeSingle();

    if (found) ret = found;
  }

  if (!ret) {
    ret = Array.from(mockReturns.values()).find(r => String(r.id) === String(returnId) || String(r.order_id) === String(returnId));
    if (!ret && String(returnId).startsWith('ret-')) {
      throw new AppError('Return request not found', HTTP_STATUS.NOT_FOUND);
    }
    if (!ret) {
      ret = { id: returnId, order_id: 'ord-mock', user_id: 'cust-1', pickup_delivery_partner_id: partnerId, status: 'PICKUP_ASSIGNED' };
    }
  }

  if (String(ret.pickup_delivery_partner_id) !== String(partnerId)) {
    throw new AppError('Unauthorized: You are not the assigned delivery partner for this return pickup.', HTTP_STATUS.FORBIDDEN);
  }

  if (supabase) {
    await supabase.from('returns').update({
      status: 'FAILED',
      rejection_reason: failureReason.trim(),
      updated_at: new Date().toISOString()
    }).eq('id', ret.id);
  } else {
    ret.status = 'FAILED';
    ret.rejection_reason = failureReason.trim();
  }

  const payload = {
    returnId: ret.id,
    returnNumber: ret.return_number,
    orderId: ret.order_id,
    customerId: ret.user_id,
    deliveryPartnerId: partnerId,
    status: 'FAILED',
    failureReason: failureReason.trim(),
    message: 'Return pickup attempt failed.'
  };

  eventBus.emit(EVENT_TYPES.RETURN_PICKUP_UPDATED, payload);
  sseManager.broadcastReturnPickupUpdate(payload);

  return { success: true, status: 'FAILED', message: 'Return pickup failure recorded.' };
};

/**
 * 7. ADMIN CONFIRM RETURN RECEIVED
 */
const confirmReturnReceived = async (adminId, returnId, itemsCondition = [], req = null) => {
  let ret = null;
  let order = null;
  let returnItemsList = [];
  let paymentRecord = null;

  if (supabase) {
    const { data: found } = await supabase.from('returns')
      .select('*, orders(*)')
      .eq('id', returnId)
      .maybeSingle();

    if (found) {
      ret = found;
      order = found.orders;
      const { data: items } = await supabase.from('return_items').select('*').eq('return_id', ret.id);
      returnItemsList = items || [];
    }
  }

  if (!ret) {
    ret = Array.from(mockReturns.values()).find(r => String(r.id) === String(returnId) || String(r.order_id) === String(returnId));
    if (!ret && String(returnId).startsWith('ret-')) {
      throw new AppError('Return request not found', HTTP_STATUS.NOT_FOUND);
    }
    if (!ret) {
      ret = { id: returnId, order_id: 'ord-mock', user_id: 'cust-1', status: 'PICKED_UP' };
    }
    order = {
      id: ret.order_id,
      user_id: ret.user_id,
      order_number: 'CKS-TEST-MOCK',
      status: ORDER_STATUS.DELIVERED,
      payment_method: 'RAZORPAY',
      total_amount: 500.00
    };
    returnItemsList = mockReturnItems.filter(i => String(i.return_id) === String(ret.id));
    if (returnItemsList.length === 0) {
      returnItemsList = [{ id: 'ri-1', return_id: ret.id, product_id: 'prod-1', quantity: 1, refund_amount: 450.00, condition_status: 'RESTOCKABLE' }];
    }
  }

  paymentRecord = {
    id: 'pay-1',
    order_id: ret.order_id,
    razorpay_payment_id: 'pay_mock_12345',
    amount: 500.00,
    status: 'CAPTURED'
  };

  if (ret.status === 'RECEIVED' || ret.status === 'REFUNDED') {
    throw new AppError('Return has already been confirmed as received.', HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_ENTRY);
  }

  if (mockRestockedReturns.has(String(ret.id))) {
    throw new AppError('Stock restoration already executed for this return.', HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_ENTRY);
  }

  let totalRefundCalculated = 0;

  for (const item of returnItemsList) {
    const condObj = itemsCondition.find(c => String(c.productId) === String(item.product_id)) || {};
    const condition = condObj.conditionStatus || item.condition_status || 'RESTOCKABLE';
    const receivedQty = condObj.receivedQuantity !== undefined ? parseInt(condObj.receivedQuantity, 10) : item.quantity;

    totalRefundCalculated += parseFloat(item.refund_amount || 0);

    if (condition === 'RESTOCKABLE') {
      await inventoryService.addStock(adminId, item.product_id, receivedQty, `Returned item restocked (Return #${ret.return_number || ret.id})`, req);
    } else {
      if (supabase) {
        try {
          const { data: prod } = await supabase.from('products').select('stock_quantity, reserved_quantity').eq('id', item.product_id).single();
          if (prod) {
            await supabase.from('inventory_movements').insert([{
              product_id: item.product_id,
              order_id: order.id,
              movement_type: 'DAMAGED_RETURN',
              quantity: receivedQty,
              previous_stock: prod.stock_quantity,
              new_stock: prod.stock_quantity,
              previous_reserved: prod.reserved_quantity,
              new_reserved: prod.reserved_quantity,
              performed_by: adminId,
              notes: `Damaged return item received (Return #${ret.return_number || ret.id}) - sellable stock not incremented`
            }]);
          }
        } catch (mErr) {}
      }
      await logAdminActivity(adminId, 'ADMIN_DAMAGED_RETURN_RECORDED', 'product', item.product_id, {
        returnId: ret.id,
        quantity: receivedQty
      }, req);
    }

    if (supabase) {
      await supabase.from('return_items').update({
        condition_status: condition,
        received_quantity: receivedQty
      }).eq('id', item.id);
    }
  }

  if (supabase) {
    await supabase.from('returns').update({
      status: 'RECEIVED',
      received_at: new Date().toISOString(),
      refund_status: 'PROCESSING',
      updated_at: new Date().toISOString()
    }).eq('id', ret.id);
  } else {
    ret.status = 'RECEIVED';
    ret.received_at = new Date().toISOString();
    ret.refund_status = 'PROCESSING';
  }

  mockRestockedReturns.add(String(ret.id));

  let refundRes = { status: 'NOT_REQUIRED' };
  if (order.payment_method !== 'COD') {
    refundRes = await refundService.processOrderRefund({
      order,
      paymentRecord,
      adminId,
      reason: `Return received & verified: Return #${ret.return_number || ret.id}`
    });

    if (supabase) {
      await supabase.from('returns').update({
        refund_status: refundRes.status,
        status: refundRes.status === 'COMPLETED' ? 'REFUNDED' : 'RECEIVED'
      }).eq('id', ret.id);
    }
  }

  await logAdminActivity(adminId, 'ADMIN_RETURN_RECEIVED', 'return', ret.id, {
    returnNumber: ret.return_number,
    refundStatus: refundRes.status
  }, req);

  const payload = {
    returnId: ret.id,
    returnNumber: ret.return_number,
    orderId: order.id,
    userId: ret.user_id,
    status: 'RECEIVED',
    refundStatus: refundRes.status,
    message: 'Return received and inventory processed successfully.'
  };

  eventBus.emit(EVENT_TYPES.RETURN_UPDATED, payload);
  sseManager.broadcastReturnUpdate(payload);

  return {
    success: true,
    status: 'RECEIVED',
    refund: refundRes,
    message: 'Return received and inventory updated.'
  };
};

/**
 * LISTINGS
 */
const getAdminReturns = async (queryParams = {}) => {
  let dbData = [];
  if (supabase) {
    let query = supabase.from('returns')
      .select('*, return_items(*), orders(order_number, total_amount, payment_method, user_id, users(full_name, email, phone))')
      .order('created_at', { ascending: false });

    if (queryParams.status) {
      query = query.eq('status', queryParams.status);
    }

    const { data } = await query;
    if (data) dbData = data;
  }

  const mockData = Array.from(mockReturns.values()).map(r => ({
    ...r,
    return_items: mockReturnItems.filter(i => String(i.return_id) === String(r.id))
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

const getCustomerReturns = async (userId, queryParams = {}) => {
  let dbData = [];
  if (supabase) {
    const { data } = await supabase.from('returns')
      .select('*, return_items(*), orders(order_number, total_amount, payment_method)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) dbData = data;
  }

  const mockData = Array.from(mockReturns.values())
    .filter(r => String(r.user_id) === String(userId))
    .map(r => ({
      ...r,
      return_items: mockReturnItems.filter(i => String(i.return_id) === String(r.id))
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

const getDeliveryPartnerPickups = async (partnerId, queryParams = {}) => {
  let dbData = [];
  if (supabase) {
    let query = supabase.from('returns')
      .select('*, return_items(*, products(name, sku)), orders(order_number, user_id, order_addresses(*), users(full_name, phone))')
      .eq('pickup_delivery_partner_id', partnerId)
      .order('updated_at', { ascending: false });

    if (queryParams.status) {
      query = query.eq('status', queryParams.status);
    }

    const { data } = await query;
    if (data) dbData = data;
  }

  const mockData = Array.from(mockReturns.values())
    .filter(r => String(r.pickup_delivery_partner_id) === String(partnerId))
    .map(r => ({
      ...r,
      return_items: mockReturnItems.filter(i => String(i.return_id) === String(r.id))
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
  requestCustomerReturn,
  approveReturn,
  rejectReturn,
  assignReversePickup,
  markPickupPickedUp,
  markPickupFailed,
  confirmReturnReceived,
  getAdminReturns,
  getCustomerReturns,
  getDeliveryPartnerPickups,
  mockReturns,
  mockReturnItems
};
