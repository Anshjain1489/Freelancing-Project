import React, { useEffect, useState, useCallback } from 'react';
import { adminService } from '../../services/admin.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { showSuccess, showError } from '../../utils/toast';
import {
  Boxes,
  PlusCircle,
  MinusCircle,
  History,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Sliders,
  RefreshCw
} from 'lucide-react';

export const InventoryPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'ADD', 'REMOVE', 'THRESHOLD', 'HISTORY'

  // Form input state
  const [actionQuantity, setActionQuantity] = useState(10);
  const [thresholdValue, setThresholdValue] = useState(5);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Movements history modal state
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await adminService.getInventory(params);
      setItems(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load inventory overview:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Real-time SSE Inventory Listener
  useEffect(() => {
    const handleInventoryUpdate = () => {
      fetchInventory();
    };

    window.addEventListener('cks_inventory_updated', handleInventoryUpdate);
    return () => {
      window.removeEventListener('cks_inventory_updated', handleInventoryUpdate);
    };
  }, [fetchInventory]);

  // Summary Metrics
  const totalProducts = items.length;
  const inStockCount = items.filter(i => i.status === 'IN_STOCK').length;
  const lowStockCount = items.filter(i => i.status === 'LOW_STOCK').length;
  const outOfStockCount = items.filter(i => i.status === 'OUT_OF_STOCK').length;

  // Open Actions Modals
  const handleOpenAddStock = (prod) => {
    setSelectedProduct(prod);
    setActionQuantity(10);
    setReason('Supplier restock');
    setActiveModal('ADD');
  };

  const handleOpenRemoveStock = (prod) => {
    setSelectedProduct(prod);
    setActionQuantity(5);
    setReason('Damaged / Expired stock removal');
    setActiveModal('REMOVE');
  };

  const handleOpenThreshold = (prod) => {
    setSelectedProduct(prod);
    setThresholdValue(prod.lowStockThreshold || 5);
    setActiveModal('THRESHOLD');
  };

  const handleOpenHistory = async (prod) => {
    setSelectedProduct(prod);
    setActiveModal('HISTORY');
    setLoadingMovements(true);
    try {
      const res = await adminService.getStockMovements(prod ? prod.productId : null);
      setMovements(res.data?.movements || []);
    } catch (err) {
      showError('Failed to load stock movements');
    } finally {
      setLoadingMovements(false);
    }
  };

  // Submit Actions
  const handleAddStockSubmit = async () => {
    if (!selectedProduct) return;
    setSubmitting(true);
    try {
      await adminService.addStock(selectedProduct.productId, actionQuantity, reason);
      showSuccess(`Added ${actionQuantity} units to "${selectedProduct.productName}"`);
      setActiveModal(null);
      fetchInventory();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to add stock');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveStockSubmit = async () => {
    if (!selectedProduct) return;
    setSubmitting(true);
    try {
      await adminService.removeStock(selectedProduct.productId, actionQuantity, reason);
      showSuccess(`Removed ${actionQuantity} units from "${selectedProduct.productName}"`);
      setActiveModal(null);
      fetchInventory();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to remove stock');
    } finally {
      setSubmitting(false);
    }
  };

  const handleThresholdSubmit = async () => {
    if (!selectedProduct) return;
    setSubmitting(true);
    try {
      await adminService.updateThreshold(selectedProduct.productId, thresholdValue);
      showSuccess(`Low stock threshold updated to ${thresholdValue} for "${selectedProduct.productName}"`);
      setActiveModal(null);
      fetchInventory();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update threshold');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Boxes className="w-8 h-8" style={{ color: '#06C167' }} />
            Production Inventory & Stock Audit 📦
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Real-time atomic stock reservation, low-stock alerts & complete inventory movement audit trail.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="outline" icon={History} onClick={() => handleOpenHistory(null)}>
            Global Audit History
          </Button>
          <Button variant="primary" icon={RefreshCw} onClick={fetchInventory}>
            Refresh Inventory
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <Card padding="18px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Products</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px' }}>{totalProducts}</div>
            </div>
            <div style={{ background: '#E6F4EA', padding: '12px', borderRadius: '12px', color: '#06C167' }}>
              <Boxes size={24} />
            </div>
          </div>
        </Card>

        <Card padding="18px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>In Stock</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#06C167', marginTop: '4px' }}>{inStockCount}</div>
            </div>
            <div style={{ background: '#E6F4EA', padding: '12px', borderRadius: '12px', color: '#06C167' }}>
              <CheckCircle size={24} />
            </div>
          </div>
        </Card>

        <Card padding="18px" style={{ borderLeft: '4px solid #FF6B00' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Low Stock Alert</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FF6B00', marginTop: '4px' }}>{lowStockCount}</div>
            </div>
            <div style={{ background: '#FFF3E0', padding: '12px', borderRadius: '12px', color: '#FF6B00' }}>
              <AlertTriangle size={24} />
            </div>
          </div>
        </Card>

        <Card padding="18px" style={{ borderLeft: '4px solid #DC2626' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Out of Stock</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>{outOfStockCount}</div>
            </div>
            <div style={{ background: '#FEE2E2', padding: '12px', borderRadius: '12px', color: '#DC2626' }}>
              <XCircle size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card padding="16px">
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Input
              placeholder="Search product name, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Filter size={18} style={{ color: 'var(--color-text-secondary)' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="IN_STOCK">🟢 In Stock</option>
              <option value="LOW_STOCK">🟠 Low Stock</option>
              <option value="OUT_OF_STOCK">🔴 Out of Stock</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Inventory Main Table */}
      <Card padding="20px">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[1, 2, 3, 4, 5].map(i => <TableRowSkeleton key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
            <Boxes size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <h3>No inventory records found</h3>
            <p style={{ fontSize: '0.85rem' }}>Try adjusting your search query or status filter.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 10px' }}>Product</th>
                  <th style={{ padding: '12px 10px' }}>SKU</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center' }}>Current Stock</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center' }}>Reserved</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center' }}>Available</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center' }}>Threshold</th>
                  <th style={{ padding: '12px 10px' }}>Status</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const isLow = item.status === 'LOW_STOCK';
                  const isOut = item.status === 'OUT_OF_STOCK';

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        background: isOut ? '#FEF2F2' : isLow ? '#FFFBEB' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '14px 10px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{item.productName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{item.categoryName} • ₹{item.sellingPrice}</div>
                      </td>

                      <td style={{ padding: '14px 10px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                        {item.sku || 'N/A'}
                      </td>

                      <td style={{ padding: '14px 10px', textAlign: 'center', fontWeight: 800, fontSize: '1rem' }}>
                        {item.stockQuantity}
                      </td>

                      <td style={{ padding: '14px 10px', textAlign: 'center', fontWeight: 700, color: '#FF6B00' }}>
                        {item.reservedQuantity > 0 ? `🔒 ${item.reservedQuantity}` : 0}
                      </td>

                      <td style={{ padding: '14px 10px', textAlign: 'center', fontWeight: 900, fontSize: '1.05rem', color: isOut ? '#DC2626' : isLow ? '#D97706' : '#06C167' }}>
                        {item.availableQuantity}
                      </td>

                      <td style={{ padding: '14px 10px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                        {item.lowStockThreshold}
                      </td>

                      <td style={{ padding: '14px 10px' }}>
                        <Badge variant={item.status === 'IN_STOCK' ? 'green' : item.status === 'LOW_STOCK' ? 'orange' : 'danger'}>
                          {item.status === 'IN_STOCK' ? '🟢 In Stock' : item.status === 'LOW_STOCK' ? '🟠 Low Stock' : '🔴 Out of Stock'}
                        </Badge>
                      </td>

                      <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <Button variant="outline" size="sm" icon={PlusCircle} onClick={() => handleOpenAddStock(item)} title="Add Stock">
                            + Add
                          </Button>
                          <Button variant="outline" size="sm" icon={MinusCircle} onClick={() => handleOpenRemoveStock(item)} title="Remove Stock">
                            - Remove
                          </Button>
                          <Button variant="ghost" size="sm" icon={Sliders} onClick={() => handleOpenThreshold(item)} title="Set Threshold" />
                          <Button variant="ghost" size="sm" icon={History} onClick={() => handleOpenHistory(item)} title="View Audit Logs" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal: Add Stock */}
      {activeModal === 'ADD' && selectedProduct && (
        <Modal isOpen onClose={() => setActiveModal(null)} title={`Add Stock: ${selectedProduct.productName}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', background: '#E6F4EA', padding: '10px 14px', borderRadius: '8px' }}>
              Current Stock: <strong>{selectedProduct.stockQuantity}</strong> | Reserved: <strong>{selectedProduct.reservedQuantity}</strong> | Available: <strong>{selectedProduct.availableQuantity}</strong>
            </div>

            <Input
              label="Quantity to Add (+)"
              type="number"
              min="1"
              value={actionQuantity}
              onChange={(e) => setActionQuantity(parseInt(e.target.value, 10) || 0)}
            />

            <Input
              label="Reason / Supplier Note"
              placeholder="e.g. Stock received from supplier invoice #4920"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <Button variant="outline" fullWidth onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button variant="primary" fullWidth loading={submitting} onClick={handleAddStockSubmit}>
                Confirm Stock Addition
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Remove Stock */}
      {activeModal === 'REMOVE' && selectedProduct && (
        <Modal isOpen onClose={() => setActiveModal(null)} title={`Remove Stock: ${selectedProduct.productName}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', background: '#FEE2E2', padding: '10px 14px', borderRadius: '8px' }}>
              Current Stock: <strong>{selectedProduct.stockQuantity}</strong> | Currently Reserved: <strong>{selectedProduct.reservedQuantity}</strong>
              <div style={{ fontSize: '0.8rem', marginTop: '4px', color: '#DC2626' }}>
                ⚠️ Cannot reduce stock below currently reserved quantity ({selectedProduct.reservedQuantity}).
              </div>
            </div>

            <Input
              label="Quantity to Remove (-)"
              type="number"
              min="1"
              value={actionQuantity}
              onChange={(e) => setActionQuantity(parseInt(e.target.value, 10) || 0)}
            />

            <Input
              label="Reason for Removal"
              placeholder="e.g. Expired batch or packaging damage"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <Button variant="outline" fullWidth onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button variant="danger" fullWidth loading={submitting} onClick={handleRemoveStockSubmit}>
                Confirm Stock Removal
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Set Low Stock Threshold */}
      {activeModal === 'THRESHOLD' && selectedProduct && (
        <Modal isOpen onClose={() => setActiveModal(null)} title={`Set Low Stock Threshold: ${selectedProduct.productName}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              Current Threshold: <strong>{selectedProduct.lowStockThreshold}</strong>
            </div>

            <Input
              label="New Low Stock Threshold"
              type="number"
              min="0"
              value={thresholdValue}
              onChange={(e) => setThresholdValue(parseInt(e.target.value, 10) || 0)}
            />

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <Button variant="outline" fullWidth onClick={() => setActiveModal(null)}>
                Cancel
              </Button>
              <Button variant="primary" fullWidth loading={submitting} onClick={handleThresholdSubmit}>
                Save Threshold
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Global / Product Stock Movement History Log */}
      {activeModal === 'HISTORY' && (
        <Modal
          isOpen
          onClose={() => setActiveModal(null)}
          title={`Inventory Movement History ${selectedProduct ? `: ${selectedProduct.productName}` : '(Global)'}`}
        >
          <div style={{ minWidth: '600px', maxWidth: '800px', maxHeight: '500px', overflowY: 'auto' }}>
            {loadingMovements ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
                {[1, 2, 3].map(i => <TableRowSkeleton key={i} />)}
              </div>
            ) : movements.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-secondary)' }}>
                No movement history recorded yet.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                    <th style={{ padding: '8px' }}>Timestamp</th>
                    <th style={{ padding: '8px' }}>Type</th>
                    <th style={{ padding: '8px' }}>Qty</th>
                    <th style={{ padding: '8px' }}>Stock State</th>
                    <th style={{ padding: '8px' }}>Reserved State</th>
                    <th style={{ padding: '8px' }}>Performed By</th>
                    <th style={{ padding: '8px' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <Badge size="sm" variant={m.movementType === 'STOCK_ADDED' || m.movementType === 'INITIAL_STOCK' ? 'green' : m.movementType === 'SALE' ? 'blue' : m.movementType === 'RESERVED' ? 'orange' : 'neutral'}>
                          {m.movementType}
                        </Badge>
                      </td>
                      <td style={{ padding: '8px', fontWeight: 800 }}>{m.quantity}</td>
                      <td style={{ padding: '8px', color: 'var(--color-text-secondary)' }}>{m.previousStock} → <strong>{m.newStock}</strong></td>
                      <td style={{ padding: '8px', color: 'var(--color-text-secondary)' }}>{m.previousReserved} → <strong>{m.newReserved}</strong></td>
                      <td style={{ padding: '8px', color: 'var(--color-text-secondary)' }}>{m.performedBy || 'System'}</td>
                      <td style={{ padding: '8px', color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>{m.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
