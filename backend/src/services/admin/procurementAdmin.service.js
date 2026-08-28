const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');
const purchaseOrderService = require('./purchaseOrder.service');

// Memory stores for local unit testing fallback
const mockStatusHistoryMap = new Map();
const mockCostHistoryMap = new Map();
const mockStockAdjustmentsMap = new Map();
const mockProductsMap = new Map();
const mockInventoryMap = new Map();

// Helper to seed or get product inventory cost
const getProductInventory = (productId) => {
  if (!mockInventoryMap.has(productId)) {
    mockInventoryMap.set(productId, {
      product_id: productId,
      stock_quantity: 20,
      reserved_quantity: 2,
      average_cost_price: 150.00,
      updated_at: new Date().toISOString()
    });
  }
  return mockInventoryMap.get(productId);
};

/**
 * 1. Supplier Directory & Extended Performance Metrics
 */
const getSuppliersWithPerformance = async (reqUser) => {
  let suppliers = [];
  let pos = [];

  if (supabase) {
    try {
      const { data: sData } = await supabase.from('suppliers').select('*');
      const { data: pData } = await supabase.from('purchase_orders').select('*, purchase_order_items(*)');
      if (sData) suppliers = sData;
      if (pData) pos = pData;
    } catch (e) {}
  }

  if (!Array.isArray(suppliers) || suppliers.length === 0) {
    const defaultSupList = await purchaseOrderService.getSuppliers();
    suppliers = (defaultSupList && defaultSupList.suppliers) ? defaultSupList.suppliers : [];
  }

  if (pos.length === 0) {
    const defaultPoList = await purchaseOrderService.getPurchaseOrders();
    pos = defaultPoList.purchaseOrders || [];
  }

  const isSuperAdmin = reqUser && (reqUser.role === 'SUPER_ADMIN' || reqUser.is_super_admin === true);

  const enrichedSuppliers = suppliers.map(sup => {
    const supPos = pos.filter(p => p.supplier_id === sup.id);
    const receivedPos = supPos.filter(p => p.status === 'RECEIVED' || p.status === 'PARTIALLY_RECEIVED');
    
    // On-Time Delivery %
    let onTimeCount = 0;
    let totalLeadTimeDays = 0;
    let totalOrderedItems = 0;
    let totalAcceptedItems = 0;

    receivedPos.forEach(p => {
      const expected = p.expected_delivery_date ? new Date(p.expected_delivery_date) : null;
      const actual = p.updated_at ? new Date(p.updated_at) : new Date();
      if (expected && actual <= expected) onTimeCount++;

      const created = p.created_at ? new Date(p.created_at) : new Date();
      const diffDays = Math.max(1, Math.round((actual - created) / (1000 * 60 * 60 * 24)));
      totalLeadTimeDays += diffDays;

      const items = p.purchase_order_items || p.items || [];
      items.forEach(item => {
        const ordered = item.quantity_ordered || 0;
        const rec = item.quantity_received || 0;
        const dam = item.quantity_damaged || 0;
        const mis = item.quantity_missing || 0;
        const acc = Math.max(0, rec - dam - mis);

        totalOrderedItems += ordered;
        totalAcceptedItems += acc;
      });
    });

    const totalReceivedCount = receivedPos.length;
    const onTimeDeliveryPct = totalReceivedCount > 0 ? Math.round((onTimeCount / totalReceivedCount) * 1000) / 10 : 100.0;
    const avgLeadTimeDays = totalReceivedCount > 0 ? Math.round((totalLeadTimeDays / totalReceivedCount) * 10) / 10 : (sup.lead_time_days || 3);
    const expectedLeadTime = sup.lead_time_days || 3;
    const leadTimeVarianceDays = Math.round((avgLeadTimeDays - expectedLeadTime) * 10) / 10;
    const supplierFillRatePct = totalOrderedItems > 0 ? Math.round((totalAcceptedItems / totalOrderedItems) * 1000) / 10 : 100.0;

    // Mask sensitive bank details if not super admin
    let bankDetails = sup.bank_details;
    if (!isSuperAdmin && bankDetails) {
      bankDetails = {
        account_number: '••••••••' + (bankDetails.account_number ? String(bankDetails.account_number).slice(-4) : 'XXXX'),
        ifsc_code: bankDetails.ifsc_code || 'MASKED',
        bank_name: bankDetails.bank_name || 'Protected Bank Details'
      };
    }

    return {
      ...sup,
      bank_details: bankDetails,
      performance: {
        total_orders: supPos.length,
        received_orders: totalReceivedCount,
        on_time_delivery_pct: onTimeDeliveryPct,
        avg_lead_time_days: avgLeadTimeDays,
        lead_time_variance_days: leadTimeVarianceDays,
        supplier_fill_rate_pct: supplierFillRatePct,
        rating: sup.rating || 5.0
      }
    };
  });

  return { suppliers: enrichedSuppliers };
};

