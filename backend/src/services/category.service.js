const supabase = require('../config/supabase');
const slugify = require('../utils/slugify');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');
const { logAdminActivity } = require('./adminLog.service');

// Demo categories list for offline local mode
const mockCategories = [
  { id: 'c1010000-0000-0000-0000-000000000001', name: 'Atta & Grains', slug: 'atta-grains', description: 'Fresh wheat flour, maida, sooji', iconName: 'Wheat', displayOrder: 1, isActive: true },
  { id: 'c1010000-0000-0000-0000-000000000002', name: 'Rice & Pulses', slug: 'rice-pulses', description: 'Basmati rice, Toor Dal, Moong, Chana', iconName: 'Utensils', displayOrder: 2, isActive: true },
  { id: 'c1010000-0000-0000-0000-000000000003', name: 'Oil & Ghee', slug: 'oil-ghee', description: 'Mustard oil, Sunflower oil, Desi Ghee', iconName: 'Droplet', displayOrder: 3, isActive: true }
];

const getCategories = async (includeInactive = false) => {
  if (supabase) {
    let query = supabase.from('categories').select('*').order('display_order', { ascending: true });
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    const { data, error } = await query;
    if (error) throw new AppError('Failed to fetch categories', HTTP_STATUS.INTERNAL_SERVER_ERROR);

    return data.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      iconName: c.icon_name,
      imageUrl: c.image_url,
      displayOrder: c.display_order,
      isActive: c.is_active
    }));
  }

  return includeInactive ? mockCategories : mockCategories.filter(c => c.isActive);
};

const getCategoryBySlug = async (slug) => {
  if (supabase) {
    const { data, error } = await supabase.from('categories').select('*').eq('slug', slug).single();
    if (error || !data) throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND);

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      iconName: data.icon_name,
      imageUrl: data.image_url,
      displayOrder: data.display_order,
      isActive: data.is_active
    };
  }

  const cat = mockCategories.find(c => c.slug === slug);
  if (!cat) throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND);
  return cat;
};

const createCategory = async (categoryData, adminId, req = null) => {
  const generatedSlug = slugify(categoryData.name);

  if (supabase) {
    const { data, error } = await supabase.from('categories').insert([{
      name: categoryData.name,
      slug: generatedSlug,
      description: categoryData.description || null,
      icon_name: categoryData.iconName || 'ShoppingBag',
      image_url: categoryData.imageUrl || null,
      display_order: categoryData.displayOrder || 0,
      is_active: categoryData.isActive !== undefined ? categoryData.isActive : true
    }]).select().single();

    if (error) {
      throw new AppError('Failed to create category: ' + error.message, HTTP_STATUS.BAD_REQUEST);
    }

    await logAdminActivity(adminId, 'CATEGORY_CREATED', 'category', data.id, { name: data.name }, req);
    return data;
  }

  const newCat = {
    id: `c-${Date.now()}`,
    name: categoryData.name,
    slug: generatedSlug,
    description: categoryData.description,
    iconName: categoryData.iconName || 'ShoppingBag',
    displayOrder: categoryData.displayOrder || 0,
    isActive: true
  };
  mockCategories.push(newCat);
  await logAdminActivity(adminId, 'CATEGORY_CREATED', 'category', newCat.id, { name: newCat.name }, req);
  return newCat;
};

const updateCategory = async (id, updateData, adminId, req = null) => {
  const payload = {};
  if (updateData.name) {
    payload.name = updateData.name;
    payload.slug = slugify(updateData.name);
  }
  if (updateData.description !== undefined) payload.description = updateData.description;
  if (updateData.iconName !== undefined) payload.icon_name = updateData.iconName;
  if (updateData.imageUrl !== undefined) payload.image_url = updateData.imageUrl;
  if (updateData.displayOrder !== undefined) payload.display_order = updateData.displayOrder;
  if (updateData.isActive !== undefined) payload.is_active = updateData.isActive;

  if (supabase) {
    const { data, error } = await supabase.from('categories').update(payload).eq('id', id).select().single();
    if (error) throw new AppError('Failed to update category: ' + error.message, HTTP_STATUS.BAD_REQUEST);

    await logAdminActivity(adminId, 'CATEGORY_UPDATED', 'category', id, payload, req);
    return data;
  }

  const cat = mockCategories.find(c => c.id === id);
  if (!cat) throw new AppError('Category not found', HTTP_STATUS.NOT_FOUND);
  Object.assign(cat, updateData);
  await logAdminActivity(adminId, 'CATEGORY_UPDATED', 'category', id, updateData, req);
  return cat;
};

const deleteCategory = async (id, adminId, req = null) => {
  // Soft delete preference
  if (supabase) {
    const { data, error } = await supabase.from('categories').update({ is_active: false }).eq('id', id).select().single();
    if (error) throw new AppError('Failed to deactivate category: ' + error.message, HTTP_STATUS.BAD_REQUEST);

    await logAdminActivity(adminId, 'CATEGORY_DEACTIVATED', 'category', id, {}, req);
    return data;
  }

  const cat = mockCategories.find(c => c.id === id);
  if (cat) cat.isActive = false;
  await logAdminActivity(adminId, 'CATEGORY_DEACTIVATED', 'category', id, {}, req);
  return { message: 'Category soft-deactivated successfully' };
};

module.exports = {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
};
