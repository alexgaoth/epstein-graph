/**
 * DOJ Epstein document downloader.
 * Solves Akamai interstitial + age verification to download PDFs.
 */
import https from 'https';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOC_DIR = join(__dirname, '..', 'documents');

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

function toCookieStr(cookies) {
  return Object.entries(cookies).map(([k,v]) => k+'='+v).join('; ');
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function solveAkamai() {
  let allCookies = {};

  // Step 1: GET /epstein
  const r1 = await makeRequest({
    hostname: 'www.justice.gov',
    path: '/epstein',
    method: 'GET',
    headers: { 'accept': 'text/html', 'user-agent': UA }
  });
  Object.assign(allCookies, r1.cookies);

  // Solve interstitial challenge
  const iMatch = r1.data.match(/var i = (\d+);/);
  const jMatch = r1.data.match(/var j = i \+ Number\("(\d+)" \+ "(\d+)"\);/);
  const bmMatch = r1.data.match(/"bm-verify":\s*"([^"]+)"/);

  if (iMatch && jMatch && bmMatch) {
    const pow = parseInt(iMatch[1]) + Number(jMatch[1] + jMatch[2]);
    const body = JSON.stringify({ 'bm-verify': bmMatch[1], 'pow': pow });
    const r2 = await makeRequest({
      hostname: 'www.justice.gov',
      path: '/_sec/verify?provider=interstitial',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Cookie': toCookieStr(allCookies),
        'user-agent': UA,
        'origin': 'https://www.justice.gov',
        'referer': 'https://www.justice.gov/epstein',
      }
    }, body);
    Object.assign(allCookies, r2.cookies);
  }

  // Reload to get Queue-IT cookie
  const r3 = await makeRequest({
    hostname: 'www.justice.gov',
    path: '/epstein',
    method: 'GET',
    headers: {
      'accept': 'text/html',
      'user-agent': UA,
      'Cookie': toCookieStr(allCookies),
    }
  });
  Object.assign(allCookies, r3.cookies);

  // Handle second challenge if present
  if (r3.data.includes('bm-verify')) {
    const iM = r3.data.match(/var i = (\d+);/);
    const jM = r3.data.match(/var j = i \+ Number\("(\d+)" \+ "(\d+)"\);/);
    const bM = r3.data.match(/"bm-verify":\s*"([^"]+)"/);
    if (iM && jM && bM) {
      const pow2 = parseInt(iM[1]) + Number(jM[1] + jM[2]);
      const body2 = JSON.stringify({ 'bm-verify': bM[1], 'pow': pow2 });
      const r3b = await makeRequest({
        hostname: 'www.justice.gov',
        path: '/_sec/verify?provider=interstitial',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body2),
          'Cookie': toCookieStr(allCookies),
          'user-agent': UA,
          'origin': 'https://www.justice.gov',
          'referer': 'https://www.justice.gov/epstein',
        }
      }, body2);
      Object.assign(allCookies, r3b.cookies);

      const r3c = await makeRequest({
        hostname: 'www.justice.gov',
        path: '/epstein',
        method: 'GET',
        headers: { 'accept': 'text/html', 'user-agent': UA, 'Cookie': toCookieStr(allCookies) }
      });
      Object.assign(allCookies, r3c.cookies);
    }
  }

  // Add age verification cookie
  allCookies['justiceGovAgeVerified'] = 'true';

  console.log('Auth cookies acquired:', Object.keys(allCookies).join(', '));
  return allCookies;
}

