const supabase = require('../../config/supabase');
const AppError = require('../../utils/AppError');
const { HTTP_STATUS } = require('../../constants/statusCodes');
const customerCRMService = require('./customerCRM.service');

const mockSegments = new Map();
const mockSegmentMembers = new Map();

// Seed Default System Segments
const defaultSystemSegments = [
  { id: 'seg-new', name: 'New Customers', slug: 'NEW_CUSTOMER', description: 'Customers with 0 or 1 order', criteria: { maximum_orders: 1 }, is_system: true, is_active: true },
  { id: 'seg-active', name: 'Active Customers', slug: 'ACTIVE_CUSTOMER', description: 'Active purchase within 30 days', criteria: { inactive_days: 30 }, is_system: true, is_active: true },
  { id: 'seg-repeat', name: 'Repeat Customers', slug: 'REPEAT_CUSTOMER', description: '2+ completed orders', criteria: { minimum_orders: 2 }, is_system: true, is_active: true },
  { id: 'seg-high-value', name: 'High Value VIPs', slug: 'HIGH_VALUE', description: 'Total spend >= ₹10,000', criteria: { minimum_spend: 10000 }, is_system: true, is_active: true },
  { id: 'seg-at-risk', name: 'At Risk Customers', slug: 'AT_RISK', description: 'Inactive between 30 and 60 days', criteria: { min_inactive_days: 30, max_inactive_days: 60 }, is_system: true, is_active: true },
  { id: 'seg-inactive', name: 'Inactive Customers', slug: 'INACTIVE', description: 'Inactive > 60 days', criteria: { min_inactive_days: 60 }, is_system: true, is_active: true }
];

defaultSystemSegments.forEach(s => mockSegments.set(s.id, s));

/**
 * Evaluate segment criteria against customer profile
 */
const evaluateCriteria = (profile, criteria = {}) => {
  if (!profile) return false;

  if (criteria.minimum_orders !== undefined && profile.completed_orders < criteria.minimum_orders) {
    return false;
  }
  if (criteria.maximum_orders !== undefined && profile.completed_orders > criteria.maximum_orders) {
    return false;
  }
  if (criteria.minimum_spend !== undefined && profile.total_spend < criteria.minimum_spend) {
    return false;
  }

  if (profile.last_order_at) {
    const diffDays = Math.floor((Date.now() - new Date(profile.last_order_at).getTime()) / (1000 * 60 * 60 * 24));
    if (criteria.inactive_days !== undefined && diffDays > criteria.inactive_days) {
      return false;
    }
    if (criteria.min_inactive_days !== undefined && diffDays < criteria.min_inactive_days) {
      return false;
    }
    if (criteria.max_inactive_days !== undefined && diffDays > criteria.max_inactive_days) {
      return false;
    }
  }

  return true;
};

/**
 * List all segments with member counts
 */
const listSegments = async () => {
  let list = Array.from(mockSegments.values());

  if (supabase) {
    try {
      const { data } = await supabase.from('customer_segments').select('*').order('created_at', { ascending: true });
      if (data && data.length > 0) list = data;
    } catch (e) {}
  }

  return { segments: list };
};

/**
 * Create custom segment
 */
const createSegment = async (segmentData) => {
  const { name, slug, description, criteria = {} } = segmentData;
  if (!name || !slug) {
    throw new AppError('Segment name and slug are required', HTTP_STATUS.BAD_REQUEST);
  }

  const cleanSlug = String(slug).toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  const record = {
    id: `seg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name,
    slug: cleanSlug,
    description: description || '',
    criteria,
    is_system: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('customer_segments')
        .insert([record])
        .select()
        .single();
      if (!error && data) {
        mockSegments.set(data.id, data);
        return data;
      }
    } catch (e) {}
  }

  mockSegments.set(record.id, record);
  return record;
};

/**
 * Refresh memberships for a segment or all segments
 */
const refreshSegmentMemberships = async (segmentId = null) => {
  const { segments } = await listSegments();
  const targetSegments = segmentId ? segments.filter(s => s.id === segmentId) : segments;

  const { profiles } = await customerCRMService.listProfiles({ limit: 1000 });
  let refreshedCount = 0;

  for (const seg of targetSegments) {
    for (const prof of profiles) {
      if (evaluateCriteria(prof, seg.criteria)) {
        const memberKey = `${seg.id}_${prof.user_id}`;
        const memberRecord = {
          id: `csm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          segment_id: seg.id,
          user_id: prof.user_id,
          customer_id: prof.id,
          calculated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        };

        if (supabase) {
          try {
            await supabase.from('customer_segment_members').upsert([memberRecord], { onConflict: 'segment_id,user_id' });
          } catch (e) {}
        }
        mockSegmentMembers.set(memberKey, memberRecord);
        refreshedCount++;
      }
    }
  }

  return { success: true, refreshedMemberships: refreshedCount };
};

/**
 * Get active segments for a customer
 */
const getCustomerSegments = async (userId) => {
  if (!userId) throw new AppError('User ID is required', HTTP_STATUS.BAD_REQUEST);
  const profile = await customerCRMService.getProfile(userId);
  const { segments } = await listSegments();

  const matching = segments.filter(seg => evaluateCriteria(profile, seg.criteria));
  return { segments: matching };
};

module.exports = {
  listSegments,
  createSegment,
  refreshSegmentMemberships,
  getCustomerSegments,
  evaluateCriteria,
  mockSegments,
  mockSegmentMembers
};
