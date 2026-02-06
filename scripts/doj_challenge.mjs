import https from 'https';

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let chunks = [];
      const cookies = {};
      (res.headers['set-cookie'] || []).forEach(c => {
        const [nameVal] = c.split(';');
        const eqIdx = nameVal.indexOf('=');
        const name = nameVal.substring(0, eqIdx).trim();
        const val = nameVal.substring(eqIdx + 1);
        cookies[name] = val;
      });
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve({ status: res.statusCode, data: buf.toString('utf8'), buffer: buf, cookies, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function cookieStr(cookies) {
  return Object.entries(cookies).map(([k,v]) => k+'='+v).join('; ');
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function main() {
  let allCookies = {};

  // Step 1: GET /epstein -> Akamai challenge
  console.log('--- Step 1: GET /epstein ---');
  const r1 = await makeRequest({
    hostname: 'www.justice.gov',
    path: '/epstein',
    method: 'GET',
    headers: { 'accept': 'text/html', 'user-agent': UA }
  });
  console.log('Status:', r1.status, '| Cookies:', Object.keys(r1.cookies));
  Object.assign(allCookies, r1.cookies);

  // Extract challenge
  const iMatch = r1.data.match(/var i = (\d+);/);
  const jMatch = r1.data.match(/var j = i \+ Number\("(\d+)" \+ "(\d+)"\);/);
  const bmMatch = r1.data.match(/"bm-verify":\s*"([^"]+)"/);

  if (iMatch == null || jMatch == null || bmMatch == null) {
    console.log('No challenge found. Page may have loaded directly.');
    console.log(r1.data.substring(0, 300));
    return;
  }

  const pow = parseInt(iMatch[1]) + Number(jMatch[1] + jMatch[2]);
  console.log('POW computed:', pow);

  // Step 2: POST /_sec/verify
  console.log('\n--- Step 2: POST /_sec/verify ---');
  const postBody = JSON.stringify({ 'bm-verify': bmMatch[1], 'pow': pow });
  const r2 = await makeRequest({
    hostname: 'www.justice.gov',
    path: '/_sec/verify?provider=interstitial',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postBody),
      'Cookie': cookieStr(allCookies),
      'user-agent': UA,
      'origin': 'https://www.justice.gov',
      'referer': 'https://www.justice.gov/epstein',
    }
  }, postBody);
  console.log('Status:', r2.status, '| Response:', r2.data);
  Object.assign(allCookies, r2.cookies);
  console.log('All cookies so far:', Object.keys(allCookies));

  // Step 3: Reload /epstein (the redirect the challenge tells us to do)
  console.log('\n--- Step 3: GET /epstein (reload) ---');
  const r3 = await makeRequest({
    hostname: 'www.justice.gov',
    path: '/epstein',
    method: 'GET',
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'user-agent': UA,
      'Cookie': cookieStr(allCookies),
      'referer': 'https://www.justice.gov/epstein',
    }
  });
  console.log('Status:', r3.status, '| Size:', r3.data.length);
  console.log('New cookies:', Object.keys(r3.cookies));
  Object.assign(allCookies, r3.cookies);

  // Check if we got the real page or another challenge
  if (r3.data.includes('bm-verify')) {
    console.log('Got another Akamai challenge. Solving...');
    const iMatch2 = r3.data.match(/var i = (\d+);/);
    const jMatch2 = r3.data.match(/var j = i \+ Number\("(\d+)" \+ "(\d+)"\);/);
    const bmMatch2 = r3.data.match(/"bm-verify":\s*"([^"]+)"/);
    if (iMatch2 && jMatch2 && bmMatch2) {
      const pow2 = parseInt(iMatch2[1]) + Number(jMatch2[1] + jMatch2[2]);
      const postBody2 = JSON.stringify({ 'bm-verify': bmMatch2[1], 'pow': pow2 });
      const r3b = await makeRequest({
        hostname: 'www.justice.gov',
        path: '/_sec/verify?provider=interstitial',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postBody2),
          'Cookie': cookieStr(allCookies),
          'user-agent': UA,
          'origin': 'https://www.justice.gov',
          'referer': 'https://www.justice.gov/epstein',
        }
      }, postBody2);
      console.log('Challenge 2 status:', r3b.status, '| Response:', r3b.data);
      Object.assign(allCookies, r3b.cookies);

      // Try reload again
      const r3c = await makeRequest({
        hostname: 'www.justice.gov',
        path: '/epstein',
        method: 'GET',
        headers: {
          'accept': 'text/html',
          'user-agent': UA,
          'Cookie': cookieStr(allCookies),
        }
      });
      console.log('Reload 2 status:', r3c.status, '| Size:', r3c.data.length);
      Object.assign(allCookies, r3c.cookies);
    }
  }

  if (r3.data.includes('Queue-it') || r3.data.includes('queue-it')) {
    console.log('Queue-IT detected in page');
  }

  // Print page title
  const titleMatch = r3.data.match(/<title[^>]*>([^<]+)</i);
  if (titleMatch) console.log('Page title:', titleMatch[1]);

  console.log('\nFinal cookie names:', Object.keys(allCookies));

  // Step 4: Search API
  console.log('\n--- Step 4: Search API ---');
  const r4 = await makeRequest({
    hostname: 'www.justice.gov',
    path: '/multimedia-search?keys=prince+andrew&page=1',
    method: 'GET',
    headers: {
      'accept': '*/*',
      'Cookie': cookieStr(allCookies),
      'user-agent': UA,
      'referer': 'https://www.justice.gov/epstein',
      'x-queueit-ajaxpageurl': 'https%3A%2F%2Fwww.justice.gov%2Fepstein',
      'x-requested-with': 'XMLHttpRequest',
    }
  });
  console.log('Status:', r4.status, '| Size:', r4.data.length);

  try {
    const json = JSON.parse(r4.data);
    console.log('SUCCESS - Total hits:', json.hits?.total?.value);
    if (json.hits?.hits) {
      for (let idx = 0; idx < Math.min(5, json.hits.hits.length); idx++) {
        const hit = json.hits.hits[idx];
        console.log(`  [${idx+1}] ${hit._source?.ORIGIN_FILE_NAME}`);
        const hl = hit.highlight?.content || [];
        if (hl.length > 0) console.log('      ', hl[0].substring(0, 150));
      }
    }
  } catch {
    console.log('Response preview:', r4.data.substring(0, 500));
  }

  // Step 5: Try direct PDF download with redirect follow
  console.log('\n--- Step 5: PDF download ---');
  const r5 = await makeRequest({
    hostname: 'www.justice.gov',
    path: '/epstein/files/DataSet%209/EFTA00313694.pdf',
    method: 'GET',
    headers: {
      'Cookie': cookieStr(allCookies),
      'user-agent': UA,
      'referer': 'https://www.justice.gov/epstein',
    }
  });
  console.log('Status:', r5.status);
  if (r5.status === 302) {
    console.log('Redirect to:', r5.headers['location']);
  }
  console.log('Content-Type:', r5.headers['content-type']);
  console.log('Response size:', r5.data.length);
}

main().catch(e => console.error('ERROR:', e.message));
