const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

(async () => {
  try {
    console.log('--- 1. Testing Live Backend (/api/health) ---');
    const health = await fetchUrl('https://shs-ngo.onrender.com/api/health');
    console.log('Backend Health Status:', health.status);
    console.log('Backend Health Body:', health.body);

    console.log('\n--- 2. Fetching Live Frontend (https://shs-ai-v2.vercel.app) ---');
    const frontend = await fetchUrl('https://shs-ai-v2.vercel.app');
    console.log('Frontend Status:', frontend.status);
    
    // Find all .js files
    const regex = /src=["'](\/assets\/[^"']+\.js)["']/g;
    let match;
    const jsFiles = [];
    while ((match = regex.exec(frontend.body)) !== null) {
      jsFiles.push(match[1]);
    }
    console.log('Referenced JS files in HTML:', jsFiles);

    for (const jsFile of jsFiles) {
      const fullUrl = 'https://shs-ai-v2.vercel.app' + jsFile;
      console.log('\nAnalyzing bundle:', fullUrl);
      const jsContent = await fetchUrl(fullUrl);
      const text = jsContent.body;
      
      const containsOnrender = text.includes('onrender.com');
      const containsLocalhost = text.includes('localhost:5000');
      const containsApi = text.includes('/api');
      console.log('Contains onrender.com:', containsOnrender);
      console.log('Contains localhost:5000:', containsLocalhost);
      console.log('Contains /api:', containsApi);

      // Search for baseURL pattern or axios create
      const apiMatches = text.match(/baseURL:[^,}\)]+/g);
      if (apiMatches) {
        console.log('Found baseURL occurrences:', apiMatches);
      }

      // Search for all URLs in bundle
      const allUrls = text.match(/https?:\/\/[a-zA-Z0-9.\-_\:\/]+/g) || [];
      const uniqueUrls = [...new Set(allUrls)];
      console.log('URLs in bundle:', uniqueUrls);
    }
  } catch (err) {
    console.error('Error:', err);
  }
})();
