const supabase = require('../config/supabase');
const razorpayService = require('./razorpay.service');
const cartService = require('./cart.service');
const inventoryService = require('./inventory.service');
const deliveryService = require('./delivery.service');
const couponService = require('./coupon.service');
const eventBus = require('../events/eventBus');
const EVENT_TYPES = require('../events/eventTypes');
const AppError = require('../utils/AppError');
const { HTTP_STATUS, ERROR_CODES } = require('../constants/statusCodes');
const { ORDER_STATUS, PAYMENT_STATUS } = require('./orderStatus.service');
const config = require('../config/environment');
const { getPaginationParams, formatPaginatedResponse } = require('../utils/pagination');
const orderTrackingService = require('./orderTracking.service');

// Local in-memory mock fallback
const mockOrders = [];
const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ''));

const parsePaymentInfo = (payments) => {
  const payList = Array.isArray(payments) ? payments : (payments ? [payments] : []);
  return payList.find(p => p.status === 'PAID' || p.payment_status === 'PAID') || payList[0] || {};
};

const createOrder = async (userId, addressId, couponCode = null, paymentMethod = 'RAZORPAY') => {
  // 1. Fetch user's active cart & calculate live subtotal
  const cart = await cartService.getUserCart(userId);
  if (!cart.items || cart.items.length === 0) {
    throw new AppError('Your cart is empty. Please add items before checkout.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  const cleanPaymentMethod = String(paymentMethod || 'RAZORPAY').toUpperCase() === 'COD' ? 'COD' : 'RAZORPAY';

  // 2. Minimum Order Value Check (Phase 16)
  const minOrderVal = config.store.minOrderValue || 199.0;
  if (cart.subtotal < minOrderVal) {
    const shortage = (minOrderVal - cart.subtotal).toFixed(0);
    throw new AppError(`Minimum order value for delivery is ₹${minOrderVal}. Please add ₹${shortage} more items to your cart.`, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  // 3. Calculate Delivery Charge (Phase 16 & 33)
  let deliveryCharge = 0;
  let distanceKm = 0;
  if (supabase && addressId) {
    const { data: address } = await supabase.from('addresses').select('*').eq('id', addressId).single();
    if (address) {
      const deliveryInfo = deliveryService.getDeliveryDetailsForAddress(address);
      if (!deliveryInfo.isDeliverable) {
        throw new AppError(deliveryInfo.reason || `Address is outside maximum delivery radius.`, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
      }
      deliveryCharge = deliveryInfo.deliveryCharge || 0;
      distanceKm = deliveryInfo.distanceKm || 0;
    }
  }

  // 4. Validate and Apply Coupon Discount Server-Side (Phase 15 & 19.3)
  let coupon = null;
  let discountAmount = 0;
  if (couponCode && String(couponCode).trim().length > 0) {
    const couponRes = await couponService.validateCoupon(userId, couponCode, addressId);
    coupon = couponRes.coupon || null;
    discountAmount = couponRes.discountAmount || 0;
  }

  // 5. Canonical Calculation — Single Source of Truth
  const totalPayableAmount = Math.max(0, cart.subtotal + deliveryCharge - discountAmount);

  // 6. Reserve Inventory Stock (Phase 17)
  const itemsToReserve = cart.items.map(i => ({ productId: i.productId, quantity: i.quantity }));
  let reservationSuccessful = false;
  try {
    await inventoryService.reserveStock(itemsToReserve);
    reservationSuccessful = true;
  } catch (err) {
    throw new AppError(err.message || 'Failed to reserve product stock for checkout.', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
  }

  // 7. Create Order Database Record (Phase 21: CONFIRMED + PENDING payment state)
  const orderNumber = `CKS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  if (supabase && isUuid(userId) && (!addressId || isUuid(addressId))) {
    try {
      const { data: newOrder, error: createErr } = await supabase.from('orders').insert([{
        user_id: userId,
        address_id: addressId,
        order_number: orderNumber,
        subtotal: cart.subtotal,
        delivery_charge: deliveryCharge,
        distance_km: distanceKm,
        coupon_id: coupon ? coupon.id : null,
        coupon_code: coupon ? coupon.code : null,
        discount_amount: discountAmount,
        total_amount: totalPayableAmount,
        status: ORDER_STATUS.CONFIRMED,
        payment_status: PAYMENT_STATUS.PENDING,
        payment_method: cleanPaymentMethod
      }]).select('*').single();

      if (createErr || !newOrder) {
        if (reservationSuccessful) {
          await inventoryService.releaseStock(itemsToReserve, null, 'ORDER_CREATION_FAILED');
        }
        throw new AppError('Failed to initialize order record: ' + (createErr?.message || 'Database error'), HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }

      // Insert order items
      const orderItemRows = cart.items.map(item => ({
        order_id: newOrder.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.sellingPrice,
        total_price: item.itemSubtotal
      }));
      await supabase.from('cart_items');
      await supabase.from('order_items').insert(orderItemRows);

      // Snapshot delivery address
      if (addressId) {
        const { data: addr } = await supabase.from('addresses').select('*').eq('id', addressId).single();
        if (addr) {
          await supabase.from('order_addresses').insert([{
            order_id: newOrder.id,
            recipient_name: addr.recipient_name,
            phone: addr.phone,
            address_line1: addr.address_line1,
            city: addr.city,
            state: addr.state,
            postal_code: addr.postal_code,
            latitude: addr.latitude,
            longitude: addr.longitude
          }]);
        }
      }

      // Record initial CONFIRMED status history entry
      await orderTrackingService.recordStatusChange({
        orderId: newOrder.id,
        previousStatus: null,
        newStatus: ORDER_STATUS.CONFIRMED,
        changedBy: userId,
        changedByRole: 'CUSTOMER',
        reason: 'Order placed by customer',
        metadata: { eventType: 'ORDER_CREATED', paymentMethod: cleanPaymentMethod }
      });

      // Generate Invoice for Confirmed Order (Idempotent)
      try {
        const invoiceService = require('./invoice.service');
        await invoiceService.generateInvoiceForOrder(newOrder.id);
      } catch (invErr) {
        console.error('Invoice generation notice:', invErr?.message);
      }

      return {
        orderId: newOrder.id,
        orderNumber: newOrder.order_number,
        status: ORDER_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.PENDING,
        paymentMethod: cleanPaymentMethod,
        subtotal: cart.subtotal,
        deliveryCharge,
        couponCode: coupon ? coupon.code : null,
        discountAmount,
        totalPayableAmount,
        totalAmount: totalPayableAmount, // Alias for backward compatibility
        message: 'Order placed successfully. Waiting for store confirmation.'
      };
    } catch (err) {
      if (reservationSuccessful) {
        await inventoryService.releaseStock(itemsToReserve, null, 'ORDER_CREATION_EXCEPTION');
      }
      throw err;
    }
  }

  // Local Mock Fallback
  const mockOrder = {
    id: `ord_${Date.now()}`,
    userId,
    orderNumber,
    subtotal: cart.subtotal,
    deliveryCharge,
    couponCode: coupon ? coupon.code : null,
    discountAmount,
    totalPayableAmount,
    status: ORDER_STATUS.CONFIRMED,
    paymentStatus: PAYMENT_STATUS.PENDING,
    paymentMethod: cleanPaymentMethod,
    items: cart.items,
    createdAt: new Date().toISOString()
  };
  mockOrders.push(mockOrder);

  try {
    await orderTrackingService.recordStatusChange({
      orderId: mockOrder.id,
      previousStatus: null,
      newStatus: ORDER_STATUS.CONFIRMED,
      changedBy: userId,
      changedByRole: 'CUSTOMER',
      reason: 'Order placed by customer',
      metadata: { eventType: 'ORDER_CREATED', paymentMethod: cleanPaymentMethod, orderNumber: mockOrder.orderNumber }
    });
  } catch (e) {}

  try {
    const invoiceService = require('./invoice.service');
    await invoiceService.generateInvoiceForOrder(mockOrder.id);
  } catch (invErr) {}

  return {
    orderId: mockOrder.id,
    orderNumber,
    subtotal: cart.subtotal,
    deliveryCharge,
    couponCode: coupon ? coupon.code : null,
    discountAmount,
    totalPayableAmount,
    totalAmount: totalPayableAmount,
    status: ORDER_STATUS.CONFIRMED,
    paymentStatus: PAYMENT_STATUS.PENDING,
    paymentMethod: cleanPaymentMethod,
    message: 'Order placed successfully. Waiting for store confirmation.'
  };
};

const getUserOrders = async (userId, queryParams = {}) => {
  const { page, limit, offset } = getPaginationParams(queryParams.page, queryParams.limit);

  if (supabase && isUuid(userId)) {
    const { data, count, error } = await supabase.from('orders')
      .select('*, order_items (*), payments ( status, razorpay_order_id, razorpay_payment_id, provider_payment_id )', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new AppError('Failed to fetch orders', HTTP_STATUS.INTERNAL_SERVER_ERROR);

    const formatted = data.map(o => {
      const pay = parsePaymentInfo(o.payments);
      return {
        id: o.id,
        orderNumber: o.order_number,
        status: o.status,
        paymentStatus: pay.status || o.payment_status || PAYMENT_STATUS.PENDING,
        razorpayOrderId: pay.razorpay_order_id,
        razorpayPaymentId: pay.razorpay_payment_id || pay.provider_payment_id || o.razorpay_payment_id,
        subtotal: parseFloat(o.subtotal),
        deliveryCharge: parseFloat(o.delivery_charge),
        couponCode: o.coupon_code,
        discountAmount: parseFloat(o.discount_amount || 0),
        totalPayableAmount: parseFloat(o.total_amount),
        totalAmount: parseFloat(o.total_amount),
        itemCount: o.order_items?.length || 0,
        createdAt: o.created_at
      };
    });

    return formatPaginatedResponse(formatted, page, limit, count || 0);
  }

  const userOrders = mockOrders.filter(o => o.userId === userId);
  return formatPaginatedResponse(userOrders, page, limit, userOrders.length);
};

const getOrderById = async (userId, orderId) => {
  if (supabase && isUuid(userId) && isUuid(orderId)) {
    const { data: order, error } = await supabase.from('orders')
      .select('*, order_items (*), order_addresses (*), payments (*)')
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
      .eq('user_id', userId)
      .single();

    if (error || !order) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);

    const pay = parsePaymentInfo(order.payments);
    return {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      paymentStatus: pay.status || order.payment_status || PAYMENT_STATUS.PENDING,
      razorpayOrderId: pay.razorpay_order_id,
      razorpayPaymentId: pay.razorpay_payment_id || pay.provider_payment_id || order.razorpay_payment_id,
      subtotal: parseFloat(order.subtotal),
      deliveryCharge: parseFloat(order.delivery_charge),
      couponCode: order.coupon_code,
      discountAmount: parseFloat(order.discount_amount || 0),
      totalPayableAmount: parseFloat(order.total_amount),
      totalAmount: parseFloat(order.total_amount),
      items: order.order_items || [],
      address: order.order_addresses?.[0] || null,
      createdAt: order.created_at
    };
  }

  const order = mockOrders.find(o => (o.id === orderId || o.orderNumber === orderId) && o.userId === userId);
  if (!order) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);
  return order;
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  mockOrders
};
