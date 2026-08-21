import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { TableRowSkeleton } from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/formatting';
import { Plus, Edit, Search } from 'lucide-react';

export const ProductsPage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await adminService.getProducts({ search });
      setProducts(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="text-h1">Product Catalog 📦</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Manage Kirana store products, pricing, and stock visibility
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => navigate('/admin/products/new')}>
          Add Product
        </Button>
      </div>

      <Card padding="20px">
        <div style={{ marginBottom: '16px', maxWidth: '360px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 32px 8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
          />
          <Search size={16} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3, 4].map(i => <TableRowSkeleton key={i} />)}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '10px' }}>Product Name</th>
                  <th style={{ padding: '10px' }}>Brand</th>
                  <th style={{ padding: '10px' }}>MRP</th>
                  <th style={{ padding: '10px' }}>Selling Price</th>
                  <th style={{ padding: '10px' }}>Stock</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 700 }}>{p.name}</td>
                    <td style={{ padding: '12px 10px' }}>{p.brand}</td>
                    <td style={{ padding: '12px 10px', textDecoration: 'line-through', color: 'var(--color-text-tertiary)' }}>{formatCurrency(p.mrp)}</td>
                    <td style={{ padding: '12px 10px', fontWeight: 800, color: 'var(--color-primary-dark)' }}>{formatCurrency(p.sellingPrice)}</td>
                    <td style={{ padding: '12px 10px', fontWeight: 700 }}>{p.availableStock ?? p.stockQuantity ?? 50}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <Badge variant={p.isActive !== false ? 'green' : 'gray'}>
                        {p.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      <Button variant="ghost" size="sm" icon={Edit} onClick={() => navigate(`/admin/products/${p.id}/edit`)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
