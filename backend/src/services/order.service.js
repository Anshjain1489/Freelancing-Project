const supabase = require('../config/supabase');
const checkoutService = require('./checkout.service');
const razorpayService = require('./razorpay.service');
const { ORDER_STATUS, PAYMENT_STATUS, validateOrderStatusTransition } = require('./orderStatus.service');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');
const { getPaginationParams, formatPaginatedResponse } = require('../utils/pagination');

const inventoryService = require('./inventory.service');

// Fallback in-memory order store
const mockOrders = [];

const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CKS-${dateStr}-${random}`;
};

const createOrder = async (userId, addressId, couponCode = null) => {
  // 1. Get backend checkout preview (validates cart, prices, stock, delivery charge, and optional coupon)
  const preview = await checkoutService.getCheckoutPreview(userId, addressId, couponCode);

  const orderNumber = generateOrderNumber();
  const amountInPaise = Math.round(preview.totalAmount * 100);

  // 2. ATOMIC STOCK RESERVATION (Crash-Safe)
  const reservationResult = await inventoryService.reserveStock(preview.items, null);

  try {
    if (supabase) {
      // 3. Insert main order
      const { data: newOrder, error: orderErr } = await supabase.from('orders').insert([{
        user_id: userId,
        order_number: orderNumber,
        status: ORDER_STATUS.PENDING_PAYMENT,
        subtotal: preview.subtotal,
        delivery_charge: preview.delivery.deliveryCharge,
        delivery_distance_km: preview.delivery.distanceKm,
        coupon_id: preview.coupon?.id || null,
        coupon_code: preview.coupon?.code || null,
        discount_amount: preview.discountAmount || 0,
        total_amount: preview.totalAmount
      }]).select().single();

      if (orderErr || !newOrder) {
        throw new AppError('Failed to create order: ' + (orderErr?.message || ''), HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }

      // 4. Create immutable order address snapshot
      await supabase.from('order_addresses').insert([{
        order_id: newOrder.id,
        recipient_name: preview.address.recipientName,
        phone: preview.address.phone,
        address_line1: preview.address.addressLine1,
        address_line2: preview.address.addressLine2 || null,
        landmark: preview.address.landmark || null,
        city: preview.address.city,
        state: preview.address.state,
        postal_code: preview.address.postalCode
      }]);

      // 5. Create order items snapshot
      const itemRecords = preview.items.map(item => ({
        order_id: newOrder.id,
        product_id: item.productId,
        product_name: item.name,
        unit: item.unit,
        unit_value: item.unitValue,
        unit_price: item.sellingPrice,
        quantity: item.quantity,
        total_price: item.itemTotal
      }));
      await supabase.from('order_items').insert(itemRecords);

      // 6. Create Razorpay Payment Order using Net Discounted Total Amount
      const razorpayOrder = await razorpayService.createRazorpayOrder(amountInPaise, 'INR', newOrder.order_number);

      // 7. Create Payment Record
      await supabase.from('payments').insert([{
        order_id: newOrder.id,
        payment_method: 'RAZORPAY',
        status: PAYMENT_STATUS.PENDING,
        razorpay_order_id: razorpayOrder.id,
        amount: preview.totalAmount,
        currency: 'INR'
      }]);

      return {
        orderId: newOrder.id,
        orderNumber: newOrder.order_number,
        couponCode: preview.coupon?.code || null,
        discountAmount: preview.discountAmount || 0,
        totalAmount: preview.totalAmount,
        currency: 'INR',
        razorpayOrderId: razorpayOrder.id,
        amountInPaise,
        items: preview.items,
        address: preview.address
      };
    }

    // Mock Fallback
    const mockNew = {
      id: `ord-${Date.now()}`,
      orderNumber,
      userId,
      status: ORDER_STATUS.PENDING_PAYMENT,
      paymentStatus: PAYMENT_STATUS.PENDING,
      subtotal: preview.subtotal,
      deliveryCharge: preview.delivery.deliveryCharge,
      couponCode: preview.coupon?.code || null,
      discountAmount: preview.discountAmount || 0,
      totalAmount: preview.totalAmount,
      items: preview.items,
      address: preview.address,
      createdAt: new Date().toISOString()
    };
    mockOrders.push(mockNew);

    return {
      orderId: mockNew.id,
      orderNumber: mockNew.orderNumber,
      couponCode: mockNew.couponCode,
      discountAmount: mockNew.discountAmount,
      totalAmount: preview.totalAmount,
      currency: 'INR',
      razorpayOrderId: `rzp_order_mock_${Date.now()}`,
      amountInPaise,
      items: preview.items,
      address: preview.address
    };
  } catch (err) {
    // CRASH-SAFE ROLLBACK: Release stock reservation if order creation or Razorpay fails
    await inventoryService.releaseStock(preview.items, null, 'ORDER_CREATION_FAILED');
    throw err;
  }
};

const getUserOrders = async (userId, queryParams = {}) => {
  const { page, limit, offset } = getPaginationParams(queryParams.page, queryParams.limit);

  if (supabase) {
    const { data, count, error } = await supabase.from('orders')
      .select('*, order_items (*), payments ( status, razorpay_order_id )', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new AppError('Failed to fetch orders', HTTP_STATUS.INTERNAL_SERVER_ERROR);

    const formatted = data.map(o => ({
      id: o.id,
      orderNumber: o.order_number,
      status: o.status,
      paymentStatus: o.payments?.[0]?.status || PAYMENT_STATUS.PENDING,
      razorpayOrderId: o.payments?.[0]?.razorpay_order_id,
      subtotal: parseFloat(o.subtotal),
      deliveryCharge: parseFloat(o.delivery_charge),
      couponCode: o.coupon_code,
      discountAmount: parseFloat(o.discount_amount || 0),
      totalAmount: parseFloat(o.total_amount),
      itemCount: o.order_items?.length || 0,
      createdAt: o.created_at
    }));

    return formatPaginatedResponse(formatted, page, limit, count || 0);
  }

  const userOrders = mockOrders.filter(o => o.userId === userId);
  return formatPaginatedResponse(userOrders, page, limit, userOrders.length);
};

const getOrderById = async (userId, orderId) => {
  if (supabase) {
    const { data: order, error } = await supabase.from('orders')
      .select('*, order_items (*), order_addresses (*), payments (*)')
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
      .eq('user_id', userId)
      .single();

    if (error || !order) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);

    return {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      paymentStatus: order.payments?.[0]?.status || PAYMENT_STATUS.PENDING,
      razorpayOrderId: order.payments?.[0]?.razorpay_order_id,
      subtotal: parseFloat(order.subtotal),
      deliveryCharge: parseFloat(order.delivery_charge),
      couponCode: order.coupon_code,
      discountAmount: parseFloat(order.discount_amount || 0),
      totalAmount: parseFloat(order.total_amount),
      items: order.order_items || [],
      address: order.order_addresses?.[0] || null,
      createdAt: order.created_at
    };
  }

  const found = mockOrders.find(o => (o.id === orderId || o.orderNumber === orderId) && o.userId === userId);
  if (!found) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);
  return found;
};

const cancelOrder = async (userId, orderId, reason = '') => {
  const order = await getOrderById(userId, orderId);
  validateOrderStatusTransition(order.status, ORDER_STATUS.CANCELLED);

  if (supabase) {
    await supabase.from('orders').update({
      status: ORDER_STATUS.CANCELLED
    }).eq('id', order.id).eq('user_id', userId);
  } else {
    order.status = ORDER_STATUS.CANCELLED;
  }

  return { message: 'Order cancelled successfully' };
};

const retryOrderPayment = async (userId, orderId) => {
  const order = await getOrderById(userId, orderId);
  if (order.paymentStatus === PAYMENT_STATUS.PAID || order.status === ORDER_STATUS.CONFIRMED) {
    throw new AppError('This order has already been paid and confirmed.', HTTP_STATUS.BAD_REQUEST);
  }

  const amountInPaise = Math.round(order.totalAmount * 100);
  const razorpayOrder = await razorpayService.createRazorpayOrder(amountInPaise, 'INR', order.orderNumber);

  if (supabase) {
    await supabase.from('payments').update({
      razorpay_order_id: razorpayOrder.id,
      status: PAYMENT_STATUS.PENDING
    }).eq('order_id', order.id);
  }

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    totalAmount: order.totalAmount,
    currency: 'INR',
    razorpayOrderId: razorpayOrder.id,
    amountInPaise
  };
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  retryOrderPayment
};