async function downloadPDF(cookies, dataset, filename) {
  const path = `/epstein/files/DataSet%20${dataset}/${filename}.pdf`;
  const outDir = join(DOC_DIR, `dataset-${dataset}`);
  const outPath = join(outDir, `${filename}.pdf`);

  if (existsSync(outPath)) {
    const { statSync } = await import('fs');
    const size = statSync(outPath).size;
    if (size > 1000) {
      console.log(`  ${filename}.pdf: already exists (${(size/1024).toFixed(0)}KB), skip`);
      return true;
    }
  }

  await mkdir(outDir, { recursive: true });

  const r = await makeRequest({
    hostname: 'www.justice.gov',
    path: path,
    method: 'GET',
    headers: {
      'Cookie': toCookieStr(cookies),
      'user-agent': UA,
      'referer': 'https://www.justice.gov/epstein',
      'accept': 'application/pdf,*/*',
    }
  });

  // Follow redirect if needed
  if (r.status === 302 && r.headers['location']) {
    const loc = r.headers['location'];
    Object.assign(cookies, r.cookies);

    // If age-verify redirect, visit the age-verify page first
    if (loc.includes('age-verify')) {
      console.log(`  ${filename}: age verify redirect, following...`);
      const ageUrl = new URL('https://www.justice.gov' + loc);
      const dest = ageUrl.searchParams.get('destination') || path;

      // POST to age-verify to accept
      const ageBody = `destination=${encodeURIComponent(dest)}&confirm=1`;
      const ra = await makeRequest({
        hostname: 'www.justice.gov',
        path: '/age-verify',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(ageBody),
          'Cookie': toCookieStr(cookies),
          'user-agent': UA,
          'referer': 'https://www.justice.gov' + loc,
        }
      }, ageBody);
      Object.assign(cookies, ra.cookies);

      // Try download again after age verify
      const r2 = await makeRequest({
        hostname: 'www.justice.gov',
        path: path,
        method: 'GET',
        headers: {
          'Cookie': toCookieStr(cookies),
          'user-agent': UA,
          'referer': 'https://www.justice.gov/epstein',
          'accept': 'application/pdf,*/*',
        }
      });

      if (r2.status === 200 && r2.buffer.length > 1000) {
        await writeFile(outPath, r2.buffer);
        console.log(`  ${filename}.pdf: downloaded (${(r2.buffer.length/1024).toFixed(0)}KB)`);
        return true;
      }

      // If still redirecting, try following
      if (r2.status === 302) {
        const loc2 = r2.headers['location'];
        if (loc2 && loc2.startsWith('http')) {
          const u = new URL(loc2);
          const r3 = await makeRequest({
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: 'GET',
            headers: {
              'Cookie': toCookieStr(cookies),
              'user-agent': UA,
            }
          });
          if (r3.status === 200 && r3.buffer.length > 1000) {
            await writeFile(outPath, r3.buffer);
            console.log(`  ${filename}.pdf: downloaded via redirect (${(r3.buffer.length/1024).toFixed(0)}KB)`);
            return true;
          }
        }
      }
    }

    console.log(`  ${filename}.pdf: FAILED (redirect to ${loc.substring(0,100)})`);
    return false;
  }

  if (r.status === 200 && r.buffer.length > 1000) {
    await writeFile(outPath, r.buffer);
    console.log(`  ${filename}.pdf: downloaded (${(r.buffer.length/1024).toFixed(0)}KB)`);
    return true;
  }

  console.log(`  ${filename}.pdf: FAILED (status ${r.status}, size ${r.buffer.length})`);
  return false;
}

async function main() {
  console.log('Solving Akamai challenge...');
  const cookies = await solveAkamai();

  console.log('\nDownloading PDFs...');
  const docs = [
    [9, 'EFTA00313694'],
    [9, 'EFTA00313681'],
    [9, 'EFTA00314009'],
    [9, 'EFTA01197073'],
    [9, 'EFTA01154475'],
    [9, 'EFTA00313875'],
    [9, 'EFTA00316653'],
    [10, 'EFTA01961642'],
    [11, 'EFTA02713574'],
    [11, 'EFTA02684444'],
  ];

  let success = 0;
  for (const [ds, fn] of docs) {
    const ok = await downloadPDF(cookies, ds, fn);
    if (ok) success++;
    // Be polite
    await new Promise(r => setTimeout(r, 800));
  }

  console.log(`\nDone: ${success}/${docs.length} documents downloaded`);
}

main().catch(e => console.error('ERROR:', e.message));
