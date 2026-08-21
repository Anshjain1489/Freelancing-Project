import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { userService } from '../../services/user.service';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Breadcrumbs } from '../../components/layout/Breadcrumbs';
import { showSuccess, showError } from '../../utils/toast';
import { User, Phone, Mail, Shield } from 'lucide-react';

export const Profile = () => {
  const { user, setUser, logout } = useContext(AuthContext);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await userService.updateProfile({ fullName, phone });
      setUser({ ...user, ...res.data?.user });
      showSuccess('Profile updated successfully!');
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px' }}>
      <Breadcrumbs items={[{ label: 'My Account' }, { label: 'Profile' }]} />

      <h1 className="text-h1">My Account Profile 👤</h1>

      <Card padding="28px">
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ padding: '16px', borderRadius: '50%', backgroundColor: 'var(--color-mint)', color: 'var(--color-primary-dark)' }}>
              <User size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{user?.fullName}</h3>
              <span className="badge-green">{user?.role || 'CUSTOMER'} Account</span>
            </div>
          </div>

          <Input
            label="Full Name"
            icon={User}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Input
            label="Mobile Number"
            icon={Phone}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <Input
            label="Email Address"
            icon={Mail}
            value={email || 'Not provided'}
            disabled
          />

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Button variant="primary" type="submit" loading={loading}>
              Save Profile Changes
            </Button>
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
