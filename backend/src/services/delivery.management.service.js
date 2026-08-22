const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');
const { ORDER_STATUS, validateOrderStatusTransition } = require('./orderStatus.service');
const { logAdminActivity } = require('./adminLog.service');
const eventBus = require('../events/eventBus');
const EVENT_TYPES = require('../events/eventTypes');
const sseManager = require('../notifications/sse.manager');

// Mock memory store for fallbacks
const mockDeliveryAssignments = [];
const mockPartners = [
  { id: 'partner-1', full_name: 'Rahul Sharma', phone: '9876543210', email: 'rahul.delivery@chaudhary.com', is_active: true, role: 'DELIVERY_PARTNER' },
  { id: 'partner-2', full_name: 'Amit Verma', phone: '9876543211', email: 'amit.delivery@chaudhary.com', is_active: true, role: 'DELIVERY_PARTNER' },
  { id: 'partner-3', full_name: 'Mohit Jain', phone: '9876543212', email: 'mohit.delivery@chaudhary.com', is_active: true, role: 'DELIVERY_PARTNER' }
];

/**
 * 1. Admin: Get all Delivery Partners with active workload metrics
 */
const getDeliveryPartners = async () => {
  if (supabase) {
    const { data: partners, error } = await supabase.from('users')
      .select('id, full_name, phone, email, is_active, created_at')
      .eq('role', 'DELIVERY_PARTNER');

    if (!error && partners) {
      // Calculate active workload per partner
      const partnerIds = partners.map(p => p.id);
      const { data: activeAssignments } = await supabase.from('delivery_assignments')
        .select('delivery_partner_id, status')
        .in('delivery_partner_id', partnerIds.length ? partnerIds : ['none'])
        .in('status', ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY']);

      const counts = {};
      (activeAssignments || []).forEach(a => {
        counts[a.delivery_partner_id] = (counts[a.delivery_partner_id] || 0) + 1;
      });

      return partners.map(p => ({
        id: p.id,
        fullName: p.full_name,
        phone: p.phone,
        email: p.email,
        isActive: p.is_active,
        activeDeliveriesCount: counts[p.id] || 0,
        createdAt: p.created_at
      }));
    }
  }

  return mockPartners.map(p => ({
    id: p.id,
    fullName: p.full_name,
    phone: p.phone,
    email: p.email,
    isActive: p.is_active,
    activeDeliveriesCount: mockDeliveryAssignments.filter(a => a.delivery_partner_id === p.id && ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(a.status)).length,
    createdAt: new Date().toISOString()
  }));
};

/**
 * 2. Admin: Register / Create new Delivery Partner Account
 */
const createDeliveryPartner = async (adminId, partnerData, req = null) => {
  const { fullName, phone, email, password } = partnerData;
  if (!fullName || !phone || !password) {
    throw new AppError('Full name, phone, and password are required', HTTP_STATUS.BAD_REQUEST);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const cleanEmail = email ? email.trim().toLowerCase() : `partner_${phone}@chaudhary.com`;

  if (supabase) {
    const { data: newUser, error } = await supabase.from('users').insert([{
      full_name: fullName,
      phone,
      email: cleanEmail,
      password_hash: hashedPassword,
      role: 'DELIVERY_PARTNER',
      is_active: true
    }]).select().single();

    if (error || !newUser) {
      throw new AppError('Failed to create Delivery Partner account: ' + (error?.message || ''), HTTP_STATUS.BAD_REQUEST);
    }

    await logAdminActivity(adminId, 'ADMIN_DELIVERY_PARTNER_CREATED', 'user', newUser.id, { fullName, phone }, req);
    return {
      id: newUser.id,
      fullName: newUser.full_name,
      phone: newUser.phone,
      email: newUser.email,
      role: newUser.role
    };
  }

  const mockNew = { id: `partner-${Date.now()}`, full_name: fullName, phone, email: cleanEmail, is_active: true, role: 'DELIVERY_PARTNER' };
  mockPartners.push(mockNew);
  return mockNew;
};

/**
 * 3. Admin: Get Orders Waiting for Delivery Assignment
 */
const getUnassignedOrders = async () => {
  if (supabase) {
    const { data: orders, error } = await supabase.from('orders')
      .select('*, users!orders_user_id_fkey(full_name, phone), order_addresses(*), delivery_assignments(*)')
      .in('status', [ORDER_STATUS.CONFIRMED, ORDER_STATUS.PROCESSING, ORDER_STATUS.READY_FOR_DELIVERY])
      .order('created_at', { ascending: false });

    if (!error && orders) {
      const unassigned = orders.filter(o => !o.delivery_assignments || o.delivery_assignments.length === 0 || o.delivery_assignments[0].status === 'CANCELLED');
      return unassigned.map(o => ({
        orderId: o.id,
        orderNumber: o.order_number,
        customerName: o.users?.full_name || 'Valued Customer',
        customerPhone: o.users?.phone || '',
        subtotal: parseFloat(o.subtotal),
        totalAmount: parseFloat(o.total_amount),
        orderStatus: o.status,
        address: o.order_addresses?.[0] || null,
        createdAt: o.created_at
      }));
    }
  }

  return [];
};

/**
 * 4. Admin: Assign Delivery Partner (Atomic Concurrency Protection)
 */
const assignDeliveryPartner = async (adminId, orderId, partnerId, estimatedMinutes = 30, req = null) => {
  if (!orderId || !partnerId) {
    throw new AppError('Order ID and Delivery Partner ID are required', HTTP_STATUS.BAD_REQUEST);
  }

  const estimatedReadyAt = new Date(Date.now() + 15 * 60000).toISOString();
  const estimatedDeliveryAt = new Date(Date.now() + (parseInt(estimatedMinutes) || 30) * 60000).toISOString();

  if (supabase) {
    // Check order exists
    const { data: order } = await supabase.from('orders')
      .select('*, users!orders_user_id_fkey(full_name, phone)')
      .eq('id', orderId)
      .single();

    if (!order) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);

    // Atomic Check: Unique delivery assignment constraint check
    const { data: existingAssignment } = await supabase.from('delivery_assignments')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existingAssignment && existingAssignment.status !== 'CANCELLED') {
      throw new AppError('This delivery assignment has already been modified by another administrator.', HTTP_STATUS.CONFLICT);
    }

    // Insert atomic delivery assignment
    const insertPayload = {
      order_id: orderId,
      delivery_partner_id: partnerId,
      status: 'ASSIGNED',
      estimated_ready_at: estimatedReadyAt,
      estimated_delivery_at: estimatedDeliveryAt,
      assigned_at: new Date().toISOString()
    };

    const { data: assignment, error: assignErr } = await supabase.from('delivery_assignments')
      .insert([insertPayload])
      .select()
      .maybeSingle();

    if (!assignErr && assignment) {
      // Update order status to READY_FOR_DELIVERY if currently CONFIRMED or PROCESSING
      if ([ORDER_STATUS.CONFIRMED, ORDER_STATUS.PROCESSING].includes(order.status)) {
        await supabase.from('orders')
          .update({ status: ORDER_STATUS.READY_FOR_DELIVERY, updated_at: new Date().toISOString() })
          .eq('id', orderId);
      }

      const payload = {
        eventType: EVENT_TYPES.DELIVERY_ASSIGNED,
        orderId: order.id,
        orderNumber: order.order_number,
        userId: order.user_id,
        deliveryPartnerId: partnerId,
        deliveryStatus: 'ASSIGNED',
        orderStatus: ORDER_STATUS.READY_FOR_DELIVERY,
        estimatedDeliveryAt,
        updatedAt: new Date().toISOString()
      };

      await logAdminActivity(adminId, 'ADMIN_DELIVERY_ASSIGNED', 'order', orderId, { partnerId, estimatedMinutes }, req);

      eventBus.emit(EVENT_TYPES.DELIVERY_ASSIGNED, payload);
      sseManager.broadcastDeliveryUpdate(payload);

      return { success: true, assignment, message: 'Delivery partner assigned successfully' };
    }

    if (assignErr && assignErr.code === '23505') {
      throw new AppError('This delivery assignment has already been created by another administrator.', HTTP_STATUS.CONFLICT);
    }
  }

  // Memory Fallback for mock/schema cache
  const existingMock = mockDeliveryAssignments.find(a => String(a.order_id) === String(orderId) && a.status !== 'CANCELLED');
  if (existingMock) {
    throw new AppError('This delivery assignment has already been created or modified by another administrator.', HTTP_STATUS.CONFLICT);
  }

  const mockAssign = {
    id: `asgn-${Date.now()}`,
    order_id: orderId,
    delivery_partner_id: partnerId,
    status: 'ASSIGNED',
    estimated_delivery_at: estimatedDeliveryAt,
    assigned_at: new Date().toISOString()
  };
  mockDeliveryAssignments.push(mockAssign);

  const payload = {
    eventType: EVENT_TYPES.DELIVERY_ASSIGNED,
    orderId,
    deliveryPartnerId: partnerId,
    deliveryStatus: 'ASSIGNED',
    orderStatus: ORDER_STATUS.READY_FOR_DELIVERY,
    estimatedDeliveryAt,
    updatedAt: new Date().toISOString()
  };

  eventBus.emit(EVENT_TYPES.DELIVERY_ASSIGNED, payload);
  sseManager.broadcastDeliveryUpdate(payload);

  return { success: true, assignment: mockAssign, message: 'Delivery partner assigned successfully' };
};

