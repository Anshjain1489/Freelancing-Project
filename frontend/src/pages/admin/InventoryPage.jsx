import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { showSuccess, showError } from '../../utils/toast';
import { Boxes, RefreshCw, AlertTriangle } from 'lucide-react';

export const InventoryPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustmentQty, setAdjustmentQty] = useState(10);
  const [reason, setReason] = useState('RESTOCK');
  const [submitting, setSubmitting] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await adminService.getInventory();
      setItems(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAdjustStock = async () => {
    if (!selectedProduct) return;
    setSubmitting(true);
    try {
      await adminService.adjustStock(selectedProduct.productId, adjustmentQty, reason);
      showSuccess(`Stock updated for ${selectedProduct.productName}!`);
      setSelectedProduct(null);
      fetchInventory();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update stock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-h1">Inventory & Stock Audit 📦</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Monitor stock thresholds and perform atomic inventory restocks
          </p>
        </div>
      </div>

      <Card padding="20px">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3].map(i => <TableRowSkeleton key={i} />)}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '10px' }}>Product Name</th>
                  <th style={{ padding: '10px' }}>Current Stock</th>
                  <th style={{ padding: '10px' }}>Threshold</th>
                  <th style={{ padding: '10px' }}>Stock Status</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 700 }}>{item.productName}</td>
                    <td style={{ padding: '12px 10px', fontWeight: 800, fontSize: '1rem', color: item.status === 'OUT_OF_STOCK' ? '#DC2626' : 'var(--color-text-primary)' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '12px 10px', color: 'var(--color-text-secondary)' }}>{item.lowStockThreshold || 5}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <Badge variant={item.status === 'IN_STOCK' ? 'green' : item.status === 'LOW_STOCK' ? 'orange' : 'danger'}>
                        {item.status}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => setSelectedProduct(item)}>
                        Adjust Stock
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Stock Adjustment Modal */}
      {selectedProduct && (
        <Modal
          isOpen={Boolean(selectedProduct)}
          onClose={() => setSelectedProduct(null)}
          title={`Adjust Stock: ${selectedProduct.productName}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
              Current Stock: <strong>{selectedProduct.quantity}</strong> units
            </div>

            <Input
              label="Stock Adjustment Quantity (+ for restock, - for reduction)"
              type="number"
              value={adjustmentQty}
              onChange={(e) => setAdjustmentQty(parseInt(e.target.value, 10) || 0)}
            />

            <Input
              label="Reason / Audit Note"
              placeholder="e.g. Restock from Distributor"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <Button variant="outline" fullWidth onClick={() => setSelectedProduct(null)}>
                Cancel
              </Button>
              <Button variant="primary" fullWidth loading={submitting} onClick={handleAdjustStock}>
                Confirm Stock Adjustment
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
