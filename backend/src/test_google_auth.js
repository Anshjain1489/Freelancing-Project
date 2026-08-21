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
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runGoogleAuthTests() {
  console.log('🧪 Starting Automated Verification Tests for Google OAuth Extension...\n');
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
    // 1. Invalid Google token should be rejected (400 Bad Request or 401 Unauthorized)
    const invalidRes = await request('POST', '/api/v1/auth/google', { idToken: 'invalid_token_xyz' });
    assert(invalidRes.status === 400 || invalidRes.status === 401, 'POST /api/v1/auth/google rejects invalid token with 400/401');

    // 2. Valid/Mock Google token authentication
    const validRes = await request('POST', '/api/v1/auth/google', { idToken: 'mock_g_token_akash_google' });
    assert(validRes.status === 200 && validRes.body.success === true, 'POST /api/v1/auth/google authenticates Google user');
    assert(validRes.body.data.user.role === 'CUSTOMER', 'Google authenticated user receives CUSTOMER role strictly');
    assert(validRes.body.data.accessToken && validRes.body.data.refreshToken, 'Google login returns application JWT access and refresh tokens');

    // 3. Existing Google user repeat login
    const repeatRes = await request('POST', '/api/v1/auth/google', { idToken: 'mock_g_token_akash_google' });
    assert(repeatRes.status === 200 && repeatRes.body.data.user.email === 'akash_google@gmail.com', 'Repeat Google login retrieves existing user without creating duplicates');

    console.log(`\n🎉 Google OAuth Verification Complete: ${passed} Passed, ${failed} Failed.`);
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
  runGoogleAuthTests();
});
