const https = require('https');

function testLiveLogin() {
  console.log('Testing live Render backend auth endpoints...');

  const data = JSON.stringify({
    identifier: 'admin@chaudhary.com',
    password: 'Admin@123'
  });

  const options = {
    hostname: 'freelancing-project-3bp1.onrender.com',
    port: 443,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(options, (res) => {
    let body = '';
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);

    res.on('data', (d) => {
      body += d;
    });

    res.on('end', () => {
      console.log('Response Body:', body);
    });
  });

  req.on('error', (error) => {
    console.error('Request Error:', error);
  });

  req.write(data);
  req.end();
}

testLiveLogin();
