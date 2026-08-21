const supabase = require('../config/supabase');
const slugify = require('../utils/slugify');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');
const { getPaginationParams, formatPaginatedResponse } = require('../utils/pagination');
const { logAdminActivity } = require('./adminLog.service');

// Mock fallback products list
const mockProducts = [
  {
    id: 'p1000000-0000-0000-0000-000000000001',
    name: 'Aashirvaad Shuddh Chakki Atta 5kg',
    slug: 'aashirvaad-shuddh-chakki-atta-5kg',
    categorySlug: 'atta-grains',
    categoryName: 'Atta & Grains',
    unit: 'kg',
    unitValue: 5,
    mrp: 260.00,
    sellingPrice: 235.00,
    discountPercentage: 10,
    isFeatured: true,
    isActive: true,
    stockStatus: 'IN_STOCK',
    stockQuantity: 40
  },
  {
    id: 'p1000000-0000-0000-0000-000000000008',
    name: 'Fortune Sunlite Refined Sunflower Oil 1L',
    slug: 'fortune-sunlite-sunflower-oil-1l',
    categorySlug: 'oil-ghee',
    categoryName: 'Oil & Ghee',
    unit: 'litre',
    unitValue: 1,
    mrp: 165.00,
    sellingPrice: 142.00,
    discountPercentage: 14,
    isFeatured: true,
    isActive: true,
    stockStatus: 'IN_STOCK',
    stockQuantity: 45
  }
];

const getStockStatus = (quantity, lowStockThreshold = 5) => {
  if (!quantity || quantity <= 0) return 'OUT_OF_STOCK';
  if (quantity <= lowStockThreshold) return 'LOW_STOCK';
  return 'IN_STOCK';
};

