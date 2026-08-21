import React from 'react';
import { SEO } from '../../components/seo/SEO';
import { Card } from '../../components/ui/Card';
import { MapPin, Phone, ShieldCheck, Truck } from 'lucide-react';

export const About = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
      <SEO
        title="About Chaudhary Kirana Store | Mahruni"
        description="Learn about Chaudhary Kirana Store in Mahruni, owned by Akash Chaudhary. Fast local grocery delivery, authentic products, and trusted family values."
      />

      <h1 className="text-h1">About Chaudhary Kirana Store 🌾</h1>

      <Card padding="28px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
          <p style={{ fontSize: '1rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>
            Welcome to <strong>Chaudhary Kirana Store</strong>, your trusted neighbourhood grocery store serving Mahruni and nearby areas. Owned and operated by <strong>Akash Chaudhary</strong>, our mission is to deliver fresh, high-quality daily essential groceries directly to your doorstep.
          </p>

          <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-primary)', fontWeight: 800, marginTop: '8px' }}>Our Commitment to Local Customers</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '4px' }}>
            <div style={{ padding: '16px', backgroundColor: 'var(--color-mint-light)', borderRadius: 'var(--radius-md)' }}>
              <Truck size={20} color="var(--color-primary-dark)" />
              <div style={{ fontWeight: 800, color: 'var(--color-primary-dark)', marginTop: '6px' }}>Fast Local Delivery</div>
              <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>Fast local delivery at ₹10 per KM from Bada Jain Mandir.</div>
            </div>

            <div style={{ padding: '16px', backgroundColor: 'var(--color-mint-light)', borderRadius: 'var(--radius-md)' }}>
              <ShieldCheck size={20} color="var(--color-primary-dark)" />
              <div style={{ fontWeight: 800, color: 'var(--color-primary-dark)', marginTop: '6px' }}>100% Authentic Quality</div>
              <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>Fresh flour, pure oils, spices, and genuine packaged goods.</div>
            </div>
          </div>

          <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-primary)', fontWeight: 800, marginTop: '12px' }}>Visit Our Store</h3>
          <p style={{ fontSize: '0.85rem' }}>
            📍 <strong>Address:</strong> Near Bada Jain Mandir, Tikamgarh Road, Mahruni, India<br />
            📞 <strong>Primary Phone:</strong> <a href="tel:7897837095" style={{ color: 'var(--color-primary-dark)', fontWeight: 700 }}>7897837095</a><br />
            📞 <strong>Secondary Phone:</strong> <a href="tel:7007550184" style={{ color: 'var(--color-primary-dark)', fontWeight: 700 }}>7007550184</a>
          </p>
        </div>
      </Card>
    </div>
  );
};
