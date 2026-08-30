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
    if (body) req.write(body);
    req.end();
  });
}

(async () => {
  const host = 'shs-ngo.onrender.com';
  const origin = 'https://shs-ai-v2.vercel.app';

  // 1. Create unique user via login or register
  const testEmail = `diag_${Date.now()}@example.com`;
  const testUser = {
    username: `diag_${Date.now()}`,
    email: testEmail,
    password: 'Password123!',
    fullName: { firstName: 'Diag', lastName: 'User' }
  };

  console.log('1. Attempting Register...');
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
  console.log('Register response:', regRes.statusCode, regRes.body);

  console.log('\n2. Attempting Login...');
  const loginPayload = JSON.stringify({ identifier: testEmail, password: 'Password123!' });
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
  console.log('Login response:', loginRes.statusCode, loginRes.body);

  let token = null;
  let cookie = null;
  try {
    const p = JSON.parse(loginRes.body);
    token = p.token;
    if (loginRes.headers['set-cookie']) {
      cookie = loginRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
    }
  } catch {}

  console.log('Token extracted:', Boolean(token), 'Cookie extracted:', Boolean(cookie));

  if (token) {
    console.log('\n3. Testing POST /api/chat/message with verbose error tracking...');
    const chatPayload = JSON.stringify({
      message: 'Hello, what is 2+2?',
      mode: 'general',
      subject: 'Mathematics'
    });
    const chatRes = await request({
      hostname: host,
      path: '/api/chat/message',
      method: 'POST',
      headers: {
        'Origin': origin,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(chatPayload),
        'Authorization': `Bearer ${token}`,
        'Cookie': cookie || ''
      }
    }, chatPayload);
    console.log('Chat status:', chatRes.statusCode, 'body:', chatRes.body);

    console.log('\n4. Testing GET /api/chat/conversations...');
    const convRes = await request({
      hostname: host,
      path: '/api/chat/conversations',
      method: 'GET',
      headers: {
        'Origin': origin,
        'Authorization': `Bearer ${token}`,
        'Cookie': cookie || ''
      }
    });
    console.log('Conversations:', convRes.statusCode, convRes.body);

    let convId = null;
    try {
      const parsed = JSON.parse(convRes.body);
      if (parsed.conversations?.length) {
        convId = parsed.conversations[0]._id;
      }
    } catch {}

    if (convId) {
      console.log('\n5. Testing DELETE /api/chat/conversations/' + convId + '...');
      const delRes = await request({
        hostname: host,
        path: `/api/chat/conversations/${convId}`,
        method: 'DELETE',
        headers: {
          'Origin': origin,
          'Authorization': `Bearer ${token}`,
          'Cookie': cookie || ''
        }
      });
      console.log('Delete status:', delRes.statusCode, delRes.body);
    }

    console.log('\n6. Testing POST /api/practice/quiz/generate...');
    const quizPayload = JSON.stringify({
      subject: 'Science',
      topic: 'Plants',
      numQuestions: 3
    });
    const quizRes = await request({
      hostname: host,
      path: '/api/practice/quiz/generate',
      method: 'POST',
      headers: {
        'Origin': origin,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(quizPayload),
        'Authorization': `Bearer ${token}`,
        'Cookie': cookie || ''
      }
    }, quizPayload);
    console.log('Quiz generation status:', quizRes.statusCode, quizRes.body);
  }
})();
