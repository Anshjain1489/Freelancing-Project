const supabase = require('../../config/supabase');
const categoryService = require('../category.service');
const { logAdminActivity } = require('../adminLog.service');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const getAdminCategories = async () => {
  return categoryService.getAllCategories();
};

const createCategory = async (userId, { name, description, image, displayOrder }, req = null) => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  if (supabase) {
    const { data: newCat, error } = await supabase.from('categories').insert([{
      name,
      slug,
      description: description || '',
      image_url: image || null,
      display_order: displayOrder || 0,
      is_active: true
    }]).select().single();

    if (error || !newCat) {
      throw new AppError('Failed to create category: ' + (error?.message || ''), HTTP_STATUS.BAD_REQUEST);
    }

    await logAdminActivity(userId, 'CATEGORY_CREATED', 'category', newCat.id, { name }, req);
    return newCat;
  }

  return { id: `cat-${Date.now()}`, name, slug, description, isActive: true };
};

const updateCategory = async (userId, categoryId, updateData, req = null) => {
  if (supabase) {
    const payload = {};
    if (updateData.name) payload.name = updateData.name;
    if (updateData.description !== undefined) payload.description = updateData.description;
    if (typeof updateData.isActive === 'boolean') payload.is_active = updateData.isActive;

    const { data: updated, error } = await supabase.from('categories')
      .update(payload)
      .eq('id', categoryId)
      .select()
      .single();

    if (error || !updated) throw new AppError('Failed to update category', HTTP_STATUS.BAD_REQUEST);

    await logAdminActivity(userId, 'CATEGORY_UPDATED', 'category', categoryId, payload, req);
    return updated;
  }

  return { id: categoryId, ...updateData };
};

module.exports = {
  getAdminCategories,
  createCategory,
  updateCategory
};
