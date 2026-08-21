const supabase = require('../config/supabase');

const getSitemapXML = async (req, res) => {
  const baseUrl = process.env.FRONTEND_URL || 'https://chaudhary-kirana-store.vercel.app';
  const lastMod = new Date().toISOString().slice(0, 10);

  let staticUrls = [
    { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${baseUrl}/products`, priority: '0.9', changefreq: 'daily' },
    { loc: `${baseUrl}/categories`, priority: '0.8', changefreq: 'weekly' },
    { loc: `${baseUrl}/about`, priority: '0.5', changefreq: 'monthly' },
    { loc: `${baseUrl}/contact`, priority: '0.6', changefreq: 'monthly' }
  ];

  let dynamicUrls = [];

  if (supabase) {
    const [catRes, prodRes] = await Promise.all([
      supabase.from('categories').select('slug, updated_at').eq('is_active', true),
      supabase.from('products').select('slug, updated_at').eq('is_active', true)
    ]);

    if (catRes.data) {
      catRes.data.forEach(c => {
        dynamicUrls.push({
          loc: `${baseUrl}/categories/${c.slug}`,
          priority: '0.7',
          changefreq: 'weekly'
        });
      });
    }

    if (prodRes.data) {
      prodRes.data.forEach(p => {
        dynamicUrls.push({
          loc: `${baseUrl}/products/${p.slug}`,
          priority: '0.8',
          changefreq: 'daily'
        });
      });
    }
  }

  const allUrls = [...staticUrls, ...dynamicUrls];

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.header('Content-Type', 'application/xml');
  return res.send(xmlContent);
};

module.exports = { getSitemapXML };
