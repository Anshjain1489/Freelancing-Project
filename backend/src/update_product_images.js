const supabase = require('./config/supabase');

const productImages = {
  // Atta & Grains
  'aashirvaad-shuddh-chakki-atta-5kg': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80',
  'fortune-maida-1kg': 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=500&q=80',
  'rajdhani-sooji-500g': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80',

  // Rice & Pulses
  'india-gate-basmati-rice-5kg': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80',
  'tata-sampann-toor-dal-1kg': 'https://images.unsplash.com/photo-1515543904379-3d757afe72e3?auto=format&fit=crop&w=500&q=80',
  'tata-sampann-moong-dal-1kg': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80',
  'kabuli-chana-1kg': 'https://images.unsplash.com/photo-1515543904379-3d757afe72e3?auto=format&fit=crop&w=500&q=80',

  // Oils & Ghee
  'fortune-sunlite-sunflower-oil-1l': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=500&q=80',
  'engine-kachi-ghani-mustard-oil-1l': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=500&q=80',
  'amul-pure-cow-ghee-1l': 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=500&q=80',

  // Spices
  'catch-turmeric-powder-200g': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=500&q=80',
  'mdh-deggi-mirch-100g': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=500&q=80',
  'mdh-garam-masala-100g': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=500&q=80',

  // Dairy
  'amul-taaza-toned-milk-500ml': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=500&q=80',
  'amul-fresh-paneer-200g': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=80',
  'amul-butter-100g': 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=500&q=80',

  // Snacks & Biscuits
  'haldiram-aloo-bhujia-400g': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=500&q=80',
  'kurkure-masala-munch-90g': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=500&q=80',
  'parle-g-gold-biscuits-1kg': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=500&q=80',
  'britannia-good-day-cashew-600g': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=500&q=80',

  // Beverages
  'tata-tea-premium-500g': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=500&q=80',
  'nescafe-classic-coffee-50g': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=500&q=80',

  // Personal Care
  'dettol-original-soap-multipack': 'https://images.unsplash.com/photo-1607006482602-76ca9bd4a908?auto=format&fit=crop&w=500&q=80',
  'colgate-strong-teeth-200g': 'https://images.unsplash.com/photo-1559598467-f8b76c8155d0?auto=format&fit=crop&w=500&q=80',
  'clinic-plus-shampoo-340ml': 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=500&q=80',

  // Cleaning
  'surf-excel-easy-wash-1kg': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
  'vim-dishwash-bar-300g-pack': 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=500&q=80'
};

const categoryDefaultImages = {
  'atta-grains': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80',
  'rice-pulses': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80',
  'oil-ghee': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=500&q=80',
  'spices': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=500&q=80',
  'dairy': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=500&q=80',
  'snacks': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=500&q=80',
  'biscuits': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=500&q=80',
  'beverages': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=500&q=80',
  'personal-care': 'https://images.unsplash.com/photo-1607006482602-76ca9bd4a908?auto=format&fit=crop&w=500&q=80',
  'cleaning-household': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
  'instant-food': 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=500&q=80',
  'daily-essentials': 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80'
};

async function updateProductImages() {
  console.log('Updating product image URLs on Supabase database...');

  const { data: products, error: fetchErr } = await supabase.from('products').select('id, slug, name, category_id');
  if (fetchErr || !products) {
    console.error('Error fetching products:', fetchErr);
    return;
  }

  let count = 0;
  for (const prod of products) {
    const imageUrl = productImages[prod.slug] || categoryDefaultImages['daily-essentials'];
    const { error: updateErr } = await supabase
      .from('products')
      .update({ image_url: imageUrl })
      .eq('id', prod.id);

    if (!updateErr) count++;
  }

  console.log(`✅ Updated ${count} products with high-definition product images on Supabase!`);
}

updateProductImages();
