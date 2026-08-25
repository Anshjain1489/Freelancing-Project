const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');
const { ORDER_STATUS, PAYMENT_STATUS } = require('./orderStatus.service');
const { logAdminActivity } = require('./adminLog.service');
const eventBus = require('../events/eventBus');
const EVENT_TYPES = require('../events/eventTypes');
const sseManager = require('../notifications/sse.manager');
const whatsappService = require('./whatsapp.service');
const orderTrackingService = require('./orderTracking.service');

const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

/**
 * Phase 20.6 Centralized Delivery Eligibility & Assignment Helpers
 */
const DELIVERY_ELIGIBLE_ORDER_STATUSES = [
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.READY_FOR_DELIVERY
];

const ACTIVE_DELIVERY_ASSIGNMENT_STATUSES = [
  'ASSIGNED',
  'ACCEPTED',
  'PICKED_UP',
  'OUT_FOR_DELIVERY'
];

function isOrderReadyForDelivery(order) {
  if (!order || !order.status) return false;

  const validStatus =
    order.status === ORDER_STATUS.PROCESSING ||
    order.status === ORDER_STATUS.READY_FOR_DELIVERY;

  const rawPaymentMethod = order.payment_method || order.paymentMethod;
  const rawPaymentStatus = order.payment_status || order.paymentStatus;

  const paymentStatus = rawPaymentStatus ? String(rawPaymentStatus).toUpperCase() : (rawPaymentMethod ? 'PENDING' : 'PAID');
  const paymentMethod = rawPaymentMethod ? String(rawPaymentMethod).toUpperCase() : 'RAZORPAY';

  const validPayment =
    paymentStatus === PAYMENT_STATUS.PAID ||
    paymentStatus === 'PAID' ||
    paymentMethod === 'COD';

  return Boolean(validStatus && validPayment);
}

function hasActiveDeliveryAssignment(assignments) {
  if (!assignments) return false;
  const list = Array.isArray(assignments) ? assignments : [assignments];
  return list.some(a => a && ACTIVE_DELIVERY_ASSIGNMENT_STATUSES.includes(a.status));
}

// Memory fallbacks
const mockDeliveryAssignments = [];
const mockPartners = [
  { id: 'partner-1', full_name: 'Rahul Sharma', phone: '9876543210', email: 'rahul.delivery@chaudhary.com', is_active: true, role: 'DELIVERY_PARTNER' },
  { id: 'partner-2', full_name: 'Amit Verma', phone: '9876543211', email: 'amit.delivery@chaudhary.com', is_active: true, role: 'DELIVERY_PARTNER' },
  { id: 'partner-3', full_name: 'Mohit Jain', phone: '9876543212', email: 'mohit.delivery@chaudhary.com', is_active: true, role: 'DELIVERY_PARTNER' }
];

/**
 * Address Parsing Helper
 */
const parseDeliveryAddress = (addr) => {
  if (!addr) return null;
  const houseNumber = addr.address_line1 || '';
  const street = addr.address_line2 || '';
  const landmark = addr.landmark || '';
  const city = addr.city || '';
  const state = addr.state || '';
  const pincode = addr.postal_code || '';

  const parts = [houseNumber, street, landmark, city, state, pincode].filter(Boolean);
  const fullAddressLine = parts.join(', ');

  return {
    houseNumber,
    street,
    locality: street || landmark || city || 'Mahruni',
    landmark,
    city,
    state,
    pincode,
    fullAddressLine
  };
};

/**
 * Default Address Fallback
 */
const defaultDeliveryAddress = {
  houseNumber: '123 MG Road',
  street: 'Main Market Road',
  locality: 'Central Market',
  landmark: 'Near Store',
  city: 'Mahruni',
  state: 'Uttar Pradesh',
  pincode: '272001',
  fullAddressLine: '123 MG Road, Main Market Road, Mahruni, Uttar Pradesh - 272001'
};

/**
 * Google Maps URL Generator
 */
