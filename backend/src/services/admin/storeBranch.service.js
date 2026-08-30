const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');

const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || ''));

// In-Memory Store Fallback
const mockBranches = new Map([
  [
    'branch-main-001',
    {
      id: 'branch-main-001',
      branch_code: 'CKS-MAIN',
      branch_name: 'Chaudhary Kirana Store - Main Branch',
      address: 'Main Market, Mahruni',
      city: 'Mahruni',
      state: 'Uttar Pradesh',
      postal_code: '284401',
      latitude: 24.5800,
      longitude: 78.4800,
      phone: '+917897837095',
      is_active: true,
      settings: { delivery_radius_km: 10, free_delivery_min_order: 500 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
]);

/**
 * 1. List Branches (Public / Admin)
 */
const listBranches = async (queryParams = {}) => {
  let list = Array.from(mockBranches.values());

  if (supabase) {
    try {
      let query = supabase.from('store_branches').select('*').order('branch_name');
      if (queryParams.activeOnly) {
        query = query.eq('is_active', true);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        list = data;
      }
    } catch (e) {}
  }

  if (queryParams.activeOnly) {
    list = list.filter(b => b.is_active === true);
  }

  return {
    branches: list,
    total: list.length
  };
};

/**
 * 2. Get Single Branch Details
 */
const getBranchById = async (branchId) => {
  let branch = mockBranches.get(branchId) || Array.from(mockBranches.values()).find(b => b.branch_code === branchId);

  if (supabase && isUuid(branchId)) {
    try {
      const { data, error } = await supabase.from('store_branches').select('*').eq('id', branchId).single();
      if (!error && data) {
        branch = data;
      }
    } catch (e) {}
  }

  if (!branch) {
    throw new AppError('Store branch not found', HTTP_STATUS.NOT_FOUND);
  }

  return branch;
};

/**
 * 3. Create Store Branch (Admin)
 */
const createBranch = async (branchData) => {
  const {
    branchCode,
    branchName,
    address,
    city = 'Mahruni',
    state = 'Uttar Pradesh',
    postalCode = '284401',
    latitude = null,
    longitude = null,
    phone,
    settings = {}
  } = branchData;

  if (!branchCode || !branchCode.trim()) {
    throw new AppError('Branch code is required', HTTP_STATUS.BAD_REQUEST);
  }
  if (!branchName || !branchName.trim()) {
    throw new AppError('Branch name is required', HTTP_STATUS.BAD_REQUEST);
  }
  if (!address || !address.trim()) {
    throw new AppError('Branch address is required', HTTP_STATUS.BAD_REQUEST);
  }
  if (!phone || !phone.trim()) {
    throw new AppError('Branch contact phone is required', HTTP_STATUS.BAD_REQUEST);
  }

  const upperCode = branchCode.trim().toUpperCase();
  const existing = Array.from(mockBranches.values()).find(b => b.branch_code === upperCode);
  if (existing) {
    throw new AppError(`Branch with code "${upperCode}" already exists`, HTTP_STATUS.CONFLICT);
  }

  const record = {
    id: `branch-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    branch_code: upperCode,
    branch_name: branchName.trim(),
    address: address.trim(),
    city: city.trim(),
    state: state.trim(),
    postal_code: postalCode.trim(),
    latitude: latitude ? parseFloat(latitude) : null,
    longitude: longitude ? parseFloat(longitude) : null,
    phone: phone.trim(),
    is_active: true,
    settings: { delivery_radius_km: 10, free_delivery_min_order: 500, ...settings },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data, error } = await supabase.from('store_branches').insert([{
        branch_code: record.branch_code,
        branch_name: record.branch_name,
        address: record.address,
        city: record.city,
        state: record.state,
        postal_code: record.postal_code,
        latitude: record.latitude,
        longitude: record.longitude,
        phone: record.phone,
        is_active: record.is_active,
        settings: record.settings
      }]).select().single();

      if (!error && data) {
        record.id = data.id;
      }
    } catch (e) {}
  }

  mockBranches.set(record.id, record);
  return record;
};

/**
 * 4. Update Store Branch (Admin)
 */
const updateBranch = async (branchId, updateData) => {
  const branch = await getBranchById(branchId);

  if (updateData.branchName) branch.branch_name = updateData.branchName.trim();
  if (updateData.address) branch.address = updateData.address.trim();
  if (updateData.city) branch.city = updateData.city.trim();
  if (updateData.state) branch.state = updateData.state.trim();
  if (updateData.postalCode) branch.postal_code = updateData.postalCode.trim();
  if (updateData.phone) branch.phone = updateData.phone.trim();
  if (updateData.latitude !== undefined) branch.latitude = updateData.latitude ? parseFloat(updateData.latitude) : null;
  if (updateData.longitude !== undefined) branch.longitude = updateData.longitude ? parseFloat(updateData.longitude) : null;
  if (updateData.settings) branch.settings = { ...branch.settings, ...updateData.settings };
  branch.updated_at = new Date().toISOString();

  if (supabase && isUuid(branchId)) {
    try {
      await supabase.from('store_branches').update({
        branch_name: branch.branch_name,
        address: branch.address,
        city: branch.city,
        state: branch.state,
        postal_code: branch.postal_code,
        phone: branch.phone,
        latitude: branch.latitude,
        longitude: branch.longitude,
        settings: branch.settings,
        updated_at: branch.updated_at
      }).eq('id', branchId);
    } catch (e) {}
  }

  mockBranches.set(branch.id, branch);
  return branch;
};

/**
 * 5. Toggle Branch Active Status (Admin)
 */
const setBranchStatus = async (branchId, isActive) => {
  const branch = await getBranchById(branchId);
  branch.is_active = !!isActive;
  branch.updated_at = new Date().toISOString();

  if (supabase && isUuid(branchId)) {
    try {
      await supabase.from('store_branches').update({
        is_active: branch.is_active,
        updated_at: branch.updated_at
      }).eq('id', branchId);
    } catch (e) {}
  }

  mockBranches.set(branch.id, branch);
  return branch;
};

module.exports = {
  listBranches,
  getBranchById,
  createBranch,
  updateBranch,
  setBranchStatus,
  mockBranches
};
