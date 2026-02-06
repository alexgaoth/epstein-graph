/**
 * Tries alternative sources for missing portrait images.
 * Uses Wikimedia Commons category listings and file search.
 */
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMG_DIR = join(__dirname, '..', 'public', 'data', 'images');

// Try to find images via Wikimedia Commons categories
async function searchCommonsCategory(category) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=Category:${encodeURIComponent(category)}&gcmtype=file&gcmlimit=10&prop=imageinfo&iiprop=url&iiurlwidth=300&format=json&origin=*`;
  const r = await fetch(url);
  const d = await r.json();
  const pages = d.query?.pages;
  if (!pages) return null;

  for (const p of Object.values(pages)) {
    const title = p.title || '';
    // Skip PDFs, SVGs, webm, and non-portrait files
    if (/\.(pdf|svg|webm|ogg)/i.test(title)) continue;
    if (/signature|logo|flag|map|seal|building|center/i.test(title)) continue;
    const thumb = p.imageinfo?.[0]?.thumburl;
    if (thumb) return thumb;
  }
  return null;
}

// Try a direct file fetch from Wikimedia
async function tryDirectFile(filename) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url&iiurlwidth=300&format=json&origin=*`;
  const r = await fetch(url);
  const d = await r.json();
  const pages = d.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  if (page?.missing !== undefined) return null;
  return page?.imageinfo?.[0]?.thumburl || null;
}

async function downloadImage(imageUrl, filename) {
  try {
    const resp = await fetch(imageUrl);
    if (!resp.ok) return false;
    const buffer = Buffer.from(await resp.arrayBuffer());
    if (buffer.length < 500) return false; // too small, probably error page
    await writeFile(join(IMG_DIR, filename), buffer);
    console.log(`  Downloaded: ${filename} (${buffer.length} bytes)`);
    return true;
  } catch (e) {
    console.log(`  Error: ${e.message}`);
    return false;
  }
}

const ATTEMPTS = [
  // id, category, direct filenames to try
  ['giuffre', 'Virginia Giuffre', ['Virginia Giuffre.jpg', 'Virginia Roberts Giuffre.jpg']],
  ['leon_black', 'Leon Black', ['Leon Black.jpg', 'Leon Black cropped.jpg']],
  ['pritzker', null, ['Tom Pritzker.jpg', 'Thomas Pritzker.jpg']],
  ['siegal', 'Peggy Siegal', ['Peggy Siegal.jpg']],
  ['brunel', 'Jean-Luc Brunel', ['Jean-Luc Brunel.jpg']],
  ['marcinkova', null, ['Nadia Marcinkova.jpg', 'Nadia Marcinko.jpg']],
  ['edwards', null, ['Bradley Edwards attorney.jpg']],
  ['bergman', 'Mickey Bergman', ['Mickey Bergman.jpg']],
];

async function main() {
  console.log('Searching for additional images...\n');

  for (const [id, category, filenames] of ATTEMPTS) {
    const outFile = `${id}.jpg`;
    if (existsSync(join(IMG_DIR, outFile)) || existsSync(join(IMG_DIR, `${id}.png`)) || existsSync(join(IMG_DIR, `${id}.JPG`))) {
      console.log(`${id}: already exists, skipping`);
      continue;
    }

    console.log(`${id}: searching...`);

    // Try direct filenames first
    for (const fn of filenames) {
      const url = await tryDirectFile(fn);
      if (url) {
        const ext = url.match(/\.(jpg|jpeg|png)/i)?.[1] || 'jpg';
        if (await downloadImage(url, `${id}.${ext}`)) {
          break;
        }
      }
    }

    // If still not found, try category
    if (category && !existsSync(join(IMG_DIR, outFile)) && !existsSync(join(IMG_DIR, `${id}.png`))) {
      const url = await searchCommonsCategory(category);
      if (url) {
        const ext = url.match(/\.(jpg|jpeg|png)/i)?.[1] || 'jpg';
        await downloadImage(url, `${id}.${ext}`);
      } else {
        console.log(`  No image found for ${id}`);
      }
    }
  }

  // List final state
  console.log('\n--- Final images ---');
  const { readdirSync } = await import('fs');
  const files = readdirSync(IMG_DIR).filter(f => !f.startsWith('_') && !f.startsWith('default'));
  for (const f of files) {
    console.log(`  ${f}`);
  }
}

main().catch(console.error);