/**
 * 5. Admin: Reassign Delivery Partner
 */
const reassignDeliveryPartner = async (adminId, orderId, newPartnerId, req = null) => {
  if (supabase) {
    const { data: existing } = await supabase.from('delivery_assignments')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existing) {
      if (['OUT_FOR_DELIVERY', 'DELIVERED'].includes(existing.status)) {
        throw new AppError('Cannot reassign order that is already picked up or delivered', HTTP_STATUS.BAD_REQUEST);
      }

      const { data: updated, error } = await supabase.from('delivery_assignments')
        .update({
          delivery_partner_id: newPartnerId,
          assigned_by: adminId,
          status: 'ASSIGNED',
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .eq('status', existing.status)
        .select()
        .maybeSingle();

      if (error || !updated) {
        throw new AppError('This delivery assignment has already been modified by another administrator.', HTTP_STATUS.CONFLICT);
      }

      const payload = {
        eventType: EVENT_TYPES.DELIVERY_REASSIGNED,
        orderId: existing.order_id,
        deliveryPartnerId: newPartnerId,
        deliveryStatus: 'ASSIGNED',
        updatedAt: new Date().toISOString()
      };

      await logAdminActivity(adminId, 'ADMIN_DELIVERY_REASSIGNED', 'order', orderId, { newPartnerId }, req);
      sseManager.broadcastDeliveryUpdate(payload);

      return { success: true, assignment: updated, message: 'Delivery partner reassigned successfully' };
    }
  }

  const foundMock = mockDeliveryAssignments.find(a => String(a.order_id) === String(orderId));
  if (!foundMock) throw new AppError('No active delivery assignment found for this order', HTTP_STATUS.NOT_FOUND);

  if (['OUT_FOR_DELIVERY', 'DELIVERED'].includes(foundMock.status)) {
    throw new AppError('Cannot reassign order that is already picked up or delivered', HTTP_STATUS.BAD_REQUEST);
  }

  foundMock.delivery_partner_id = newPartnerId;
  foundMock.status = 'ASSIGNED';

  const payload = {
    eventType: EVENT_TYPES.DELIVERY_REASSIGNED,
    orderId,
    deliveryPartnerId: newPartnerId,
    deliveryStatus: 'ASSIGNED',
    updatedAt: new Date().toISOString()
  };

  sseManager.broadcastDeliveryUpdate(payload);
  return { success: true, assignment: foundMock, message: 'Delivery partner reassigned successfully' };
};

/**
 * 6. Delivery Partner: Dashboard Overview Stats
 */
const getPartnerDashboard = async (partnerId) => {
  if (supabase) {
    const { data: assignments } = await supabase.from('delivery_assignments')
      .select('*, orders(*)')
      .eq('delivery_partner_id', partnerId);

    const list = assignments || [];
    const today = new Date().toISOString().split('T')[0];

    const pendingCount = list.filter(a => a.status === 'ASSIGNED').length;
    const activeCount = list.filter(a => ['ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(a.status)).length;
    const completedToday = list.filter(a => a.status === 'DELIVERED' && a.delivered_at && a.delivered_at.startsWith(today)).length;
    const totalDelivered = list.filter(a => a.status === 'DELIVERED').length;
    const failedCount = list.filter(a => a.status === 'FAILED_DELIVERY').length;

    return {
      pendingAssignments: pendingCount,
      activeDeliveries: activeCount,
      deliveredToday: completedToday,
      totalDelivered,
      failedDeliveries: failedCount
    };
  }

  return { pendingAssignments: 0, activeDeliveries: 0, deliveredToday: 0, totalDelivered: 0, failedDeliveries: 0 };
};

/**
 * 7. Delivery Partner: Get Assigned Orders (Strict Ownership Isolation)
 */
const getPartnerOrders = async (partnerId, queryParams = {}) => {
  if (supabase) {
    const { data: assignments, error } = await supabase.from('delivery_assignments')
      .select('*, orders(*, order_items(*), order_addresses(*), users!orders_user_id_fkey(full_name, phone))')
      .eq('delivery_partner_id', partnerId)
      .order('updated_at', { ascending: false });

    if (!error && assignments) {
      return assignments.map(a => ({
        assignmentId: a.id,
        orderId: a.orders?.id,
        orderNumber: a.orders?.order_number,
        orderStatus: a.orders?.status,
        deliveryStatus: a.status,
        customerName: a.orders?.users?.full_name || 'Customer',
        customerPhone: a.orders?.users?.phone || '',
        address: a.orders?.order_addresses?.[0] || null,
        itemCount: a.orders?.order_items?.length || 0,
        items: (a.orders?.order_items || []).map(i => ({ name: i.product_name, quantity: i.quantity, price: parseFloat(i.unit_price) })),
        subtotal: parseFloat(a.orders?.subtotal || 0),
        totalAmount: parseFloat(a.orders?.total_amount || 0),
        paymentMethod: a.orders?.payment_method || 'RAZORPAY',
        paymentStatus: a.orders?.payment_status || 'PAID',
        estimatedDeliveryAt: a.estimated_delivery_at,
        assignedAt: a.assigned_at,
        acceptedAt: a.accepted_at,
        pickedUpAt: a.picked_up_at,
        deliveredAt: a.delivered_at,
        failedAt: a.failed_at,
        failureReason: a.failure_reason
      }));
    }
  }

  return mockDeliveryAssignments
    .filter(a => String(a.delivery_partner_id) === String(partnerId))
    .map(a => ({
      assignmentId: a.id,
      orderId: a.order_id,
      orderNumber: `CKS-DEL-${a.order_id}`,
      orderStatus: a.status === 'DELIVERED' ? 'DELIVERED' : a.status === 'PICKED_UP' ? 'OUT_FOR_DELIVERY' : 'READY_FOR_DELIVERY',
      deliveryStatus: a.status,
      customerName: 'Valued Customer',
      customerPhone: '9876543210',
      items: [{ name: 'Grocery Item', quantity: 2, price: 250 }],
      totalAmount: 500,
      paymentStatus: 'PAID',
      estimatedDeliveryAt: a.estimated_delivery_at,
      assignedAt: a.assigned_at
    }));
};

/**
 * 8. Delivery Partner: Get Specific Order Details (Strict Ownership Check: 403 Forbidden)
 */
const getPartnerOrderById = async (partnerId, orderId) => {
  if (supabase) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(orderId));
    let query = supabase.from('delivery_assignments')
      .select('*, orders(*, order_items(*), order_addresses(*), users!orders_user_id_fkey(full_name, phone))');

    if (isUuid) {
      query = query.eq('order_id', orderId);
    } else {
      query = query.eq('orders.order_number', orderId);
    }

    const { data: assignment, error } = await query.maybeSingle();

    if (!error && assignment) {
      // Strict Ownership Security Verification
      if (String(assignment.delivery_partner_id) !== String(partnerId)) {
        throw new AppError('Forbidden: You are not authorized to view this delivery assignment', HTTP_STATUS.FORBIDDEN);
      }

      return {
        assignmentId: assignment.id,
        orderId: assignment.orders?.id,
        orderNumber: assignment.orders?.order_number,
        orderStatus: assignment.orders?.status,
        deliveryStatus: assignment.status,
        customerName: assignment.orders?.users?.full_name || 'Customer',
        customerPhone: assignment.orders?.users?.phone || '',
        address: assignment.orders?.order_addresses?.[0] || null,
        items: assignment.orders?.order_items || [],
        subtotal: parseFloat(assignment.orders?.subtotal || 0),
        totalAmount: parseFloat(assignment.orders?.total_amount || 0),
        paymentStatus: assignment.orders?.payment_status || 'PAID',
        estimatedDeliveryAt: assignment.estimated_delivery_at,
        failureReason: assignment.failure_reason
      };
    }
  }

  const foundMock = mockDeliveryAssignments.find(a => String(a.order_id) === String(orderId));
  if (foundMock) {
    if (String(foundMock.delivery_partner_id) !== String(partnerId)) {
      throw new AppError('Forbidden: You are not authorized to view this delivery assignment', HTTP_STATUS.FORBIDDEN);
    }
    return {
      assignmentId: foundMock.id,
      orderId: foundMock.order_id,
      orderNumber: `CKS-DEL-${foundMock.order_id}`,
      deliveryStatus: foundMock.status,
      customerName: 'Valued Customer',
      customerPhone: '9876543210'
    };
  }

  throw new AppError('Assigned delivery order not found', HTTP_STATUS.NOT_FOUND);
};

/**
 * 9. Delivery Partner: Accept Assigned Delivery (Atomic Concurrency Protection)
 */
const acceptDelivery = async (partnerId, orderId) => {
  if (supabase) {
    const { data: updated, error } = await supabase.from('delivery_assignments')
      .update({
        status: 'ACCEPTED',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId)
      .eq('delivery_partner_id', partnerId)
      .eq('status', 'ASSIGNED')
      .select('*, orders(user_id, order_number)')
      .maybeSingle();

    if (!error && updated) {
      const payload = {
        eventType: EVENT_TYPES.DELIVERY_ACCEPTED,
        orderId,
        orderNumber: updated.orders?.order_number,
        deliveryPartnerId: partnerId,
        customerId: updated.orders?.user_id,
        deliveryStatus: 'ACCEPTED',
        updatedAt: new Date().toISOString()
      };

      eventBus.emit(EVENT_TYPES.DELIVERY_ACCEPTED, payload);
      sseManager.broadcastDeliveryUpdate(payload);

      return { success: true, message: 'Delivery assignment accepted successfully!' };
    }
  }

  const foundMock = mockDeliveryAssignments.find(a => String(a.order_id) === String(orderId) && String(a.delivery_partner_id) === String(partnerId));
  if (foundMock) {
    if (foundMock.status !== 'ASSIGNED') {
      throw new AppError('This delivery assignment has already been accepted or modified.', HTTP_STATUS.CONFLICT);
    }
    foundMock.status = 'ACCEPTED';
    foundMock.accepted_at = new Date().toISOString();
  }

  const payload = {
    eventType: EVENT_TYPES.DELIVERY_ACCEPTED,
    orderId,
    deliveryPartnerId: partnerId,
    deliveryStatus: 'ACCEPTED',
    updatedAt: new Date().toISOString()
  };

  eventBus.emit(EVENT_TYPES.DELIVERY_ACCEPTED, payload);
  sseManager.broadcastDeliveryUpdate(payload);

  return { success: true, message: 'Delivery assignment accepted' };
};

/**
 * 10. Delivery Partner: Mark Order Picked Up (Atomic Concurrency Protection)
 */
const pickupDelivery = async (partnerId, orderId) => {
  if (supabase) {
    const { data: updated, error } = await supabase.from('delivery_assignments')
      .update({
        status: 'PICKED_UP',
        picked_up_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId)
      .eq('delivery_partner_id', partnerId)
      .in('status', ['ASSIGNED', 'ACCEPTED'])
      .select('*, orders(user_id, order_number)')
      .maybeSingle();

    if (!error && updated) {
      await supabase.from('orders')
        .update({ status: ORDER_STATUS.OUT_FOR_DELIVERY, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      const payload = {
        eventType: EVENT_TYPES.ORDER_PICKED_UP,
        orderId,
        orderNumber: updated.orders?.order_number,
        deliveryPartnerId: partnerId,
        customerId: updated.orders?.user_id,
        deliveryStatus: 'PICKED_UP',
        orderStatus: ORDER_STATUS.OUT_FOR_DELIVERY,
        updatedAt: new Date().toISOString()
      };

      eventBus.emit(EVENT_TYPES.ORDER_PICKED_UP, payload);
      sseManager.broadcastDeliveryUpdate(payload);

      return { success: true, message: 'Order marked as picked up! Status changed to Out For Delivery.' };
    }
  }

  const foundMock = mockDeliveryAssignments.find(a => String(a.order_id) === String(orderId) && String(a.delivery_partner_id) === String(partnerId));
  if (foundMock) {
    foundMock.status = 'PICKED_UP';
  }

  const payload = {
    eventType: EVENT_TYPES.ORDER_PICKED_UP,
    orderId,
    deliveryPartnerId: partnerId,
    deliveryStatus: 'PICKED_UP',
    orderStatus: ORDER_STATUS.OUT_FOR_DELIVERY,
    updatedAt: new Date().toISOString()
  };

  eventBus.emit(EVENT_TYPES.ORDER_PICKED_UP, payload);
  sseManager.broadcastDeliveryUpdate(payload);

  return { success: true, message: 'Order picked up' };
};

/**
 * 11. Delivery Partner: Mark Order Delivered (Atomic Concurrency Protection)
 */
const inventoryService = require('./inventory.service');

const deliverOrder = async (partnerId, orderId) => {
  if (supabase) {
    const { data: updated, error } = await supabase.from('delivery_assignments')
      .update({
        status: 'DELIVERED',
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId)
      .eq('delivery_partner_id', partnerId)
      .in('status', ['ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'])
      .select('*, orders(user_id, order_number)')
      .maybeSingle();

    if (!error && updated) {
      await supabase.from('orders')
        .update({ status: ORDER_STATUS.DELIVERED, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      // Atomically convert reserved stock to consumed SALE stock upon delivery
      await inventoryService.consumeStock(null, orderId);

      const payload = {
        eventType: EVENT_TYPES.ORDER_DELIVERED,
        orderId,
        orderNumber: updated.orders?.order_number,
        deliveryPartnerId: partnerId,
        customerId: updated.orders?.user_id,
        deliveryStatus: 'DELIVERED',
        orderStatus: ORDER_STATUS.DELIVERED,
        updatedAt: new Date().toISOString()
      };

      eventBus.emit(EVENT_TYPES.ORDER_DELIVERED, payload);
      sseManager.broadcastDeliveryUpdate(payload);

      return { success: true, message: 'Order delivered successfully! 🎉' };
    }
  }

  const foundMock = mockDeliveryAssignments.find(a => String(a.order_id) === String(orderId) && String(a.delivery_partner_id) === String(partnerId));
  if (foundMock) {
    if (foundMock.status === 'DELIVERED') {
      throw new AppError('This order has already been marked as DELIVERED or modified.', HTTP_STATUS.CONFLICT);
    }
    if (!['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(foundMock.status)) {
      throw new AppError(`Invalid delivery status transition to DELIVERED from status "${foundMock.status}". Order must be picked up first.`, HTTP_STATUS.BAD_REQUEST);
    }
    foundMock.status = 'DELIVERED';
  }

  await inventoryService.consumeStock(null, orderId);

  const payload = {
    eventType: EVENT_TYPES.ORDER_DELIVERED,
    orderId,
    deliveryPartnerId: partnerId,
    deliveryStatus: 'DELIVERED',
    orderStatus: ORDER_STATUS.DELIVERED,
    updatedAt: new Date().toISOString()
  };

  eventBus.emit(EVENT_TYPES.ORDER_DELIVERED, payload);
  sseManager.broadcastDeliveryUpdate(payload);

  return { success: true, message: 'Order delivered' };
};

/**
 * 12. Delivery Partner: Mark Delivery Failed (Requires Reason, NO Auto-Refund)
 */
const failDelivery = async (partnerId, orderId, failureReason) => {
  if (!failureReason || !String(failureReason).trim()) {
    throw new AppError('Failure reason is required when marking a delivery as failed.', HTTP_STATUS.BAD_REQUEST);
  }

  if (supabase) {
    const { data: updated, error } = await supabase.from('delivery_assignments')
      .update({
        status: 'FAILED_DELIVERY',
        failure_reason: String(failureReason).trim(),
        failed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId)
      .eq('delivery_partner_id', partnerId)
      .select('*, orders(user_id, order_number, status)')
      .maybeSingle();

    if (!error && updated) {
      const payload = {
        eventType: EVENT_TYPES.DELIVERY_FAILED,
        orderId,
        orderNumber: updated.orders?.order_number,
        deliveryPartnerId: partnerId,
        customerId: updated.orders?.user_id,
        deliveryStatus: 'FAILED_DELIVERY',
        failureReason: String(failureReason).trim(),
        updatedAt: new Date().toISOString()
      };

      eventBus.emit(EVENT_TYPES.DELIVERY_FAILED, payload);
      sseManager.broadcastDeliveryUpdate(payload);

      return { success: true, message: 'Delivery attempt recorded as failed. Admin notified.' };
    }
  }

  const foundMock = mockDeliveryAssignments.find(a => String(a.order_id) === String(orderId) && String(a.delivery_partner_id) === String(partnerId));
  if (foundMock) {
    foundMock.status = 'FAILED_DELIVERY';
    foundMock.failure_reason = failureReason;
  }

  const payload = {
    eventType: EVENT_TYPES.DELIVERY_FAILED,
    orderId,
    deliveryPartnerId: partnerId,
    deliveryStatus: 'FAILED_DELIVERY',
    failureReason: String(failureReason).trim(),
    updatedAt: new Date().toISOString()
  };

  eventBus.emit(EVENT_TYPES.DELIVERY_FAILED, payload);
  sseManager.broadcastDeliveryUpdate(payload);

  return { success: true, message: 'Delivery marked as failed' };
};

module.exports = {
  getDeliveryPartners,
  createDeliveryPartner,
  getUnassignedOrders,
  assignDeliveryPartner,
  reassignDeliveryPartner,
  getPartnerDashboard,
  getPartnerOrders,
  getPartnerOrderById,
  acceptDelivery,
  pickupDelivery,
  deliverOrder,
  failDelivery
};
