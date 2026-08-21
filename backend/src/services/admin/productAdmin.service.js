const supabase = require('../../config/supabase');
const productService = require('../product.service');
const { logAdminActivity } = require('../adminLog.service');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getAdminProducts = async (queryParams = {}) => {
  return productService.getProducts({ ...queryParams, admin: true });
};

const createProduct = async (userId, productData, req = null) => {
  const { name, categoryId, description, mrp, sellingPrice, unit, unitValue, brand, barcode, isActive } = productData;

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + `-${Date.now().toString().slice(-4)}`;

  if (supabase) {
    const { data: newProd, error } = await supabase.from('products').insert([{
      name,
      slug,
      category_id: categoryId,
      description: description || '',
      mrp,
      selling_price: sellingPrice,
      unit: unit || 'kg',
      unit_value: unitValue || 1,
      brand: brand || 'Generic',
      sku: productData.sku || 'SKU-' + Date.now().toString().slice(-6),
      barcode: barcode || null,
      is_active: isActive !== false
    }]).select().single();

    if (error || !newProd) {
      throw new AppError('Failed to create product: ' + (error?.message || ''), HTTP_STATUS.BAD_REQUEST);
    }

    // Initialize inventory counter
    await supabase.from('inventory').insert([{
      product_id: newProd.id,
      quantity: productData.stockQuantity || 50,
      low_stock_threshold: productData.lowStockThreshold || 5
    }]);

    await logAdminActivity(userId, 'PRODUCT_CREATED', 'product', newProd.id, { name }, req);
    return newProd;
  }

  const mockProd = { id: `p-${Date.now()}`, name, slug, mrp, sellingPrice, unit, brand, isActive: true };
  return mockProd;
};

const updateProduct = async (userId, productId, updateData, req = null) => {
  if (supabase) {
    const payload = {};
    if (updateData.name) payload.name = updateData.name;
    if (updateData.description !== undefined) payload.description = updateData.description;
    if (updateData.mrp) payload.mrp = updateData.mrp;
    if (updateData.sellingPrice) payload.selling_price = updateData.sellingPrice;
    if (updateData.brand) payload.brand = updateData.brand;
    if (typeof updateData.isActive === 'boolean') payload.is_active = updateData.isActive;

    const { data: updated, error } = await supabase.from('products')
      .update(payload)
      .eq('id', productId)
      .select()
      .single();

    if (error || !updated) {
      throw new AppError('Failed to update product', HTTP_STATUS.BAD_REQUEST);
    }

    await logAdminActivity(userId, 'PRODUCT_UPDATED', 'product', productId, payload, req);
    return updated;
  }

  return { id: productId, ...updateData };
};

module.exports = {
  getAdminProducts,
  createProduct,
  updateProduct
};
