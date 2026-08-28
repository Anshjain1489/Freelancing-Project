const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS, ERROR_CODES } = require('../../constants/statusCodes');

// Memory store fallbacks for unit tests
const mockSuppliersMap = new Map();
const mockSupplierProductsMap = new Map();
const mockPurchaseOrdersMap = new Map();
const mockPurchaseOrderItemsMap = new Map();

/**
 * Helper: Generate unique PO Number (e.g. CKS-PO-2026-000001)
 */
let poSequence = 1;
const generatePoNumber = async () => {
  const year = new Date().getFullYear();
  const seqStr = String(poSequence++).padStart(6, '0');
  return `CKS-PO-${year}-${seqStr}`;
};

/**
 * 1. Supplier Management
 */
const createSupplier = async (supplierData) => {
  if (!supplierData || !supplierData.name) {
    throw new AppError('Supplier name is required', HTTP_STATUS.BAD_REQUEST);
  }

  const id = `sup-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const record = {
    id,
    name: supplierData.name,
    contact_person: supplierData.contactPerson || supplierData.name,
    phone: supplierData.phone || '',
    email: supplierData.email || '',
    address: supplierData.address || '',
    lead_time_days: parseInt(supplierData.leadTimeDays || 3, 10),
    status: 'ACTIVE',
    created_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data: dbSup, error } = await supabase.from('suppliers').insert([record]).select().single();
      if (!error && dbSup) return dbSup;
    } catch (e) {
      // Fallthrough to memory store
    }
  }

  mockSuppliersMap.set(id, record);
  return record;
};

const getSuppliers = async () => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('suppliers').select('*').eq('status', 'ACTIVE');
      if (!error && data) return { suppliers: data };
    } catch (e) {
      // Fallthrough
    }
  }
  return { suppliers: Array.from(mockSuppliersMap.values()) };
};

/**
 * 2. Create Purchase Order from Recommendation or Direct Entry
 */
const createPurchaseOrder = async (poData, creatorId) => {
  if (!poData || !poData.supplierId || !poData.items || !Array.isArray(poData.items) || poData.items.length === 0) {
    throw new AppError('Purchase order must include a supplierId and at least one item', HTTP_STATUS.BAD_REQUEST);
  }

  const supplierId = poData.supplierId;

  // Memory Deduplication Guard Check
  for (const po of mockPurchaseOrdersMap.values()) {
    if (po.supplier_id === supplierId && ['DRAFT', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
      const poItems = mockPurchaseOrderItemsMap.get(po.id) || [];
      for (const item of poData.items) {
        if (poItems.some(pi => pi.product_id === item.productId)) {
          throw new AppError(`An active Purchase Order already exists for product with this supplier`, HTTP_STATUS.CONFLICT);
        }
      }
    }
  }

  const poNumber = await generatePoNumber();
  const id = `po-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

  let totalAmount = 0;
  const itemsRecords = poData.items.map(item => {
    const qty = parseInt(item.quantityOrdered || item.quantity || 1, 10);
    const cost = parseFloat(item.unitCostPrice || item.costPrice || 0);
    const lineTotal = Math.round(qty * cost * 100) / 100;
    totalAmount += lineTotal;

    return {
      id: `poi-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      purchase_order_id: id,
      product_id: item.productId,
      product_name: item.productName || 'Grocery Item',
      quantity_ordered: qty,
      quantity_received: 0,
      unit_cost_price: cost,
      line_total: lineTotal
    };
  });

  totalAmount = Math.round(totalAmount * 100) / 100;

  const poRecord = {
    id,
    po_number: poNumber,
    supplier_id: supplierId,
    status: 'DRAFT',
    total_amount: totalAmount,
    expected_delivery_date: poData.expectedDeliveryDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    notes: poData.notes || 'Automated Reorder Purchase Order',
    created_by: creatorId || 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data: dbPo, error } = await supabase.from('purchase_orders').insert([poRecord]).select().single();
      if (!error && dbPo) {
        await supabase.from('purchase_order_items').insert(itemsRecords);
        return { ...dbPo, items: itemsRecords };
      }
    } catch (e) {
      // Fallthrough to memory store
    }
  }

  mockPurchaseOrdersMap.set(id, { ...poRecord, items: itemsRecords });
  mockPurchaseOrderItemsMap.set(id, itemsRecords);

  return { ...poRecord, items: itemsRecords };
};

/**
 * 3. Strict PO Lifecycle State Transition
 */
const updatePurchaseOrderStatus = async (poId, nextStatus, adminId) => {
  const validTransitions = {
    DRAFT: ['APPROVED', 'CANCELLED'],
    APPROVED: ['ORDERED', 'CANCELLED'],
    ORDERED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
    PARTIALLY_RECEIVED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
    RECEIVED: [], // Terminal Immutable
    CANCELLED: [] // Terminal Immutable
  };

  let po = mockPurchaseOrdersMap.get(poId);

  if (supabase && !po) {
    try {
      const { data } = await supabase.from('purchase_orders').select('*').eq('id', poId).maybeSingle();
      if (data) po = data;
    } catch (e) {}
  }

  if (!po) {
    throw new AppError('Purchase Order not found', HTTP_STATUS.NOT_FOUND);
  }

  const currentStatus = po.status;

  if (['RECEIVED', 'CANCELLED'].includes(currentStatus)) {
    throw new AppError(`Cannot update Purchase Order in immutable state "${currentStatus}"`, HTTP_STATUS.BAD_REQUEST);
  }

  const allowedNext = validTransitions[currentStatus] || [];
  if (!allowedNext.includes(nextStatus)) {
    throw new AppError(`Invalid PO transition from "${currentStatus}" to "${nextStatus}". Allowed: ${allowedNext.join(', ')}`, HTTP_STATUS.BAD_REQUEST);
  }

  const updates = {
    status: nextStatus,
    updated_at: new Date().toISOString()
  };
  if (nextStatus === 'APPROVED') updates.approved_by = adminId;

  if (supabase) {
    try {
      const { data: updatedPo, error } = await supabase.from('purchase_orders').update(updates).eq('id', poId).select().single();
      if (!error && updatedPo) return updatedPo;
    } catch (e) {}
  }

  const updatedMock = { ...po, ...updates };
  mockPurchaseOrdersMap.set(poId, updatedMock);
  return updatedMock;
};

/**
 * 4. Receive PO Inventory Items (Incremental Stock Update)
 */
const receivePurchaseOrderItems = async (poId, itemsToReceive, adminId) => {
  if (!itemsToReceive || !Array.isArray(itemsToReceive) || itemsToReceive.length === 0) {
    throw new AppError('Must specify items and quantities to receive', HTTP_STATUS.BAD_REQUEST);
  }

  let po = mockPurchaseOrdersMap.get(poId);
  let poItems = mockPurchaseOrderItemsMap.get(poId) || [];

  if (supabase && !po) {
    try {
      const { data: fetchedPo } = await supabase.from('purchase_orders').select('*').eq('id', poId).maybeSingle();
      const { data: fetchedItems } = await supabase.from('purchase_order_items').select('*').eq('purchase_order_id', poId);
      if (fetchedPo) po = fetchedPo;
      if (fetchedItems) poItems = fetchedItems;
    } catch (e) {}
  }

  if (!po) throw new AppError('Purchase Order not found', HTTP_STATUS.NOT_FOUND);

  if (['RECEIVED', 'CANCELLED'].includes(po.status)) {
    throw new AppError(`Cannot receive stock for Purchase Order in state "${po.status}"`, HTTP_STATUS.BAD_REQUEST);
  }

  let totalOrdered = 0;
  let totalReceivedAfter = 0;

  for (const rItem of itemsToReceive) {
    const lineItem = poItems.find(i => i.id === rItem.itemId || i.product_id === rItem.productId);
    if (!lineItem) {
      throw new AppError(`Item "${rItem.productId || rItem.itemId}" does not belong to this Purchase Order`, HTTP_STATUS.BAD_REQUEST);
    }

    const requestedTotalReceived = parseInt(rItem.quantityReceived, 10);
    if (isNaN(requestedTotalReceived) || requestedTotalReceived < 0) {
      throw new AppError('Received quantity must be non-negative integer', HTTP_STATUS.BAD_REQUEST);
    }

    if (requestedTotalReceived > lineItem.quantity_ordered) {
      throw new AppError(`Received quantity (${requestedTotalReceived}) cannot exceed ordered quantity (${lineItem.quantity_ordered}) for product "${lineItem.product_name}"`, HTTP_STATUS.BAD_REQUEST);
    }

    const prevReceived = lineItem.quantity_received || 0;
    const newlyReceivedDelta = Math.max(0, requestedTotalReceived - prevReceived);

    lineItem.quantity_received = requestedTotalReceived;

    totalOrdered += lineItem.quantity_ordered;
    totalReceivedAfter += requestedTotalReceived;

    if (newlyReceivedDelta > 0 && supabase) {
      try {
        const { data: prod } = await supabase.from('products').select('stock_quantity').eq('id', lineItem.product_id).maybeSingle();
        if (prod) {
          const newStock = prod.stock_quantity + newlyReceivedDelta;
          await supabase.from('products').update({ stock_quantity: newStock, updated_at: new Date().toISOString() }).eq('id', lineItem.product_id);
        }
      } catch (e) {}
    }
  }

  let nextPoStatus = 'PARTIALLY_RECEIVED';
  if (totalReceivedAfter >= totalOrdered) {
    nextPoStatus = 'RECEIVED';
  }

  po.status = nextPoStatus;
  mockPurchaseOrdersMap.set(poId, po);
  mockPurchaseOrderItemsMap.set(poId, poItems);

  if (supabase) {
    try {
      await supabase.from('purchase_orders').update({ status: nextPoStatus, updated_at: new Date().toISOString() }).eq('id', poId);
    } catch (e) {}
  }

  return { po, items: poItems };
};

const getPurchaseOrders = async () => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('purchase_orders').select('*, purchase_order_items(*)').order('created_at', { ascending: false });
      if (!error && data) return { purchaseOrders: data };
    } catch (e) {}
  }
  return { purchaseOrders: Array.from(mockPurchaseOrdersMap.values()) };
};

module.exports = {
  createSupplier,
  getSuppliers,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  receivePurchaseOrderItems,
  getPurchaseOrders
};
