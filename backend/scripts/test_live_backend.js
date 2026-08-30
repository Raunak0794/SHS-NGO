const https = require('https');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: data
      }));
    });
    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

(async () => {
  const origin = 'https://shs-ai-v2.vercel.app';
  const host = 'shs-ngo.onrender.com';
  
  console.log('=== TEST 1: OPTIONS Preflight from https://shs-ai-v2.vercel.app ===');
  try {
    const preflight = await request({
      hostname: host,
      path: '/api/chat/message',
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      }
    });
    console.log('OPTIONS status:', preflight.statusCode);
    console.log('OPTIONS headers:', {
      'access-control-allow-origin': preflight.headers['access-control-allow-origin'],
      'access-control-allow-credentials': preflight.headers['access-control-allow-credentials'],
      'access-control-allow-methods': preflight.headers['access-control-allow-methods'],
      'access-control-allow-headers': preflight.headers['access-control-allow-headers'],
    });
    console.log('OPTIONS body:', preflight.body);
  } catch (err) {
    console.error('OPTIONS error:', err);
  }

  console.log('\n=== TEST 2: Register a test student ===');
  let token = null;
  let cookieHeader = null;
  const testUser = {
    username: 'teststudent_' + Date.now(),
    email: 'teststudent_' + Date.now() + '@example.com',
    password: 'Password123!',
    fullName: { firstName: 'Test', lastName: 'Student' },
    classLevel: 'Class 8'
  };

  try {
    const regPayload = JSON.stringify(testUser);
    const regRes = await request({
      hostname: host,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Origin': origin,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(regPayload)
      }
    }, regPayload);

    console.log('Register status:', regRes.statusCode);
    console.log('Register headers:', {
      'set-cookie': regRes.headers['set-cookie'],
      'access-control-allow-origin': regRes.headers['access-control-allow-origin']
    });
    console.log('Register body:', regRes.body);

    const setCookie = regRes.headers['set-cookie'];
    if (setCookie) {
      cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');
      console.log('Extracted cookieHeader:', cookieHeader);
    }

    try {
      const parsed = JSON.parse(regRes.body);
      if (parsed.token) {
        token = parsed.token;
      }
    } catch {}
  } catch (err) {
    console.error('Register error:', err);
  }

  console.log('\n=== TEST 3: Login as test student ===');
  try {
    const loginPayload = JSON.stringify({
      identifier: testUser.email,
      password: testUser.password
    });
    const loginRes = await request({
      hostname: host,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Origin': origin,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginPayload)
      }
    }, loginPayload);

    console.log('Login status:', loginRes.statusCode);
    console.log('Login body:', loginRes.body);
    const setCookie = loginRes.headers['set-cookie'];
    if (setCookie) {
      cookieHeader = setCookie.map(c => c.split(';')[0]).join('; ');
      console.log('Login cookieHeader:', cookieHeader);
    }
    try {
      const parsed = JSON.parse(loginRes.body);
      if (parsed.token) {
        token = parsed.token;
        console.log('Login JWT token received (length):', token.length);
      }
    } catch {}
  } catch (err) {
    console.error('Login error:', err);
  }

  console.log('\n=== TEST 4: GET /api/auth/me (with Cookie and Authorization Header) ===');
  try {
    const meRes = await request({
      hostname: host,
      path: '/api/auth/me',
      method: 'GET',
      headers: {
        'Origin': origin,
        'Cookie': cookieHeader || '',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    console.log('/auth/me status:', meRes.statusCode);
    console.log('/auth/me body:', meRes.body);
  } catch (err) {
    console.error('/auth/me error:', err);
  }

  console.log('\n=== TEST 5: POST /api/chat/message ===');
  try {
    const chatPayload = JSON.stringify({
      message: 'Hello, can you explain what photosynthesis is?',
      mode: 'general',
      subject: 'Science'
    });
    const chatRes = await request({
      hostname: host,
      path: '/api/chat/message',
      method: 'POST',
      headers: {
        'Origin': origin,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(chatPayload),
        'Cookie': cookieHeader || '',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    }, chatPayload);

    console.log('Chat status:', chatRes.statusCode);
    console.log('Chat body:', chatRes.body);
  } catch (err) {
    console.error('Chat error:', err);
  }

  console.log('\n=== TEST 6: GET /api/chat/conversations ===');
  let convId = null;
  try {
    const convRes = await request({
      hostname: host,
      path: '/api/chat/conversations',
      method: 'GET',
      headers: {
        'Origin': origin,
        'Cookie': cookieHeader || '',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    console.log('Get conversations status:', convRes.statusCode);
    console.log('Get conversations body:', convRes.body);
    try {
      const parsed = JSON.parse(convRes.body);
      if (parsed.conversations && parsed.conversations.length > 0) {
        convId = parsed.conversations[0]._id;
      }
    } catch {}
  } catch (err) {
    console.error('Get conversations error:', err);
  }

  if (convId) {
    console.log('\n=== TEST 7: DELETE /api/chat/conversations/' + convId + ' ===');
    try {
      const delRes = await request({
        hostname: host,
        path: '/api/chat/conversations/' + convId,
        method: 'DELETE',
        headers: {
          'Origin': origin,
          'Cookie': cookieHeader || '',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      console.log('Delete conversation status:', delRes.statusCode);
      console.log('Delete conversation body:', delRes.body);
    } catch (err) {
      console.error('Delete conversation error:', err);
    }
  }

  console.log('\n=== TEST 8: POST /api/materials/upload (Multipart PDF) ===');
  try {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const sampleText = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj 4 0 obj<</Length 44>>stream\nBT\n/F1 12 Tf\n100 700 Td\n(Plant Biology Chapter 1) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000214 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n308\n%%EOF';
    
    let postData = `--${boundary}\r\n`;
    postData += `Content-Disposition: form-data; name="title"\r\n\r\nPlant Biology Notes\r\n`;
    postData += `--${boundary}\r\n`;
    postData += `Content-Disposition: form-data; name="subject"\r\n\r\nScience\r\n`;
    postData += `--${boundary}\r\n`;
    postData += `Content-Disposition: form-data; name="file"; filename="sample.pdf"\r\n`;
    postData += `Content-Type: application/pdf\r\n\r\n`;
    postData += sampleText;
    postData += `\r\n--${boundary}--\r\n`;

    const uploadRes = await request({
      hostname: host,
      path: '/api/materials/upload',
      method: 'POST',
      headers: {
        'Origin': origin,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(postData),
        'Cookie': cookieHeader || '',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    }, postData);

    console.log('Upload material status:', uploadRes.statusCode);
    console.log('Upload material body:', uploadRes.body);
  } catch (err) {
    console.error('Upload material error:', err);
  }
})();
