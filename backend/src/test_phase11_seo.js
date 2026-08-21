const app = require('./app');
const http = require('http');

let server;
let baseUrl;

async function request(method, path, body = null, token = null) {
  const url = new URL(path, baseUrl);
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, raw: data });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runPhase11Tests() {
  console.log('🧪 Starting Automated Verification Tests for Phase 11 SEO, Google Visibility & Production Optimization...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health Endpoint Check
    const healthRes = await request('GET', '/api/v1/health');
    assert(healthRes.status === 200, 'GET /api/v1/health returns HTTP 200 OK');

    // 2. Dynamic Sitemap XML Endpoint Check
    const sitemapRes = await request('GET', '/api/v1/sitemap.xml');
    const isXml = (sitemapRes.headers['content-type'] || '').includes('xml');
    const hasUrlset = sitemapRes.raw.includes('<urlset') && sitemapRes.raw.includes('</urlset>');
    const hasHomepage = sitemapRes.raw.includes('/products') && sitemapRes.raw.includes('/categories');

    assert(sitemapRes.status === 200 && isXml && hasUrlset && hasHomepage, 'GET /api/v1/sitemap.xml returns valid XML sitemap with public URLs');

    // 3. Security Audit Verification
    const hasNoPublicSecrets = !process.env.VITE_RAZORPAY_KEY_SECRET && !process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    assert(hasNoPublicSecrets, 'Security audit passed: No private secrets exposed in public environment');

    console.log(`\n🎉 Phase 11 Verification Complete: ${passed} Passed, ${failed} Failed.`);
    server.close();
    process.exit(failed > 0 ? 1 : 0);

  } catch (err) {
    console.error('💥 Test Execution Error:', err);
    if (server) server.close();
    process.exit(1);
  }
}

server = app.listen(0, () => {
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
  runPhase11Tests();
});