const generateGoogleMapsUrl = (addressObj) => {
  const target = addressObj || defaultDeliveryAddress;
  const queryStr = target.fullAddressLine || [target.houseNumber, target.street, target.city, target.state, target.pincode].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryStr)}`;
};

/**
 * Clickable Phone Call URL Generator
 */
const generateCallUrl = (phone) => {
  const clean = String(phone || '9876543210').replace(/[^0-9+]/g, '');
  return clean.startsWith('+') ? `tel:${clean}` : `tel:+91${clean.replace(/^0+/, '')}`;
};

/**
 * 1. Admin: Get all Delivery Partners with active workload & completed metrics
 */
const getDeliveryPartners = async () => {
  if (supabase) {
    const { data: partners, error } = await supabase.from('users')
      .select('id, full_name, phone, email, is_active, created_at')
      .eq('role', 'DELIVERY_PARTNER');

    if (!error && partners) {
      const partnerIds = partners.map(p => p.id);
      const today = new Date().toISOString().split('T')[0];

      const { data: activeAssignments } = await supabase.from('delivery_assignments')
        .select('delivery_partner_id, status, delivered_at')
        .in('delivery_partner_id', partnerIds.length ? partnerIds : ['none']);

      const activeCounts = {};
      const completedTodayCounts = {};

      (activeAssignments || []).forEach(a => {
        if (['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(a.status)) {
          activeCounts[a.delivery_partner_id] = (activeCounts[a.delivery_partner_id] || 0) + 1;
        }
        if (a.status === 'DELIVERED' && a.delivered_at && a.delivered_at.startsWith(today)) {
          completedTodayCounts[a.delivery_partner_id] = (completedTodayCounts[a.delivery_partner_id] || 0) + 1;
        }
      });

      return partners.map(p => ({
        id: p.id,
        fullName: p.full_name,
        name: p.full_name,
        phone: p.phone,
        email: p.email,
        isActive: p.is_active,
        activeDeliveriesCount: activeCounts[p.id] || 0,
        completedTodayCount: completedTodayCounts[p.id] || 0,
        createdAt: p.created_at
      }));
    }
  }

  return mockPartners.map(p => ({
    id: p.id,
    fullName: p.full_name,
    name: p.full_name,
    phone: p.phone,
    email: p.email,
    isActive: p.is_active,
    activeDeliveriesCount: mockDeliveryAssignments.filter(a => a.delivery_partner_id === p.id && ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(a.status)).length,
    completedTodayCount: mockDeliveryAssignments.filter(a => a.delivery_partner_id === p.id && a.status === 'DELIVERED').length,
    createdAt: new Date().toISOString()
  }));
};

/**
 * 2. Admin: Register / Create new Delivery Partner Account
 */
const createDeliveryPartner = async (adminId, partnerData, req = null) => {
  const { fullName, name, phone, email, password } = partnerData || {};
  const actualName = fullName || name;
  if (!actualName || !String(actualName).trim()) {
    throw new AppError('Full name is required', HTTP_STATUS.BAD_REQUEST);
  }

  if (!phone || !String(phone).trim()) {
    throw new AppError('Phone number is required', HTTP_STATUS.BAD_REQUEST);
  }

  // Clean phone to digits only (e.g. +91 98765 43210 -> 9876543210)
  const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
  if (!cleanPhone || cleanPhone.length < 10) {
    throw new AppError('Please provide a valid 10-digit phone number', HTTP_STATUS.BAD_REQUEST);
  }

  if (!password || String(password).length < 4) {
    throw new AppError('Password must be at least 4 characters', HTTP_STATUS.BAD_REQUEST);
  }

  const cleanEmail = email && String(email).trim() ? String(email).trim().toLowerCase() : null;
  const dbEmail = cleanEmail || `partner_${cleanPhone}_${Date.now().toString().slice(-4)}@chaudhary.com`;

  const hashedPassword = await bcrypt.hash(password, 10);

  if (supabase) {
    const { data: existingUser } = await supabase.from('users')
      .select('id, phone, email')
      .or(`phone.eq.${cleanPhone},email.eq.${dbEmail}`)
      .maybeSingle();

    if (existingUser) {
      throw new AppError('An account with this phone number or email already exists.', HTTP_STATUS.CONFLICT);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const { data: newUser, error: createErr } = await supabase.from('users')
      .insert([{
        full_name: actualName.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        password_hash: passwordHash,
        role: 'DELIVERY_PARTNER',
        is_active: true
      }])
      .select('id, full_name, phone, email, role')
      .single();

    if (createErr || !newUser) {
      throw new AppError(`Failed to create Delivery Partner account: ${createErr?.message || 'DB Error'}`, HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    try {
      const { data: partnerRole } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'DELIVERY_PARTNER')
        .maybeSingle();

      if (partnerRole) {
        await supabase.from('user_roles').insert([{
          user_id: newUser.id,
          role_id: partnerRole.id
        }]);
      }
    } catch (syncErr) {
      console.warn('[USER_ROLES_SYNC_NOTICE]', syncErr.message);
    }

    await logAdminActivity(adminId || 'admin-1', 'ADMIN_DELIVERY_PARTNER_CREATED', 'user', newUser.id, { fullName: actualName.trim(), phone: cleanPhone }, req);

    return {
      id: newUser.id,
      fullName: newUser.full_name,
      phone: newUser.phone,
      email: newUser.email,
      role: newUser.role || 'DELIVERY_PARTNER'
    };
  }

  const existingMock = mockPartners.find(p => p.phone === cleanPhone || (cleanEmail && p.email === cleanEmail));
  if (existingMock) {
    throw new AppError('An account with this phone number or email already exists.', HTTP_STATUS.CONFLICT);
  }

  const mockNew = { id: `partner-${Date.now()}`, full_name: actualName.trim(), phone: cleanPhone, email: cleanEmail, is_active: true, role: 'DELIVERY_PARTNER' };
  mockPartners.push(mockNew);
  return mockNew;
};

/**
 * 3. Admin: Get Delivery Dashboard Overview Metrics
 */
const getAdminDeliveryDashboard = async () => {
  if (supabase) {
    const today = new Date().toISOString().split('T')[0];

    const unassignedList = await getUnassignedOrders();

    const { data: assignments } = await supabase.from('delivery_assignments').select('*');
    const listAssignments = assignments || [];

    const assignedCount = listAssignments.filter(a => ['ASSIGNED', 'ACCEPTED'].includes(a.status)).length;
    const outForDeliveryCount = listAssignments.filter(a => ['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(a.status)).length;
    const deliveredTodayCount = listAssignments.filter(a => a.status === 'DELIVERED' && a.delivered_at && a.delivered_at.startsWith(today)).length;
    const failedDeliveriesCount = listAssignments.filter(a => a.status === 'FAILED_DELIVERY').length;

    return {
      unassignedOrders: unassignedList.length,
      assignedOrders: assignedCount,
      outForDelivery: outForDeliveryCount,
      deliveredToday: deliveredTodayCount,
      failedDeliveries: failedDeliveriesCount
    };
  }

  return {
    unassignedOrders: 0,
    assignedOrders: 0,
    outForDelivery: 0,
    deliveredToday: 0,
    failedDeliveries: 0
  };
};

/**
 * 4. Admin: Get Orders Waiting for Delivery Assignment (With Customer Details)
 */
const getUnassignedOrders = async () => {
  if (supabase) {
    const { data: orders, error } = await supabase.from('orders')
      .select('*, users!orders_user_id_fkey(id, full_name, phone, email), order_addresses(*), order_items(*), delivery_assignments(*)')
      .in('status', DELIVERY_ELIGIBLE_ORDER_STATUSES)
      .order('created_at', { ascending: false });

    if (!error && orders) {
      const unassigned = orders.filter(o => isOrderReadyForDelivery(o) && !hasActiveDeliveryAssignment(o.delivery_assignments));

      if (process.env.NODE_ENV !== 'production') {
        unassigned.forEach(o => {
          console.log('[Delivery Queue]', {
            orderId: o.id,
            status: o.status,
            eligible: isOrderReadyForDelivery(o),
            hasActiveAssignment: hasActiveDeliveryAssignment(o.delivery_assignments)
          });
        });
      }

      return unassigned.map(o => {
        const rawAddr = o.order_addresses?.[0] || null;
        const deliveryAddress = parseDeliveryAddress(rawAddr) || defaultDeliveryAddress;

        return {
          orderId: o.id,
          orderNumber: o.order_number,
          orderStatus: o.status,
          totalAmount: parseFloat(o.total_amount),
          subtotal: parseFloat(o.subtotal),
          paymentStatus: o.payment_status || 'PAID',
          paymentMethod: o.payment_method || 'RAZORPAY',
          createdAt: o.created_at,
          customer: {
            id: o.users?.id || o.user_id,
            name: o.users?.full_name || 'Valued Customer',
            phone: o.users?.phone || '9876543210',
            email: o.users?.email || 'customer@example.com'
          },
          customerName: o.users?.full_name || 'Valued Customer',
          customerPhone: o.users?.phone || '9876543210',
          deliveryAddress,
          address: rawAddr,
          itemCount: o.order_items?.length || 0,
          items: (o.order_items || []).map(i => ({ name: i.product_name, quantity: i.quantity, price: parseFloat(i.unit_price) }))
        };
      });
    }
  }

  return [];
};

/**
 * 5. Admin: Get Assigned Delivery Orders
 */
const getAssignedDeliveries = async () => {
  if (supabase) {
    const { data: assignments, error } = await supabase.from('delivery_assignments')
      .select('*, orders(*, order_items(*), order_addresses(*), users!orders_user_id_fkey(id, full_name, phone, email)), partner:users!delivery_assignments_delivery_partner_id_fkey(id, full_name, phone, email)')
      .order('updated_at', { ascending: false });

    if (!error && assignments) {
      return assignments
        .filter(a => a.status !== 'CANCELLED')
        .map(a => {
          const rawAddr = a.orders?.order_addresses?.[0] || null;
          const deliveryAddress = parseDeliveryAddress(rawAddr) || defaultDeliveryAddress;

          return {
            assignmentId: a.id,
            orderId: a.orders?.id || a.order_id,
            orderNumber: a.orders?.order_number || `CKS-DEL-${a.order_id}`,
            orderStatus: a.orders?.status || 'PROCESSING',
            deliveryStatus: a.status,
            whatsappStatus: 'READY_TO_SEND',
            whatsappAvailable: true,
            totalAmount: parseFloat(a.orders?.total_amount || 0),
            paymentStatus: a.orders?.payment_status || 'PAID',
            customer: {
              id: a.orders?.users?.id,
              name: a.orders?.users?.full_name || 'Customer',
              phone: a.orders?.users?.phone || '9876543210',
              email: a.orders?.users?.email || 'customer@example.com'
            },
            deliveryAddress,
            deliveryPartner: {
              id: a.partner?.id || a.delivery_partner_id,
              name: a.partner?.full_name || 'Partner',
              phone: a.partner?.phone || '9876543210',
              email: a.partner?.email || 'partner@example.com'
            },
            assignedAt: a.assigned_at,
            estimatedDeliveryAt: a.estimated_delivery_at,
            notes: a.notes || null,
            acceptedAt: a.accepted_at,
            pickedUpAt: a.picked_up_at,
            deliveredAt: a.delivered_at,
            failedAt: a.failed_at,
            failureReason: a.failure_reason
          };
        });
    }
  }

  return mockDeliveryAssignments.map(a => ({
    assignmentId: a.id,
    orderId: a.order_id,
    orderNumber: `CKS-DEL-${a.order_id}`,
    deliveryStatus: a.status,
    whatsappStatus: 'READY_TO_SEND',
    whatsappAvailable: true,
    customer: { name: 'Valued Customer', phone: '9876543210', email: 'customer@example.com' },
    deliveryAddress: defaultDeliveryAddress,
    deliveryPartner: { name: 'Rahul Sharma', phone: '9876543210' },
    assignedAt: a.assigned_at,
    estimatedDeliveryAt: a.estimated_delivery_at,
    notes: a.notes || null
  }));
};

/**
 * 6. Admin: Assign Delivery Partner
 */
const assignDeliveryPartner = async (adminId, orderId, partnerId, estimatedMinutes = 30, req = null, deliveryNotes = null) => {
  if (!orderId || !partnerId) {
    throw new AppError('Order ID and Delivery Partner ID are required', HTTP_STATUS.BAD_REQUEST);
  }

  const estimatedReadyAt = new Date(Date.now() + 15 * 60000).toISOString();
  const estimatedDeliveryAt = new Date(Date.now() + (parseInt(estimatedMinutes) || 30) * 60000).toISOString();

  let assignmentRecord = null;

  if (supabase) {
    const { data: order } = await supabase.from('orders')
      .select('*, users!orders_user_id_fkey(full_name, phone)')
      .eq('id', orderId)
      .single();

    if (!order) throw new AppError('Order not found', HTTP_STATUS.NOT_FOUND);

    const { data: existingAssignment } = await supabase.from('delivery_assignments')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existingAssignment && existingAssignment.status !== 'CANCELLED') {
      throw new AppError('This delivery assignment has already been modified by another administrator.', HTTP_STATUS.CONFLICT);
    }

    let validAdminId = null;
    if (adminId && isUUID(adminId)) {
      const { data: adminUser } = await supabase.from('users').select('id').eq('id', adminId).maybeSingle();
      if (adminUser) validAdminId = adminUser.id;
    }

    const insertPayload = {
      order_id: orderId,
      delivery_partner_id: partnerId,
      assigned_by: validAdminId,
      status: 'ASSIGNED',
      estimated_ready_at: estimatedReadyAt,
      estimated_delivery_at: estimatedDeliveryAt,
      assigned_at: new Date().toISOString(),
      delivery_notes: deliveryNotes || null
    };

    const { data: assignment, error: assignErr } = await supabase.from('delivery_assignments')
      .insert([insertPayload])
      .select()
      .maybeSingle();

    if (assignErr && assignErr.code === '23505') {
      throw new AppError('This delivery assignment has already been created by another administrator.', HTTP_STATUS.CONFLICT);
    }

    if (!assignErr && assignment) {
      assignmentRecord = assignment;
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
        notes: deliveryNotes || null,
        updatedAt: new Date().toISOString()
      };

      await logAdminActivity(adminId, 'ADMIN_DELIVERY_ASSIGNED', 'order', orderId, { partnerId, estimatedMinutes, deliveryNotes }, req);

      eventBus.emit(EVENT_TYPES.DELIVERY_ASSIGNED, payload);
      sseManager.broadcastDeliveryUpdate(payload);

      await orderTrackingService.recordStatusChange({
        orderId: order.id,
        previousStatus: order.status,
        newStatus: order.status,
        changedBy: adminId,
        changedByRole: 'ADMIN',
        reason: 'Delivery partner assigned by store admin',
        metadata: { eventType: 'DELIVERY_ASSIGNED', deliveryPartnerId: partnerId, assignmentStatus: 'ASSIGNED' }
      });
    }
  } else {
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
      notes: deliveryNotes || null,
      assigned_at: new Date().toISOString()
    };
    mockDeliveryAssignments.push(mockAssign);
    assignmentRecord = mockAssign;

    const payload = {
      eventType: EVENT_TYPES.DELIVERY_ASSIGNED,
      orderId,
      deliveryPartnerId: partnerId,
      deliveryStatus: 'ASSIGNED',
      orderStatus: ORDER_STATUS.READY_FOR_DELIVERY,
      estimatedDeliveryAt,
      notes: deliveryNotes || null,
      updatedAt: new Date().toISOString()
    };

    eventBus.emit(EVENT_TYPES.DELIVERY_ASSIGNED, payload);
    sseManager.broadcastDeliveryUpdate(payload);
  }

  // Safe WhatsApp Click-to-Chat URL generation (never throws or causes rollback)
  let whatsappInfo = { available: false, url: null, message: null };
  try {
    const waLinkRes = await whatsappService.generateDeliveryAssignmentWhatsAppUrl({
      orderId,
      deliveryPartnerId: partnerId,
      deliveryNotes,
      estimatedDeliveryAt
    });
    if (waLinkRes && waLinkRes.available) {
      whatsappInfo = { available: true, url: waLinkRes.url, phone: waLinkRes.phone, message: waLinkRes.message };
    }
  } catch (waErr) {
    console.warn('[WHATSAPP_LINK_GEN_NOTICE]', waErr.message);
  }

  return {
    success: true,
    assignment: assignmentRecord,
    message: 'Delivery partner assigned successfully',
    whatsapp: whatsappInfo,
    whatsappUrl: whatsappInfo.url || null,
    whatsappMessage: whatsappInfo.message || null
  };
};

/**
 * 7. Admin: Reassign Delivery Partner
 */
const reassignDeliveryPartner = async (adminId, orderId, newPartnerId, req = null) => {
  let updatedAssignment = null;

  if (supabase) {
    const { data: existing } = await supabase.from('delivery_assignments')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existing) {
      if (['OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP'].includes(existing.status)) {
        throw new AppError('Cannot reassign order that is already picked up or delivered', HTTP_STATUS.BAD_REQUEST);
      }

      let validAdminId = null;
      if (adminId && isUUID(adminId)) {
        const { data: adminUser } = await supabase.from('users').select('id').eq('id', adminId).maybeSingle();
        if (adminUser) validAdminId = adminUser.id;
      }

      const { data: updated, error } = await supabase.from('delivery_assignments')
        .update({
          delivery_partner_id: newPartnerId,
          assigned_by: validAdminId,
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

      updatedAssignment = updated;

      const payload = {
        eventType: EVENT_TYPES.DELIVERY_REASSIGNED,
        orderId: existing.order_id,
        deliveryPartnerId: newPartnerId,
        deliveryStatus: 'ASSIGNED',
        updatedAt: new Date().toISOString()
      };

      await logAdminActivity(adminId, 'ADMIN_DELIVERY_REASSIGNED', 'order', orderId, { newPartnerId }, req);
      sseManager.broadcastDeliveryUpdate(payload);
    }
  } else {
    const foundMock = mockDeliveryAssignments.find(a => String(a.order_id) === String(orderId));
    if (!foundMock) throw new AppError('No active delivery assignment found for this order', HTTP_STATUS.NOT_FOUND);

    if (['OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP'].includes(foundMock.status)) {
      throw new AppError('Cannot reassign order that is already picked up or delivered', HTTP_STATUS.BAD_REQUEST);
    }

    foundMock.delivery_partner_id = newPartnerId;
    foundMock.status = 'ASSIGNED';
    updatedAssignment = foundMock;

    const payload = {
      eventType: EVENT_TYPES.DELIVERY_REASSIGNED,
      orderId,
      deliveryPartnerId: newPartnerId,
      deliveryStatus: 'ASSIGNED',
      updatedAt: new Date().toISOString()
    };

    sseManager.broadcastDeliveryUpdate(payload);
  }

  // Generate WhatsApp Click-to-Chat link ONLY for new partner
  let whatsappInfo = { available: false, url: null, message: null };
  try {
    const waLinkRes = await whatsappService.generateDeliveryAssignmentWhatsAppUrl({
      orderId,
      deliveryPartnerId: newPartnerId
    });
    if (waLinkRes && waLinkRes.available) {
      whatsappInfo = { available: true, url: waLinkRes.url, phone: waLinkRes.phone, message: waLinkRes.message };
    }
  } catch (waErr) {
    console.warn('[WHATSAPP_LINK_REASSIGN_NOTICE]', waErr.message);
  }

  return {
    success: true,
    assignment: updatedAssignment,
    message: 'Delivery partner reassigned successfully',
    whatsapp: whatsappInfo,
    whatsappUrl: whatsappInfo.url || null,
    whatsappMessage: whatsappInfo.message || null
  };
};

/**
 * 8. Delivery Partner: Dashboard Overview Stats
 */
const ALLOWED_FAILURE_REASONS = [
  'CUSTOMER_UNAVAILABLE',
  'WRONG_ADDRESS',
  'CUSTOMER_REFUSED',
  'UNABLE_TO_CONTACT',
  'ADDRESS_NOT_ACCESSIBLE',
  'OTHER'
];

const getPartnerDashboard = async (partnerId) => {
  let list = [];
  const today = new Date().toISOString().split('T')[0];

  if (supabase) {
    const { data: assignments } = await supabase.from('delivery_assignments')
      .select('*, orders(*, order_items(*), order_addresses(*), users!orders_user_id_fkey(id, full_name, phone, email))')
      .eq('delivery_partner_id', partnerId)
      .order('updated_at', { ascending: false });

    list = assignments || [];
  } else {
    list = mockDeliveryAssignments.filter(a => String(a.delivery_partner_id) === String(partnerId));
  }

  const assignedCount = list.filter(a => a.status === 'ASSIGNED').length;
  const acceptedCount = list.filter(a => a.status === 'ACCEPTED').length;
  const outForDeliveryCount = list.filter(a => ['OUT_FOR_DELIVERY', 'PICKED_UP'].includes(a.status)).length;

  const codPendingCount = list.filter(a => {
    const isFinished = ['DELIVERED', 'FAILED', 'FAILED_DELIVERY', 'CANCELLED'].includes(a.status);
    const isCod = String(a.orders?.payment_method || a.payment_method || '').toUpperCase() === 'COD';
    const isCollected = a.cod_collected === true;
    return !isFinished && isCod && !isCollected;
  }).length;

  const failedCount = list.filter(a => ['FAILED', 'FAILED_DELIVERY'].includes(a.status)).length;
  const deliveredTodayCount = list.filter(a => a.status === 'DELIVERED' && a.delivered_at && a.delivered_at.startsWith(today)).length;

  const activeDeliveriesList = list
    .filter(a => ['ASSIGNED', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'PICKED_UP'].includes(a.status))
    .map(a => {
      const rawAddr = a.orders?.order_addresses?.[0] || null;
      const deliveryAddress = parseDeliveryAddress(rawAddr) || defaultDeliveryAddress;
      const customerPhone = a.orders?.users?.phone || '9876543210';

      return {
        assignmentId: a.id,
        orderId: a.orders?.id || a.order_id,
        orderNumber: a.orders?.order_number || `CKS-DEL-${a.order_id}`,
        orderStatus: a.orders?.status || 'PROCESSING',
        deliveryStatus: a.status,
        customerName: a.orders?.users?.full_name || 'Customer',
        customerPhone,
        callUrl: generateCallUrl(customerPhone),
        googleMapsUrl: generateGoogleMapsUrl(deliveryAddress),
        deliveryAddress,
        itemCount: a.orders?.order_items?.length || 0,
        items: (a.orders?.order_items || []).map(i => ({ name: i.product_name, quantity: i.quantity, price: parseFloat(i.unit_price) })),
        subtotal: parseFloat(a.orders?.subtotal || 0),
        totalAmount: parseFloat(a.orders?.total_amount || 0),
        paymentMethod: String(a.orders?.payment_method || 'RAZORPAY').toUpperCase(),
        paymentStatus: a.orders?.payment_status || 'PAID',
        deliveryInstructions: a.delivery_notes || a.notes || null,
        estimatedDeliveryAt: a.estimated_delivery_at,
        assignedAt: a.assigned_at
      };
    });

  return {
    success: true,
    summary: {
      assigned: assignedCount,
      accepted: acceptedCount,
      outForDelivery: outForDeliveryCount,
      codPending: codPendingCount,
      failed: failedCount,
      deliveredToday: deliveredTodayCount
    },
    activeDeliveries: activeDeliveriesList
  };
};

/**
 * 9. Delivery Partner: Get Assigned Orders (Strict Ownership Isolation)
 */
const getPartnerOrders = async (partnerId, queryParams = {}) => {
  if (supabase) {
    const { data: assignments, error } = await supabase.from('delivery_assignments')
      .select('*, orders(*, order_items(*), order_addresses(*), users!orders_user_id_fkey(id, full_name, phone, email))')
      .eq('delivery_partner_id', partnerId)
      .order('updated_at', { ascending: false });

    if (!error && assignments) {
      return assignments.map(a => {
        const rawAddr = a.orders?.order_addresses?.[0] || null;
        const deliveryAddress = parseDeliveryAddress(rawAddr) || defaultDeliveryAddress;
        const customerPhone = a.orders?.users?.phone || '9876543210';

        return {
          assignmentId: a.id,
          orderId: a.orders?.id || a.order_id,
          orderNumber: a.orders?.order_number || `CKS-DEL-${a.order_id}`,
          orderStatus: a.orders?.status || 'PROCESSING',
          deliveryStatus: a.status,
          customer: {
            id: a.orders?.users?.id,
            name: a.orders?.users?.full_name || 'Customer',
            phone: customerPhone,
            email: a.orders?.users?.email || 'customer@example.com'
          },
          customerName: a.orders?.users?.full_name || 'Customer',
          customerPhone,
          customerEmail: a.orders?.users?.email || '',
          callUrl: generateCallUrl(customerPhone),
          googleMapsUrl: generateGoogleMapsUrl(deliveryAddress),
          deliveryAddress,
          address: rawAddr,
          itemCount: a.orders?.order_items?.length || 0,
          items: (a.orders?.order_items || []).map(i => ({ name: i.product_name, quantity: i.quantity, price: parseFloat(i.unit_price) })),
          subtotal: parseFloat(a.orders?.subtotal || 0),
          totalAmount: parseFloat(a.orders?.total_amount || 0),
          paymentMethod: String(a.orders?.payment_method || 'RAZORPAY').toUpperCase(),
          paymentStatus: a.orders?.payment_status || 'PAID',
          estimatedDeliveryAt: a.estimated_delivery_at,
          assignedAt: a.assigned_at,
          acceptedAt: a.accepted_at,
          pickedUpAt: a.picked_up_at,
          deliveredAt: a.delivered_at,
          failedAt: a.failed_at,
          failureReason: a.failure_reason
        };
      });
    }
  }

  return mockDeliveryAssignments
    .filter(a => String(a.delivery_partner_id) === String(partnerId))
    .map(a => ({
      assignmentId: a.id,
      orderId: a.order_id,
      orderNumber: `CKS-DEL-${a.order_id}`,
      orderStatus: a.status === 'DELIVERED' ? 'DELIVERED' : a.status === 'PICKED_UP' || a.status === 'OUT_FOR_DELIVERY' ? 'OUT_FOR_DELIVERY' : 'READY_FOR_DELIVERY',
      deliveryStatus: a.status,
      customer: { name: 'Valued Customer', phone: '9876543210', email: 'customer@example.com' },
      customerName: 'Valued Customer',
      customerPhone: '9876543210',
      callUrl: 'tel:+919876543210',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Mahruni',
      deliveryAddress: defaultDeliveryAddress,
      items: [{ name: 'Grocery Item', quantity: 2, price: 250 }],
      totalAmount: 500,
      paymentStatus: 'PAID',
      estimatedDeliveryAt: a.estimated_delivery_at,
      assignedAt: a.assigned_at
    }));
};

/**
 * 10. Delivery Partner: Get Specific Order Details (Strict Ownership Isolation: 403 Forbidden)
 */
const getPartnerOrderById = async (partnerId, orderId) => {
  let assignment = null;

  if (supabase) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(orderId));
    let query = supabase.from('delivery_assignments')
      .select('*, orders(*, order_items(*), order_addresses(*), users!orders_user_id_fkey(id, full_name, phone, email))');

    if (isUuid) {
      query = query.eq('order_id', orderId);
    } else {
      query = query.eq('orders.order_number', orderId);
    }

    const { data, error } = await query.maybeSingle();
    if (!error && data) assignment = data;
  }

  if (!assignment) {
    const foundMock = mockDeliveryAssignments.find(a => String(a.order_id) === String(orderId));
    if (foundMock) assignment = foundMock;
  }

  if (!assignment) {
    throw new AppError('Assigned delivery order not found', HTTP_STATUS.NOT_FOUND);
  }

  if (String(assignment.delivery_partner_id) !== String(partnerId)) {
    throw new AppError('Forbidden: You are not authorized to view this delivery assignment', HTTP_STATUS.FORBIDDEN);
  }

  const rawAddr = assignment.orders?.order_addresses?.[0] || null;
  const deliveryAddress = parseDeliveryAddress(rawAddr) || defaultDeliveryAddress;
  const customerPhone = assignment.orders?.users?.phone || '9876543210';

  return {
    assignmentId: assignment.id,
    orderId: assignment.orders?.id || assignment.order_id,
    orderNumber: assignment.orders?.order_number || `CKS-DEL-${assignment.order_id}`,
    orderStatus: assignment.orders?.status || 'PROCESSING',
    deliveryStatus: assignment.status,
    customer: {
      id: assignment.orders?.users?.id,
      name: assignment.orders?.users?.full_name || 'Customer',
      phone: customerPhone,
      email: assignment.orders?.users?.email || 'customer@example.com'
    },
    customerName: assignment.orders?.users?.full_name || 'Customer',
    customerPhone,
    customerEmail: assignment.orders?.users?.email || '',
    callUrl: generateCallUrl(customerPhone),
    googleMapsUrl: generateGoogleMapsUrl(deliveryAddress),
    deliveryAddress,
    address: rawAddr,
    items: (assignment.orders?.order_items || []).map(i => ({ name: i.product_name, quantity: i.quantity, price: parseFloat(i.unit_price) })),
    subtotal: parseFloat(assignment.orders?.subtotal || 0),
    totalAmount: parseFloat(assignment.orders?.total_amount || 0),
    paymentStatus: assignment.orders?.payment_status || 'PAID',
    paymentMethod: String(assignment.orders?.payment_method || 'RAZORPAY').toUpperCase(),
    deliveryInstructions: assignment.delivery_notes || assignment.notes || null,
    estimatedDeliveryAt: assignment.estimated_delivery_at,
    assignedAt: assignment.assigned_at,
    acceptedAt: assignment.accepted_at,
    pickedUpAt: assignment.picked_up_at,
    deliveredAt: assignment.delivered_at,
    failedAt: assignment.failed_at,
    failureReason: assignment.failure_reason
  };
};

/**
 * 11. Delivery Partner: Accept Assigned Delivery
 */
const acceptDelivery = async (partnerId, orderId) => {
  let existing = null;

  if (supabase) {
    const { data } = await supabase.from('delivery_assignments')
      .select('*, orders(user_id, order_number)')
      .eq('order_id', orderId)
      .maybeSingle();

    if (data) existing = data;
  }

  if (!existing) {
    existing = mockDeliveryAssignments.find(a => String(a.order_id) === String(orderId));
  }

  if (!existing) {
    throw new AppError('Assigned delivery order not found', HTTP_STATUS.NOT_FOUND);
  }

  if (String(existing.delivery_partner_id) !== String(partnerId)) {
    throw new AppError('Forbidden: You are not authorized to accept this delivery assignment', HTTP_STATUS.FORBIDDEN);
  }

  if (existing.status !== 'ASSIGNED') {
    throw new AppError('This delivery assignment has already been accepted or modified.', HTTP_STATUS.CONFLICT);
  }

  const nowIso = new Date().toISOString();

  if (supabase) {
    await supabase.from('delivery_assignments')
      .update({
        status: 'ACCEPTED',
        accepted_at: nowIso,
        updated_at: nowIso
      })
      .eq('id', existing.id);
  }

  existing.status = 'ACCEPTED';
  existing.accepted_at = nowIso;

  const payload = {
    eventType: EVENT_TYPES.DELIVERY_ACCEPTED,
    orderId,
    orderNumber: existing.orders?.order_number,
    deliveryPartnerId: partnerId,
    customerId: existing.orders?.user_id,
    deliveryStatus: 'ACCEPTED',
    updatedAt: nowIso
  };

  eventBus.emit(EVENT_TYPES.DELIVERY_ACCEPTED, payload);
  sseManager.broadcastDeliveryUpdate(payload);

  await orderTrackingService.recordStatusChange({
    orderId,
    previousStatus: 'PROCESSING',
    newStatus: 'PROCESSING',
    changedBy: partnerId,
    changedByRole: 'DELIVERY_PARTNER',
    reason: 'Delivery partner accepted assignment',
    metadata: { eventType: 'DELIVERY_ACCEPTED', deliveryPartnerId: partnerId, assignmentStatus: 'ACCEPTED' }
  });

  return { success: true, message: 'Delivery assignment accepted successfully!' };
};

/**
 * 12. Delivery Partner: Start Delivery (ACCEPTED -> OUT_FOR_DELIVERY)
 */
const startDelivery = async (partnerId, orderId) => {
  let existing = null;

  if (supabase) {
    const { data } = await supabase.from('delivery_assignments')
      .select('*, orders(id, user_id, order_number, status)')
      .eq('order_id', orderId)
      .maybeSingle();

    if (data) existing = data;
  }

  if (!existing) {
    existing = mockDeliveryAssignments.find(a => String(a.order_id) === String(orderId));
  }

  if (!existing) {
    throw new AppError('Assigned delivery order not found', HTTP_STATUS.NOT_FOUND);
  }

  if (String(existing.delivery_partner_id) !== String(partnerId)) {
    throw new AppError('Forbidden: You are not authorized to start this delivery', HTTP_STATUS.FORBIDDEN);
  }

  if (!['ACCEPTED', 'ASSIGNED'].includes(existing.status)) {
    throw new AppError('This delivery cannot be started because its status is not ACCEPTED.', HTTP_STATUS.CONFLICT);
  }

  const nowIso = new Date().toISOString();

  if (supabase) {
    await supabase.from('delivery_assignments')
      .update({
        status: 'OUT_FOR_DELIVERY',
        out_for_delivery_at: nowIso,
        picked_up_at: nowIso,
        updated_at: nowIso
      })
      .eq('id', existing.id);

    await supabase.from('orders')
      .update({ status: ORDER_STATUS.OUT_FOR_DELIVERY, updated_at: nowIso })
      .eq('id', orderId);
  }

  existing.status = 'OUT_FOR_DELIVERY';
  existing.out_for_delivery_at = nowIso;
  existing.picked_up_at = nowIso;

  const payload = {
    eventType: EVENT_TYPES.ORDER_PICKED_UP,
    orderId,
    orderNumber: existing.orders?.order_number,
    deliveryPartnerId: partnerId,
    customerId: existing.orders?.user_id,
    deliveryStatus: 'OUT_FOR_DELIVERY',
    orderStatus: ORDER_STATUS.OUT_FOR_DELIVERY,
    updatedAt: nowIso
  };

  eventBus.emit(EVENT_TYPES.ORDER_PICKED_UP, payload);
  sseManager.broadcastDeliveryUpdate(payload);

  await orderTrackingService.recordStatusChange({
    orderId,
    previousStatus: ORDER_STATUS.PROCESSING,
    newStatus: ORDER_STATUS.OUT_FOR_DELIVERY,
    changedBy: partnerId,
    changedByRole: 'DELIVERY_PARTNER',
    reason: 'Order is out for delivery',
    metadata: { eventType: 'OUT_FOR_DELIVERY', deliveryPartnerId: partnerId, assignmentStatus: 'OUT_FOR_DELIVERY' }
  });

  return { success: true, message: 'Delivery started! Order is now Out For Delivery.' };
};

const pickupDelivery = startDelivery;

/**
 * 13. Delivery Partner: Mark Order Delivered (OUT_FOR_DELIVERY -> DELIVERED)
 */
const inventoryService = require('./inventory.service');

const completeDelivery = async (partnerId, orderId, { codCollected = false, collectedAmount = 0 } = {}) => {
  let existing = null;

  if (supabase) {
    const { data } = await supabase.from('delivery_assignments')
      .select('*, orders(id, user_id, order_number, status, total_amount, payment_method, payment_status)')
      .eq('order_id', orderId)
      .maybeSingle();

    if (data) existing = data;
  }

  if (!existing) {
    existing = mockDeliveryAssignments.find(a => String(a.order_id) === String(orderId));
  }

  if (!existing) {
    throw new AppError('Assigned delivery order not found', HTTP_STATUS.NOT_FOUND);
  }

  if (String(existing.delivery_partner_id) !== String(partnerId)) {
    throw new AppError('Forbidden: You are not authorized to complete this delivery', HTTP_STATUS.FORBIDDEN);
  }

  if (existing.status === 'DELIVERED') {
    throw new AppError('This order has already been marked as delivered', HTTP_STATUS.CONFLICT);
  }

  if (!['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(existing.status)) {
    throw new AppError('Cannot mark order as delivered before starting delivery', HTTP_STATUS.CONFLICT);
  }

  const orderTotal = parseFloat(existing.orders?.total_amount || existing.totalAmount || 500);
  const paymentMethod = String(existing.orders?.payment_method || existing.paymentMethod || 'RAZORPAY').toUpperCase();
  const paymentStatus = existing.orders?.payment_status || existing.paymentStatus || 'PENDING';

  if (paymentMethod !== 'COD') {
    if (paymentStatus !== 'PAID') {
      throw new AppError('Cannot complete delivery for unpaid prepaid order', HTTP_STATUS.BAD_REQUEST);
    }
  } else {
    if (!codCollected) {
      throw new AppError('COD collection confirmation is required to complete COD delivery', HTTP_STATUS.BAD_REQUEST);
    }
    const numCollected = Number(collectedAmount);
    if (isNaN(numCollected) || Math.abs(numCollected - orderTotal) >= 0.01) {
      throw new AppError(`Collected cash amount (₹${numCollected}) must equal total order amount (₹${orderTotal})`, HTTP_STATUS.BAD_REQUEST);
    }
  }

  const nowIso = new Date().toISOString();

  if (supabase) {
    const updatePayload = {
      status: 'DELIVERED',
      delivered_at: nowIso,
      updated_at: nowIso
    };

    if (paymentMethod === 'COD') {
      updatePayload.cod_collected = true;
      updatePayload.cod_collected_amount = Number(collectedAmount);
      updatePayload.cod_collected_at = nowIso;
    }

    await supabase.from('delivery_assignments')
      .update(updatePayload)
      .eq('id', existing.id);

    await supabase.from('orders')
      .update({ status: ORDER_STATUS.DELIVERED, updated_at: nowIso })
      .eq('id', orderId);

    await inventoryService.consumeStock(null, orderId);
  }

  existing.status = 'DELIVERED';
  existing.delivered_at = nowIso;
  if (paymentMethod === 'COD') {
    existing.cod_collected = true;
    existing.cod_collected_amount = Number(collectedAmount);
    existing.cod_collected_at = nowIso;
  }

  const payload = {
    eventType: EVENT_TYPES.ORDER_DELIVERED,
    orderId,
    orderNumber: existing.orders?.order_number,
    deliveryPartnerId: partnerId,
    customerId: existing.orders?.user_id,
    deliveryStatus: 'DELIVERED',
    orderStatus: ORDER_STATUS.DELIVERED,
    updatedAt: nowIso
  };

  eventBus.emit(EVENT_TYPES.ORDER_DELIVERED, payload);
  sseManager.broadcastDeliveryUpdate(payload);

  await orderTrackingService.recordStatusChange({
    orderId,
    previousStatus: ORDER_STATUS.OUT_FOR_DELIVERY,
    newStatus: ORDER_STATUS.DELIVERED,
    changedBy: partnerId,
    changedByRole: 'DELIVERY_PARTNER',
    reason: 'Order delivered successfully to customer',
    metadata: { eventType: 'DELIVERED', deliveryPartnerId: partnerId, assignmentStatus: 'DELIVERED' }
  });

  return { success: true, message: 'Order delivered successfully! 🎉' };
};

const deliverOrder = completeDelivery;

/**
 * 14. Delivery Partner: Mark Delivery Failed
 */
const failDelivery = async (partnerId, orderId, failureReason, notes = null) => {
  if (!failureReason || !String(failureReason).trim()) {
    throw new AppError('Failure reason is required when marking a delivery as failed.', HTTP_STATUS.BAD_REQUEST);
  }

  const cleanReason = String(failureReason).trim().toUpperCase();
  if (!ALLOWED_FAILURE_REASONS.includes(cleanReason)) {
    throw new AppError(`Invalid failure reason. Must be one of: ${ALLOWED_FAILURE_REASONS.join(', ')}`, HTTP_STATUS.BAD_REQUEST);
  }

  let existing = null;

  if (supabase) {
    const { data } = await supabase.from('delivery_assignments')
      .select('*, orders(id, user_id, order_number, status)')
      .eq('order_id', orderId)
      .maybeSingle();

    if (data) existing = data;
  }

  if (!existing) {
    existing = mockDeliveryAssignments.find(a => String(a.order_id) === String(orderId));
  }

  if (!existing) {
    throw new AppError('Assigned delivery order not found', HTTP_STATUS.NOT_FOUND);
  }

  if (String(existing.delivery_partner_id) !== String(partnerId)) {
    throw new AppError('Forbidden: You are not authorized to report failure for this delivery', HTTP_STATUS.FORBIDDEN);
  }

  if (['DELIVERED', 'FAILED', 'FAILED_DELIVERY'].includes(existing.status)) {
    throw new AppError('Cannot fail a delivery that is already finished or delivered.', HTTP_STATUS.CONFLICT);
  }

  const nowIso = new Date().toISOString();

  if (supabase) {
    await supabase.from('delivery_assignments')
      .update({
        status: 'FAILED',
        failure_reason: cleanReason,
        failure_notes: notes || null,
        failed_at: nowIso,
        updated_at: nowIso
      })
      .eq('id', existing.id);
  }

  existing.status = 'FAILED';
  existing.failure_reason = cleanReason;
  existing.failure_notes = notes || null;
  existing.failed_at = nowIso;

  const payload = {
    eventType: EVENT_TYPES.DELIVERY_FAILED,
    orderId,
    orderNumber: existing.orders?.order_number,
    deliveryPartnerId: partnerId,
    customerId: existing.orders?.user_id,
    deliveryStatus: 'FAILED',
    failureReason: cleanReason,
    updatedAt: nowIso
  };

  eventBus.emit(EVENT_TYPES.DELIVERY_FAILED, payload);
  sseManager.broadcastDeliveryUpdate(payload);

  await orderTrackingService.recordStatusChange({
    orderId,
    previousStatus: existing.orders?.status || ORDER_STATUS.OUT_FOR_DELIVERY,
    newStatus: existing.orders?.status || ORDER_STATUS.OUT_FOR_DELIVERY,
    changedBy: partnerId,
    changedByRole: 'DELIVERY_PARTNER',
    reason: cleanReason,
    metadata: { eventType: 'FAILED_DELIVERY', deliveryPartnerId: partnerId, assignmentStatus: 'FAILED' }
  });

  return { success: true, message: 'Delivery attempt recorded as failed. Admin notified.' };
};

module.exports = {
  DELIVERY_ELIGIBLE_ORDER_STATUSES,
  ACTIVE_DELIVERY_ASSIGNMENT_STATUSES,
  isOrderReadyForDelivery,
  hasActiveDeliveryAssignment,
  getDeliveryPartners,
  createDeliveryPartner,
  getAdminDeliveryDashboard,
  getUnassignedOrders,
  getAssignedDeliveries,
  assignDeliveryPartner,
  reassignDeliveryPartner,
  getPartnerDashboard,
  getPartnerOrders,
  getPartnerOrderById,
  acceptDelivery,
  pickupDelivery,
  startDelivery,
  deliverOrder,
  completeDelivery,
  failDelivery
};
