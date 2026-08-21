import React from 'react';
import { SEO } from '../../components/seo/SEO';
import { Card } from '../../components/ui/Card';
import { Phone, MapPin, Clock, MessageSquare } from 'lucide-react';

export const Contact = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
      <SEO
        title="Contact Chaudhary Kirana Store | Mahruni"
        description="Contact Chaudhary Kirana Store in Mahruni. Call Akash Chaudhary at 7897837095 or 7007550184 for quick grocery orders and delivery enquiries."
      />

      <h1 className="text-h1">Contact Us 📞</h1>

      <Card padding="28px">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ padding: '10px', backgroundColor: 'var(--color-mint)', borderRadius: 'var(--radius-md)' }}>
              <Phone size={24} color="var(--color-primary-dark)" />
            </div>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: '0.95rem' }}>Phone Enquiries</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Akash Chaudhary (Owner)<br />
                <a href="tel:7897837095" style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>📞 7897837095</a><br />
                <a href="tel:7007550184" style={{ fontWeight: 800, color: 'var(--color-primary-dark)' }}>📞 7007550184</a>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ padding: '10px', backgroundColor: 'var(--color-mint)', borderRadius: 'var(--radius-md)' }}>
              <MapPin size={24} color="var(--color-primary-dark)" />
            </div>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: '0.95rem' }}>Store Address</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Near Bada Jain Mandir,<br />
                Tikamgarh Road, Mahruni,<br />
                Uttar Pradesh, India
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
