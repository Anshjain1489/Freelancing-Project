const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');

const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ''));

// Local in-memory mock cart fallback for dev testing
const mockCarts = {};

const getUserCart = async (userId) => {
  if (supabase && isUuid(userId)) {
    // 1. Get or create cart for user
    let { data: cart } = await supabase.from('carts').select('id').eq('user_id', userId).single();

    if (!cart) {
      const { data: newCart, error: createErr } = await supabase.from('carts').insert([{ user_id: userId }]).select('id').single();
      if (createErr) throw new AppError('Failed to initialize cart', HTTP_STATUS.INTERNAL_SERVER_ERROR);
      cart = newCart;
    }

    // 2. Fetch cart items with live product & stock details
    const { data: items, error: itemsErr } = await supabase.from('cart_items').select(`
      id, quantity, created_at,
      products (
        id, name, slug, brand, unit, unit_value, mrp, selling_price, discount_percentage, is_active,
        inventory ( quantity, reserved_quantity, low_stock_threshold ),
        product_images ( image_url, is_primary )
      )
    `).eq('cart_id', cart.id);

    if (itemsErr) throw new AppError('Failed to fetch cart items', HTTP_STATUS.INTERNAL_SERVER_ERROR);

    let subtotal = 0;
    const formattedItems = (items || []).map(item => {
      const p = item.products;
      const rawInv = p?.inventory;
      const inv = Array.isArray(rawInv) ? (rawInv[0] || {}) : (rawInv || {});
      const availableStock = Math.max(0, (inv.quantity || 0) - (inv.reserved_quantity || 0));
      const sellingPrice = parseFloat(p.selling_price);
      const itemSubtotal = sellingPrice * item.quantity;
      subtotal += itemSubtotal;

      return {
        id: item.id,
        productId: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand,
        unit: p.unit,
        unitValue: p.unit_value,
        mrp: parseFloat(p.mrp),
        sellingPrice,
        discountPercentage: p.discount_percentage,
        imageUrl: p.product_images?.find(i => i.is_primary)?.image_url || null,
        quantity: item.quantity,
        availableStock,
        itemSubtotal,
        isAvailable: p.is_active && availableStock > 0
      };
    });

    return {
      cartId: cart.id,
      items: formattedItems,
      itemCount: formattedItems.reduce((acc, curr) => acc + curr.quantity, 0),
      subtotal
    };
  }

  // Local fallback
  const cart = mockCarts[userId] || { items: [] };
  const subtotal = cart.items.reduce((acc, i) => acc + (i.sellingPrice * i.quantity), 0);
  return {
    cartId: `cart-${userId}`,
    items: cart.items,
    itemCount: cart.items.reduce((acc, i) => acc + i.quantity, 0),
    subtotal
  };
};

const addCartItem = async (userId, productId, quantity) => {
  if (supabase && isUuid(userId)) {
    let { data: cart } = await supabase.from('carts').select('id').eq('user_id', userId).single();
    if (!cart) {
      const { data: newCart } = await supabase.from('carts').insert([{ user_id: userId }]).select('id').single();
      cart = newCart;
    }

    // Verify product & stock
    const { data: product } = await supabase.from('products').select(`
      id, is_active, inventory ( quantity, reserved_quantity )
    `).eq('id', productId).single();

    if (!product || !product.is_active) {
      throw new AppError('Product is no longer available', HTTP_STATUS.BAD_REQUEST);
    }

    const rawInv = product.inventory;
    const inv = Array.isArray(rawInv) ? (rawInv[0] || {}) : (rawInv || {});
    const availableStock = Math.max(0, (inv.quantity || 0) - (inv.reserved_quantity || 0));

    // Check existing item in cart
    const { data: existingItem } = await supabase.from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cart.id)
      .eq('product_id', productId)
      .single();

    const targetQuantity = (existingItem?.quantity || 0) + quantity;
    if (targetQuantity > availableStock) {
      throw new AppError(`Cannot add quantity. Available stock: ${availableStock}`, HTTP_STATUS.BAD_REQUEST);
    }

    if (existingItem) {
      await supabase.from('cart_items').update({ quantity: targetQuantity }).eq('id', existingItem.id);
    } else {
      await supabase.from('cart_items').insert([{ cart_id: cart.id, product_id: productId, quantity: targetQuantity }]);
    }

    return getUserCart(userId);
  }

  // Mock Fallback
  if (!mockCarts[userId]) mockCarts[userId] = { items: [] };
  const userCart = mockCarts[userId];
  const existing = userCart.items.find(i => i.productId === productId || i.id === productId);

  if (quantity > 1000 || ((existing?.quantity || 0) + quantity) > 1000) {
    throw new AppError('Cannot add quantity. Available stock: 50', HTTP_STATUS.BAD_REQUEST);
  }

  if (existing) {
    existing.quantity += quantity;
  } else {
    userCart.items.push({
      id: productId,
      productId,
      name: 'Aashirvaad Chakki Atta 5kg',
      sellingPrice: 235,
      quantity
    });
  }
  return getUserCart(userId);
};

const updateCartItemQuantity = async (userId, itemId, quantity) => {
  if (quantity <= 0) {
    return removeCartItem(userId, itemId);
  }

  if (supabase && isUuid(userId)) {
    let { data: cart } = await supabase.from('carts').select('id').eq('user_id', userId).single();
    if (cart) {
      await supabase.from('cart_items').update({ quantity }).eq('id', itemId).eq('cart_id', cart.id);
    }
    return getUserCart(userId);
  }

  if (mockCarts[userId]) {
    const item = mockCarts[userId].items.find(i => i.id === itemId || i.productId === itemId);
    if (item) item.quantity = quantity;
  }
  return getUserCart(userId);
};

const removeCartItem = async (userId, itemId) => {
  if (supabase && isUuid(userId)) {
    let { data: cart } = await supabase.from('carts').select('id').eq('user_id', userId).single();
    if (cart) {
      await supabase.from('cart_items').delete().eq('id', itemId).eq('cart_id', cart.id);
    }
    return getUserCart(userId);
  }

  if (mockCarts[userId]) {
    mockCarts[userId].items = mockCarts[userId].items.filter(i => i.id !== itemId && i.productId !== itemId);
  }
  return getUserCart(userId);
};

const clearCart = async (userId) => {
  if (supabase && isUuid(userId)) {
    let { data: cart } = await supabase.from('carts').select('id').eq('user_id', userId).single();
    if (cart) {
      await supabase.from('cart_items').delete().eq('cart_id', cart.id);
    }
    return getUserCart(userId);
  }

  if (mockCarts[userId]) mockCarts[userId].items = [];
  return getUserCart(userId);
};

const syncGuestCart = async (userId, guestItems = []) => {
  const warnings = [];
  for (const item of guestItems) {
    try {
      await addCartItem(userId, item.productId, item.quantity);
    } catch (err) {
      warnings.push(`Item quantity adjusted or skipped due to stock limits.`);
    }
  }

  const updatedCart = await getUserCart(userId);
  return {
    cart: updatedCart,
    warnings
  };
};

module.exports = {
  getUserCart,
  addCartItem,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
  syncGuestCart
};
