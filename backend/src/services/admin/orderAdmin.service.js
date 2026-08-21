const supabase = require('../../config/supabase');
const { validateOrderStatusTransition } = require('../orderStatus.service');
const { logAdminActivity } = require('../adminLog.service');
const eventBus = require('../../events/eventBus');
const EVENT_TYPES = require('../../events/eventTypes');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');
const { getPaginationParams, formatPaginatedResponse } = require('../../utils/pagination');

const getAdminOrders = async (queryParams = {}) => {
  const { page, limit, offset } = getPaginationParams(queryParams.page, queryParams.limit);

  if (supabase) {
    let query = supabase.from('orders')
      .select('*, order_items (*), users ( full_name, phone ), payments ( status )', { count: 'exact' });

    if (queryParams.status) {
      query = query.eq('status', queryParams.status);
    }
    if (queryParams.search) {
      query = query.or(`order_number.ilike.%${queryParams.search}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new AppError('Failed to fetch admin orders', HTTP_STATUS.INTERNAL_SERVER_ERROR);

    const formatted = data.map(o => ({
      id: o.id,
      orderNumber: o.order_number,
      customerName: o.users?.full_name || 'Customer',
      customerPhone: o.users?.phone || '',
      status: o.status,
      paymentStatus: o.payments?.[0]?.status || 'PENDING',
      subtotal: parseFloat(o.subtotal),
      deliveryCharge: parseFloat(o.delivery_charge),
      totalAmount: parseFloat(o.total_amount),
      itemCount: o.order_items?.length || 0,
      createdAt: o.created_at
    }));

    return formatPaginatedResponse(formatted, page, limit, count || 0);
  }

  // Mock Fallback
  const mockList = [
    { id: 'ord-1', orderNumber: 'CKS-20260821-0001', customerName: 'Rahul Sharma', customerPhone: '9876543210', status: 'CONFIRMED', paymentStatus: 'PAID', totalAmount: 650, itemCount: 3, createdAt: new Date().toISOString() },
    { id: 'ord-2', orderNumber: 'CKS-20260821-0002', customerName: 'Priya Gupta', customerPhone: '9123456789', status: 'OUT_FOR_DELIVERY', paymentStatus: 'PAID', totalAmount: 1120, itemCount: 5, createdAt: new Date().toISOString() }
  ];
  return formatPaginatedResponse(mockList, page, limit, mockList.length);
};

const updateOrderStatus = async (userId, orderId, { status }, req = null) => {
  if (supabase) {
    const { data: order } = await supabase.from('orders')
      .select('*, users ( full_name, phone )')
      .or(`id.eq.${orderId},order_number.eq.${orderId}`)
      .single();

    if (!order) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);

    validateOrderStatusTransition(order.status, status);

    const { data: updated } = await supabase.from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .select()
      .single();

    await logAdminActivity(userId, 'ORDER_STATUS_UPDATED', 'order', order.id, { oldStatus: order.status, newStatus: status }, req);

    // Trigger Notification Events
    if (status === 'OUT_FOR_DELIVERY') {
      eventBus.emit(EVENT_TYPES.ORDER_OUT_FOR_DELIVERY, {
        userId: order.user_id,
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: order.users?.full_name,
        customerPhone: order.users?.phone
      });
    } else if (status === 'DELIVERED') {
      eventBus.emit(EVENT_TYPES.ORDER_DELIVERED, {
        userId: order.user_id,
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: order.users?.full_name,
        customerPhone: order.users?.phone
      });
    }

    return { orderId: order.id, status: updated.status, message: `Order status updated to ${status}` };
  }

  return { orderId, status, message: `Order status updated to ${status}` };
};

module.exports = {
  getAdminOrders,
  updateOrderStatus
};
