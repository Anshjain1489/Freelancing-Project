// Mapping of Kirana Store Categories to Real High-Quality Product Images
export const CATEGORY_IMAGES = {
  'atta-grains': 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=400&q=80', // Wheat & Chakki Atta
  'rice-pulses': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80', // Basmati Rice & Lentils
  'oil-ghee': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80',    // Mustard Oil & Desi Ghee
  'spices': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=400&q=80',      // Indian Spices (Haldi, Mirch, Masala)
  'snacks': 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=400&q=80',      // Bhujia, Namkeen & Chips
  'biscuits': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80',    // Tea Biscuits & Cookies
  'beverages': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=400&q=80',   // Tea, Coffee & Cold Drinks
  'personal-care': '/images/store/store-shelves-cosmetics.jpg', // Real Store Cosmetics Cabinet
  'cleaning-household': 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=400&q=80', // Detergents & Cleaners
  'instant-food': 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80', // Noodles & Instant Mix
  'daily-essentials': '/images/store/store-front.jpg' // Real Store Grain Containers
};

/**
 * Get real image URL for a category object or slug/name
 */
export const getCategoryImage = (category) => {
  if (!category) return CATEGORY_IMAGES['atta-grains'];

  if (typeof category === 'string') {
    const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (CATEGORY_IMAGES[slug]) return CATEGORY_IMAGES[slug];
    
    // Fuzzy matching by name keywords
    const nameLower = category.toLowerCase();
    if (nameLower.includes('atta') || nameLower.includes('grain')) return CATEGORY_IMAGES['atta-grains'];
    if (nameLower.includes('rice') || nameLower.includes('pulse') || nameLower.includes('dal')) return CATEGORY_IMAGES['rice-pulses'];
    if (nameLower.includes('oil') || nameLower.includes('ghee')) return CATEGORY_IMAGES['oil-ghee'];
    if (nameLower.includes('spice') || nameLower.includes('masala')) return CATEGORY_IMAGES['spices'];
    if (nameLower.includes('snack') || nameLower.includes('namkeen')) return CATEGORY_IMAGES['snacks'];
    if (nameLower.includes('biscuit') || nameLower.includes('cookie')) return CATEGORY_IMAGES['biscuits'];
    if (nameLower.includes('beverage') || nameLower.includes('tea') || nameLower.includes('drink')) return CATEGORY_IMAGES['beverages'];
    if (nameLower.includes('personal') || nameLower.includes('care') || nameLower.includes('soap')) return CATEGORY_IMAGES['personal-care'];
    if (nameLower.includes('clean') || nameLower.includes('household')) return CATEGORY_IMAGES['cleaning-household'];
    if (nameLower.includes('instant') || nameLower.includes('noodle')) return CATEGORY_IMAGES['instant-food'];
    if (nameLower.includes('essential') || nameLower.includes('salt')) return CATEGORY_IMAGES['daily-essentials'];
  }

  if (category.image_url || category.imageUrl) {
    return category.image_url || category.imageUrl;
  }

  const slug = category.slug || (category.name ? category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '');
  if (CATEGORY_IMAGES[slug]) return CATEGORY_IMAGES[slug];

  return getCategoryImage(category.name || '');
};
