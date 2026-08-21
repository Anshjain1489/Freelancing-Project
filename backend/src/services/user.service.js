const supabase = require('../config/supabase');
const AppError = require('../utils/AppError');
const { HTTP_STATUS } = require('../constants/statusCodes');

const getUserProfile = async (userId) => {
  if (supabase) {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, full_name, email, phone, avatar_url, is_active, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new AppError('User profile not found', HTTP_STATUS.NOT_FOUND);
    }
    return {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatar_url,
      isActive: user.is_active,
      createdAt: user.created_at
    };
  }

  // Local/mock fallback: decode from active token request or return active mock profile
  return {
    id: userId,
    fullName: 'Test Customer',
    email: 'test@example.com',
    phone: '9876543210',
    avatarUrl: null,
    isActive: true
  };
};

const updateUserProfile = async (userId, updateData) => {
  const payload = {};
  if (updateData.fullName) payload.full_name = updateData.fullName;
  if (updateData.phone) payload.phone = updateData.phone;
  if (updateData.avatarUrl !== undefined) payload.avatar_url = updateData.avatarUrl;

  if (supabase) {
    const { data: updated, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', userId)
      .select('id, full_name, email, phone, avatar_url')
      .single();

    if (error) {
      throw new AppError('Failed to update profile: ' + error.message, HTTP_STATUS.BAD_REQUEST);
    }

    return {
      id: updated.id,
      fullName: updated.full_name,
      email: updated.email,
      phone: updated.phone,
      avatarUrl: updated.avatar_url
    };
  }

  return {
    id: userId,
    fullName: updateData.fullName || 'Updated Customer Name',
    email: 'test@example.com',
    phone: updateData.phone || '9876543210',
    avatarUrl: updateData.avatarUrl || null
  };
};

module.exports = {
  getUserProfile,
  updateUserProfile
};
