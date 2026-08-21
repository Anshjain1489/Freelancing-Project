import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/admin.service';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { FolderTree, Plus } from 'lucide-react';

export const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const res = await adminService.getProducts(); // Reuses categories listing endpoint
        setCategories(res.data?.categories || []);
      } catch {} finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-h1">Categories Management 🗂</h1>
        <Button variant="primary" icon={Plus}>Add Category</Button>
      </div>

      <Card padding="20px">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                <th style={{ padding: '10px' }}>Category Name</th>
                <th style={{ padding: '10px' }}>Slug</th>
                <th style={{ padding: '10px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Atta & Grains', slug: 'atta-grains' },
                { name: 'Oils & Ghee', slug: 'oils-ghee' },
                { name: 'Spices & Masala', slug: 'spices-masala' },
                { name: 'Dairy & Eggs', slug: 'dairy-eggs' },
                { name: 'Snacks & Beverages', slug: 'snacks-beverages' }
              ].map((c, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 10px', fontWeight: 800 }}>{c.name}</td>
                  <td style={{ padding: '12px 10px', color: 'var(--color-text-secondary)' }}>{c.slug}</td>
                  <td style={{ padding: '12px 10px' }}><Badge variant="green">ACTIVE</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