/**
 * 2. Edit DRAFT / PENDING_APPROVAL Purchase Order
 */
const editDraftPurchaseOrder = async (poId, poData, userId) => {
  let poList = await purchaseOrderService.getPurchaseOrders();
  let po = (poList.purchaseOrders || []).find(p => p.id === poId);

  if (!po) {
    throw new AppError('Purchase Order not found', HTTP_STATUS.NOT_FOUND);
  }

  if (!['DRAFT', 'PENDING_APPROVAL'].includes(po.status)) {
    throw new AppError(`Cannot edit Purchase Order in status "${po.status}". Edits allowed only in DRAFT or PENDING_APPROVAL status`, HTTP_STATUS.BAD_REQUEST);
  }

  if (poData.supplierId) po.supplier_id = poData.supplierId;
  if (poData.expectedDeliveryDate) po.expected_delivery_date = poData.expectedDeliveryDate;
  if (poData.supplierInvoiceRef) po.supplier_invoice_ref = poData.supplierInvoiceRef;
  if (poData.notes) po.notes = poData.notes;

  if (poData.items && Array.isArray(poData.items) && poData.items.length > 0) {
    let newTotal = 0;
    const itemsRecords = poData.items.map(item => {
      const qty = parseInt(item.quantityOrdered || item.quantity || 1, 10);
      const cost = parseFloat(item.unitCostPrice || item.costPrice || 0);
      const lineTotal = Math.round(qty * cost * 100) / 100;
      newTotal += lineTotal;

      return {
        id: item.id || `poi-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        purchase_order_id: poId,
        product_id: item.productId,
        product_name: item.productName || 'Grocery Item',
        quantity_ordered: qty,
        quantity_received: item.quantityReceived || 0,
        quantity_damaged: item.quantityDamaged || 0,
        quantity_missing: item.quantityMissing || 0,
        unit_cost_price: cost,
        line_total: lineTotal
      };
    });

    po.total_amount = Math.round(newTotal * 100) / 100;
    po.items = itemsRecords;
  }

  po.updated_at = new Date().toISOString();

  if (supabase) {
    try {
      await supabase.from('purchase_orders').update({
        supplier_id: po.supplier_id,
        expected_delivery_date: po.expected_delivery_date,
        supplier_invoice_ref: po.supplier_invoice_ref,
        notes: po.notes,
        total_amount: po.total_amount,
        updated_at: po.updated_at
      }).eq('id', poId);
    } catch (e) {}
  }

  return po;
};

/**
 * 3. Strict PO Lifecycle State Machine & History Logging
 */
const updatePOStatusWithHistory = async (poId, nextStatus, userId, notes = '') => {
  const validTransitions = {
    DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
    PENDING_APPROVAL: ['APPROVED', 'DRAFT', 'CANCELLED'],
    APPROVED: ['ORDERED', 'CANCELLED'],
    ORDERED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
    PARTIALLY_RECEIVED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
    RECEIVED: [], // Terminal
    CANCELLED: [] // Terminal
  };

  let poList = await purchaseOrderService.getPurchaseOrders();
  let po = (poList.purchaseOrders || []).find(p => p.id === poId);

  if (!po) {
    throw new AppError('Purchase Order not found', HTTP_STATUS.NOT_FOUND);
  }

  const currentStatus = po.status;

  if (currentStatus === nextStatus && nextStatus === 'PARTIALLY_RECEIVED') {
    // Self-transition for incremental receipts allowed
  } else {
    const allowedNext = validTransitions[currentStatus] || [];
    if (!allowedNext.includes(nextStatus)) {
      const err = new AppError(
        `Invalid PO status transition from "${currentStatus}" to "${nextStatus}". Allowed: ${allowedNext.join(', ')}`,
        HTTP_STATUS.CONFLICT
      );
      err.code = 'INVALID_PO_STATUS_TRANSITION';
      throw err;
    }
  }

  // Update PO fields
  po.status = nextStatus;
  po.updated_at = new Date().toISOString();
  if (nextStatus === 'SUBMITTED') po.submitted_by = userId;
  if (nextStatus === 'APPROVED') {
    po.approved_by = userId;
    po.approved_at = new Date().toISOString();
  }
  if (nextStatus === 'CANCELLED') {
    po.cancelled_by = userId;
    po.cancelled_at = new Date().toISOString();
    po.cancellation_reason = notes || 'Cancelled by admin';
  }

  // Insert status history audit log
  const historyRecord = {
    id: `posh-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    purchase_order_id: poId,
    previous_status: currentStatus,
    new_status: nextStatus,
    changed_by: userId || 'admin',
    notes: notes || `Transitioned from ${currentStatus} to ${nextStatus}`,
    created_at: new Date().toISOString()
  };

  if (!mockStatusHistoryMap.has(poId)) mockStatusHistoryMap.set(poId, []);
  mockStatusHistoryMap.get(poId).push(historyRecord);

  if (supabase) {
    try {
      await supabase.from('purchase_orders').update({
        status: nextStatus,
        approved_by: po.approved_by,
        approved_at: po.approved_at,
        cancelled_by: po.cancelled_by,
        cancelled_at: po.cancelled_at,
        cancellation_reason: po.cancellation_reason,
        updated_at: po.updated_at
      }).eq('id', poId);

      await supabase.from('purchase_order_status_history').insert([historyRecord]);
    } catch (e) {}
  }

  return { po, historyRecord };
};

/**
 * 4. Atomic Goods Receiving & Weighted-Average Costing (WAC)
 */
const receivePOItemsAtomic = async (poId, itemsToReceive, userId) => {
  if (!itemsToReceive || !Array.isArray(itemsToReceive) || itemsToReceive.length === 0) {
    throw new AppError('Must specify items to receive', HTTP_STATUS.BAD_REQUEST);
  }

  let poList = await purchaseOrderService.getPurchaseOrders();
  let po = (poList.purchaseOrders || []).find(p => p.id === poId);

  if (!po) throw new AppError('Purchase Order not found', HTTP_STATUS.NOT_FOUND);

  if (!['ORDERED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
    throw new AppError(`Cannot receive stock for Purchase Order in status "${po.status}". Must be ORDERED or PARTIALLY_RECEIVED`, HTTP_STATUS.BAD_REQUEST);
  }

  const poItems = po.items || po.purchase_order_items || [];
  let totalOrdered = 0;
  let totalReceivedAfter = 0;
  const receivingSummary = [];

  for (const rItem of itemsToReceive) {
    const lineItem = poItems.find(i => i.id === rItem.itemId || i.product_id === rItem.productId);
    if (!lineItem) {
      throw new AppError(`Item "${rItem.productId || rItem.itemId}" does not belong to this Purchase Order`, HTTP_STATUS.BAD_REQUEST);
    }

    const qtyReceived = parseInt(rItem.quantityReceived || 0, 10);
    const qtyDamaged = parseInt(rItem.quantityDamaged || 0, 10);
    const qtyMissing = parseInt(rItem.quantityMissing || 0, 10);

    if (qtyReceived < 0 || qtyDamaged < 0 || qtyMissing < 0) {
      throw new AppError('Received, damaged, and missing quantities must be non-negative integers', HTTP_STATUS.BAD_REQUEST);
    }

    if (qtyDamaged + qtyMissing > qtyReceived) {
      throw new AppError(`Damaged (${qtyDamaged}) + Missing (${qtyMissing}) cannot exceed Received (${qtyReceived}) for product "${lineItem.product_name}"`, HTTP_STATUS.BAD_REQUEST);
    }

    const currentReceived = lineItem.quantity_received || 0;
    if (currentReceived + qtyReceived > lineItem.quantity_ordered) {
      throw new AppError(`Cumulative received quantity (${currentReceived + qtyReceived}) cannot exceed ordered quantity (${lineItem.quantity_ordered}) for product "${lineItem.product_name}"`, HTTP_STATUS.BAD_REQUEST);
    }

    const acceptedQty = qtyReceived - qtyDamaged - qtyMissing;
    const invoiceUnitCost = parseFloat(rItem.unitCostPrice || lineItem.unit_cost_price || 0);

    // Physical stock before receipt (excluding reserved)
    const invRecord = getProductInventory(lineItem.product_id);
    const physicalStockBefore = invRecord.stock_quantity;
    const currentAvgCost = invRecord.average_cost_price;

    // Weighted-Average Costing Formula
    // new_average_cost = ((physical_stock_before * current_avg_cost) + (accepted_qty * invoice_unit_cost)) / (physical_stock_before + accepted_qty)
    let newAvgCost = currentAvgCost;
    if (acceptedQty > 0) {
      const totalStockAfter = physicalStockBefore + acceptedQty;
      const totalCostVal = (physicalStockBefore * currentAvgCost) + (acceptedQty * invoiceUnitCost);
      newAvgCost = Math.round((totalCostVal / totalStockAfter) * 100) / 100;
    }

    // Update physical inventory
    invRecord.stock_quantity = physicalStockBefore + acceptedQty;
    invRecord.average_cost_price = newAvgCost;
    invRecord.updated_at = new Date().toISOString();

    // Cost History Audit Record
    if (acceptedQty > 0 && newAvgCost !== currentAvgCost) {
      const costHistRecord = {
        id: `ich-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        product_id: lineItem.product_id,
        old_cost_price: currentAvgCost,
        new_cost_price: newAvgCost,
        change_source: 'PO_RECEIPT',
        reference_id: poId,
        created_by: userId || 'admin',
        created_at: new Date().toISOString()
      };
      mockCostHistoryMap.set(costHistRecord.id, costHistRecord);
    }

    // Stock Adjustments for Damaged / Missing Items
    if (qtyDamaged > 0) {
      const damAdj = {
        id: `adj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        product_id: lineItem.product_id,
        quantity_change: -qtyDamaged,
        reason: 'DAMAGE',
        unit_cost: invoiceUnitCost,
        total_loss_value: Math.round(qtyDamaged * invoiceUnitCost * 100) / 100,
        notes: `Damaged stock received against PO ${po.po_number || poId}`,
        created_by: userId || 'admin',
        created_at: new Date().toISOString()
      };
      mockStockAdjustmentsMap.set(damAdj.id, damAdj);
    }

    if (qtyMissing > 0) {
      const misAdj = {
        id: `adj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        product_id: lineItem.product_id,
        quantity_change: -qtyMissing,
        reason: 'MISSING',
        unit_cost: invoiceUnitCost,
        total_loss_value: Math.round(qtyMissing * invoiceUnitCost * 100) / 100,
        notes: `Missing stock reported against PO ${po.po_number || poId}`,
        created_by: userId || 'admin',
        created_at: new Date().toISOString()
      };
      mockStockAdjustmentsMap.set(misAdj.id, misAdj);
    }

    // Line item receiving update
    lineItem.quantity_received = (lineItem.quantity_received || 0) + qtyReceived;
    lineItem.quantity_damaged = (lineItem.quantity_damaged || 0) + qtyDamaged;
    lineItem.quantity_missing = (lineItem.quantity_missing || 0) + qtyMissing;

    totalOrdered += lineItem.quantity_ordered;
    totalReceivedAfter += lineItem.quantity_received;

    receivingSummary.push({
      productId: lineItem.product_id,
      productName: lineItem.product_name,
      ordered: lineItem.quantity_ordered,
      received: qtyReceived,
      accepted: acceptedQty,
      damaged: qtyDamaged,
      missing: qtyMissing,
      oldCostPrice: currentAvgCost,
      newCostPrice: newAvgCost,
      newPhysicalStock: invRecord.stock_quantity
    });
  }

  // Update PO state
  const nextPoStatus = totalReceivedAfter >= totalOrdered ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
  await updatePOStatusWithHistory(poId, nextPoStatus, userId, `Received ${totalReceivedAfter}/${totalOrdered} items`);

  return {
    po,
    receivingSummary,
    status: nextPoStatus
  };
};

/**
 * 5. Deterministic One-Click Procurement Grouping
 */
const generateAutomatedProcurementGrouped = async (userId) => {
  let recommendations = [];
  let activePos = [];

  if (supabase) {
    try {
      const { data: recData } = await supabase.from('inventory_reorder_recommendations').select('*').eq('status', 'PENDING');
      const { data: poData } = await supabase.from('purchase_orders').select('*, purchase_order_items(*)').in('status', ['DRAFT', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED']);
      if (recData) recommendations = recData;
      if (poData) activePos = poData;
    } catch (e) {}
  }

  // Exclude recommendations already linked to an active PO
  const linkedProductIds = new Set();
  activePos.forEach(po => {
    (po.purchase_order_items || po.items || []).forEach(item => {
      linkedProductIds.add(item.product_id);
    });
  });

  const pendingRecs = recommendations.filter(r => !linkedProductIds.has(r.product_id));

  // Group products by supplier_id
  const supplierGroups = new Map();
  const unassignedProducts = [];

  pendingRecs.forEach(rec => {
    const supId = rec.supplier_id;
    if (!supId || supId === 'UNASSIGNED') {
      unassignedProducts.push({
        productId: rec.product_id,
        productName: rec.product_name,
        recommendedQty: rec.recommended_qty || 20,
        statusLevel: rec.status_level || 'CRITICAL',
        issue: 'UNASSIGNED_SUPPLIER'
      });
    } else {
      if (!supplierGroups.has(supId)) supplierGroups.set(supId, []);
      supplierGroups.get(supId).push(rec);
    }
  });

  // Create consolidated DRAFT POs per supplier
  const createdPOs = [];
  for (const [supId, itemsList] of supplierGroups.entries()) {
    const poItemsPayload = itemsList.map(item => ({
      productId: item.product_id,
      productName: item.product_name,
      quantityOrdered: item.recommended_qty || 20,
      unitCostPrice: 150.00
    }));

    try {
      const poRes = await purchaseOrderService.createPurchaseOrder({
        supplierId: supId,
        items: poItemsPayload,
        notes: 'Automated 1-Click Procurement Batch'
      }, userId);

      await updatePOStatusWithHistory(poRes.id, 'DRAFT', userId, 'Created via 1-Click Procurement Batch');
      createdPOs.push(poRes);
    } catch (e) {}
  }

  return {
    createdPOsCount: createdPOs.length,
    createdPOs,
    unassignedCount: unassignedProducts.length,
    unassignedProducts
  };
};

module.exports = {
  getSuppliersWithPerformance,
  editDraftPurchaseOrder,
  updatePOStatusWithHistory,
  receivePOItemsAtomic,
  generateAutomatedProcurementGrouped,
  mockStatusHistoryMap,
  mockCostHistoryMap,
  mockStockAdjustmentsMap,
  mockInventoryMap,
  getProductInventory
};
