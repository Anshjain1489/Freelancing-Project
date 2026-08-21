import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { cartService } from '../services/cart.service';
import { showWarning, showSuccess } from '../utils/toast';

export const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { isAuthenticated, user } = useContext(AuthContext);
  const [cartItems, setCartItems] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync / Load Cart on Auth state change
  useEffect(() => {
    const loadCart = async () => {
      setIsLoading(true);
      if (isAuthenticated) {
        try {
          // Check if there was a guest cart to sync
          const localGuestCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
          if (localGuestCart.length > 0) {
            const syncRes = await cartService.syncGuestCart(
              localGuestCart.map(i => ({ productId: i.id || i.productId, quantity: i.quantity }))
            );
            localStorage.removeItem('guest_cart');
            if (syncRes.data?.warnings?.length > 0) {
              showWarning('Some item quantities were adjusted to fit available stock.');
            }
            setCartItems(syncRes.data?.cart?.items || []);
          } else {
            const res = await cartService.getCart();
            setCartItems(res.data?.cart?.items || []);
          }
        } catch (err) {
          console.error('Failed to load server cart:', err);
        }
      } else {
        // Load guest cart from local storage
        const local = JSON.parse(localStorage.getItem('guest_cart') || '[]');
        setCartItems(local);
      }
      setIsLoading(false);
    };

    loadCart();
  }, [isAuthenticated, user?.id]);

  // Persist guest cart to local storage when unauthenticated
  const persistGuestCart = (items) => {
    setCartItems(items);
    if (!isAuthenticated) {
      localStorage.setItem('guest_cart', JSON.stringify(items));
    }
  };

  const addItem = async (product, quantity = 1) => {
    if (isAuthenticated) {
      try {
        const res = await cartService.addItem(product.id, quantity);
        setCartItems(res.data?.cart?.items || []);
      } catch (err) {
        showWarning(err.response?.data?.message || 'Failed to add item');
      }
    } else {
      const existingIdx = cartItems.findIndex(i => i.id === product.id || i.productId === product.id);
      let updated;
      if (existingIdx > -1) {
        updated = [...cartItems];
        updated[existingIdx].quantity += quantity;
      } else {
        updated = [...cartItems, {
          id: product.id,
          productId: product.id,
          name: product.name,
          slug: product.slug,
          brand: product.brand,
          unit: product.unit,
          unitValue: product.unitValue,
          mrp: product.mrp || product.mrpPrice,
          sellingPrice: product.sellingPrice,
          quantity
        }];
      }
      persistGuestCart(updated);
    }
  };

  const updateQuantity = async (productIdOrItemId, quantity) => {
    if (quantity < 1) {
      return removeItem(productIdOrItemId);
    }

    if (isAuthenticated) {
      try {
        const res = await cartService.updateQuantity(productIdOrItemId, quantity);
        setCartItems(res.data?.cart?.items || []);
      } catch (err) {
        showWarning(err.response?.data?.message || 'Failed to update quantity');
      }
    } else {
      const updated = cartItems.map(item => {
        if (item.id === productIdOrItemId || item.productId === productIdOrItemId) {
          return { ...item, quantity };
        }
        return item;
      });
      persistGuestCart(updated);
    }
  };

  const removeItem = async (productIdOrItemId) => {
    if (isAuthenticated) {
      try {
        const res = await cartService.removeItem(productIdOrItemId);
        setCartItems(res.data?.cart?.items || []);
        showSuccess('Item removed from cart');
      } catch (err) {
        console.error('Failed to remove item:', err);
      }
    } else {
      const updated = cartItems.filter(item => item.id !== productIdOrItemId && item.productId !== productIdOrItemId);
      persistGuestCart(updated);
      showSuccess('Item removed from cart');
    }
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      try {
        await cartService.clearCart();
        setCartItems([]);
      } catch (err) {
        console.error('Failed to clear cart:', err);
      }
    } else {
      persistGuestCart([]);
    }
  };

  const itemCount = cartItems.reduce((acc, curr) => acc + curr.quantity, 0);
  const subtotal = cartItems.reduce((acc, curr) => acc + (curr.sellingPrice * curr.quantity), 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        itemCount,
        subtotal,
        isLoading,
        isDrawerOpen,
        openCart: () => setIsDrawerOpen(true),
        closeCart: () => setIsDrawerOpen(false),
        addItem,
        updateQuantity,
        removeItem,
        clearCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
