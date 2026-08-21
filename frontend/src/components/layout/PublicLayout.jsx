import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { MobileBottomNav } from './MobileBottomNav';
import { CartDrawer } from '../cart/CartDrawer';
import { ChatbotWidget } from '../chatbot/ChatbotWidget';

export const PublicLayout = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main className="max-w-screen" style={{ flex: 1, padding: '16px 16px 40px 16px', width: '100%' }}>
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
      <CartDrawer />
      <ChatbotWidget />
    </div>
  );
};