const getProducts = async (queryParams) => {
  const { page, limit, offset } = getPaginationParams(queryParams.page, queryParams.limit);
  const { category, search, sort, minPrice, maxPrice } = queryParams;

  if (supabase) {
    let query = supabase.from('products').select(`
      *,
      categories ( name, slug ),
      inventory ( quantity, low_stock_threshold ),
      product_images ( image_url, is_primary )
    `, { count: 'exact' }).eq('is_active', true);

    if (category) {
      query = query.eq('categories.slug', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%`);
    }

    if (minPrice) {
      query = query.gte('selling_price', parseFloat(minPrice));
    }

    if (maxPrice) {
      query = query.lte('selling_price', parseFloat(maxPrice));
    }

    // Apply Sorting
    switch (sort) {
      case 'price_asc':
        query = query.order('selling_price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('selling_price', { ascending: false });
        break;
      case 'name_asc':
        query = query.order('name', { ascending: true });
        break;
      case 'name_desc':
        query = query.order('name', { ascending: false });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw new AppError('Failed to fetch products: ' + error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);

    const formattedItems = data.map(p => {
      const inv = p.inventory?.[0] || { quantity: 0, low_stock_threshold: 5 };
      const primaryImg = p.product_images?.find(i => i.is_primary)?.image_url || p.product_images?.[0]?.image_url || null;

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        categoryName: p.categories?.name || null,
        categorySlug: p.categories?.slug || null,
        brand: p.brand,
        unit: p.unit,
        unitValue: p.unit_value,
        mrp: parseFloat(p.mrp),
        sellingPrice: parseFloat(p.selling_price),
        discountPercentage: p.discount_percentage,
        isFeatured: p.is_featured,
        imageUrl: primaryImg,
        stockStatus: getStockStatus(inv.quantity, inv.low_stock_threshold)
      };
    });

    return formatPaginatedResponse(formattedItems, page, limit, count || 0);
  }

  // Mock Fallback
  let filtered = [...mockProducts];
  if (category) filtered = filtered.filter(p => p.categorySlug === category);
  if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return formatPaginatedResponse(filtered, page, limit, filtered.length);
};

const getFeaturedProducts = async () => {
  if (supabase) {
    const { data, error } = await supabase.from('products').select(`
      *,
      categories ( name, slug ),
      inventory ( quantity, low_stock_threshold ),
      product_images ( image_url, is_primary )
    `).eq('is_active', true).eq('is_featured', true).limit(10);

    if (error) throw new AppError('Failed to fetch featured products', HTTP_STATUS.INTERNAL_SERVER_ERROR);

    return data.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      categoryName: p.categories?.name,
      unit: p.unit,
      unitValue: p.unit_value,
      mrp: parseFloat(p.mrp),
      sellingPrice: parseFloat(p.selling_price),
      discountPercentage: p.discount_percentage,
      imageUrl: p.product_images?.find(i => i.is_primary)?.image_url || null,
      stockStatus: getStockStatus(p.inventory?.[0]?.quantity || 0, p.inventory?.[0]?.low_stock_threshold || 5)
    }));
  }

  return mockProducts.filter(p => p.isFeatured);
};

const searchProducts = async (searchQuery) => {
  if (!searchQuery || searchQuery.trim().length < 2) {
    throw new AppError('Search query must be at least 2 characters', HTTP_STATUS.BAD_REQUEST);
  }

  const cleanQuery = searchQuery.trim();

  if (supabase) {
    // Execute PostgreSQL Full-Text Search on search_vector column
    const { data, error } = await supabase.from('products').select(`
      id, name, slug, brand, unit, unit_value, mrp, selling_price, discount_percentage,
      categories ( name ),
      inventory ( quantity, low_stock_threshold ),
      product_images ( image_url, is_primary )
    `)
    .eq('is_active', true)
    .textSearch('search_vector', cleanQuery, { config: 'english', type: 'websearch' })
    .limit(20);

    if (error || !data || data.length === 0) {
      // Fallback to fuzzy ILIKE search if textSearch yields 0
      const { data: fallbackData } = await supabase.from('products').select(`
        id, name, slug, brand, unit, unit_value, mrp, selling_price, discount_percentage,
        categories ( name ),
        inventory ( quantity, low_stock_threshold ),
        product_images ( image_url, is_primary )
      `).eq('is_active', true).ilike('name', `%${cleanQuery}%`).limit(20);

      const items = (fallbackData || []).map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        categoryName: p.categories?.name,
        unit: p.unit,
        unitValue: p.unit_value,
        mrp: parseFloat(p.mrp),
        sellingPrice: parseFloat(p.selling_price),
        discountPercentage: p.discount_percentage,
        stockStatus: getStockStatus(p.inventory?.[0]?.quantity || 0)
      }));
      return items;
    }

    return data.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      categoryName: p.categories?.name,
      unit: p.unit,
      unitValue: p.unit_value,
      mrp: parseFloat(p.mrp),
      sellingPrice: parseFloat(p.selling_price),
      discountPercentage: p.discount_percentage,
      stockStatus: getStockStatus(p.inventory?.[0]?.quantity || 0)
    }));
  }

  return mockProducts.filter(p => p.name.toLowerCase().includes(cleanQuery.toLowerCase()));
};

const getProductBySlug = async (slug) => {
  if (supabase) {
    const { data: p, error } = await supabase.from('products').select(`
      *,
      categories ( id, name, slug ),
      inventory ( quantity, reserved_quantity, low_stock_threshold ),
      product_images ( id, image_url, is_primary, display_order )
    `).eq('slug', slug).single();

    if (error || !p) throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);

    const inv = p.inventory?.[0] || { quantity: 0, reserved_quantity: 0, low_stock_threshold: 5 };
    const availableQty = Math.max(0, inv.quantity - inv.reserved_quantity);

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      shortDescription: p.short_description,
      description: p.description,
      sku: p.sku,
      brand: p.brand,
      unit: p.unit,
      unitValue: parseFloat(p.unit_value),
      mrp: parseFloat(p.mrp),
      sellingPrice: parseFloat(p.selling_price),
      discountPercentage: p.discount_percentage,
      category: p.categories ? { id: p.categories.id, name: p.categories.name, slug: p.categories.slug } : null,
      images: p.product_images || [],
      stockStatus: getStockStatus(availableQty, inv.low_stock_threshold),
      isAvailable: availableQty > 0
    };
  }

  const found = mockProducts.find(p => p.slug === slug);
  if (!found) throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
  return found;
};

const createProduct = async (productData, adminId, req = null) => {
  const generatedSlug = slugify(productData.name);
  const discount = Math.round(((productData.mrp - productData.sellingPrice) / productData.mrp) * 100);

  if (supabase) {
    const { data: newProd, error: prodErr } = await supabase.from('products').insert([{
      category_id: productData.categoryId,
      name: productData.name,
      slug: generatedSlug,
      short_description: productData.shortDescription || null,
      description: productData.description || null,
      sku: productData.sku,
      brand: productData.brand || 'Generic',
      unit: productData.unit,
      unit_value: productData.unitValue,
      mrp: productData.mrp,
      selling_price: productData.sellingPrice,
      discount_percentage: discount,
      tax_percentage: productData.taxPercentage || 0,
      is_featured: productData.isFeatured || false,
      is_active: productData.isActive !== undefined ? productData.isActive : true
    }]).select().single();

    if (prodErr) throw new AppError('Failed to create product: ' + prodErr.message, HTTP_STATUS.BAD_REQUEST);

    // Create matching Inventory entry
    await supabase.from('inventory').insert([{
      product_id: newProd.id,
      quantity: productData.stockQuantity || 0,
      low_stock_threshold: productData.lowStockThreshold || 5
    }]);

    await logAdminActivity(adminId, 'PRODUCT_CREATED', 'product', newProd.id, { name: newProd.name, sku: newProd.sku }, req);
    return newProd;
  }

  const mockNew = {
    id: `p-${Date.now()}`,
    ...productData,
    slug: generatedSlug,
    discountPercentage: discount,
    stockStatus: 'IN_STOCK'
  };
  mockProducts.push(mockNew);
  await logAdminActivity(adminId, 'PRODUCT_CREATED', 'product', mockNew.id, { name: mockNew.name }, req);
  return mockNew;
};

const updateProduct = async (id, updateData, adminId, req = null) => {
  const payload = {};
  if (updateData.name) {
    payload.name = updateData.name;
    payload.slug = slugify(updateData.name);
  }
  if (updateData.categoryId) payload.category_id = updateData.categoryId;
  if (updateData.shortDescription !== undefined) payload.short_description = updateData.shortDescription;
  if (updateData.description !== undefined) payload.description = updateData.description;
  if (updateData.sku) payload.sku = updateData.sku;
  if (updateData.brand) payload.brand = updateData.brand;
  if (updateData.unit) payload.unit = updateData.unit;
  if (updateData.unitValue) payload.unit_value = updateData.unitValue;
  if (updateData.mrp !== undefined) payload.mrp = updateData.mrp;
  if (updateData.sellingPrice !== undefined) payload.selling_price = updateData.sellingPrice;
  if (updateData.isFeatured !== undefined) payload.is_featured = updateData.isFeatured;
  if (updateData.isActive !== undefined) payload.is_active = updateData.isActive;

  if (supabase) {
    const { data, error } = await supabase.from('products').update(payload).eq('id', id).select().single();
    if (error) throw new AppError('Failed to update product: ' + error.message, HTTP_STATUS.BAD_REQUEST);

    await logAdminActivity(adminId, 'PRODUCT_UPDATED', 'product', id, payload, req);
    return data;
  }

  const p = mockProducts.find(p => p.id === id);
  if (!p) throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND);
  Object.assign(p, updateData);
  await logAdminActivity(adminId, 'PRODUCT_UPDATED', 'product', id, updateData, req);
  return p;
};

const toggleProductStatus = async (id, isActive, adminId, req = null) => {
  if (supabase) {
    const { data, error } = await supabase.from('products').update({ is_active: isActive }).eq('id', id).select().single();
    if (error) throw new AppError('Failed to update product status', HTTP_STATUS.BAD_REQUEST);

    await logAdminActivity(adminId, isActive ? 'PRODUCT_ACTIVATED' : 'PRODUCT_DEACTIVATED', 'product', id, {}, req);
    return data;
  }

  return { id, isActive, message: 'Status updated' };
};

module.exports = {
  getProducts,
  getFeaturedProducts,
  searchProducts,
  getProductBySlug,
  createProduct,
  updateProduct,
  toggleProductStatus
};
