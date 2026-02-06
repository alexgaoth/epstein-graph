/**
 * Downloads portrait images for graph nodes from Wikipedia.
 * Uses the Wikipedia API (pageimages) to get thumbnails.
 * Falls back to default avatars for people without Wikipedia articles.
 */
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMG_DIR = join(__dirname, '..', 'public', 'data', 'images');
const THUMB_SIZE = 300;

// Map: node id → { wiki: Wikipedia article title, gender: 'male'|'female' }
const PEOPLE = {
  epstein:      { wiki: 'Jeffrey Epstein', gender: 'male' },
  maxwell:      { wiki: 'Ghislaine Maxwell', gender: 'female' },
  kellen:       { wiki: null, gender: 'female' },
  marcinkova:   { wiki: 'Nadia Marcinko', gender: 'female' },
  groff:        { wiki: null, gender: 'female' },
  ross:         { wiki: null, gender: 'female' },
  brunel:       { wiki: 'Jean-Luc Brunel', gender: 'male' },
  visoski:      { wiki: null, gender: 'male' },
  rodgers:      { wiki: null, gender: 'male' },
  alessi:       { wiki: null, gender: 'male' },
  rodriguez:    { wiki: null, gender: 'male' },
  robson:       { wiki: null, gender: 'female' },
  giuffre:      { wiki: 'Virginia Giuffre', gender: 'female' },
  farmer:       { wiki: null, gender: 'female' },
  ward:         { wiki: null, gender: 'female' }, // Annie Farmer
  ransome:      { wiki: 'Sarah Ransome', gender: 'female' },
  araoz:        { wiki: null, gender: 'female' },
  edwards:      { wiki: 'Bradley Edwards (attorney)', gender: 'male' },
  villafana:    { wiki: null, gender: 'female' },
  comey_m:      { wiki: null, gender: 'female' },
  strauss:      { wiki: 'Audrey Strauss', gender: 'female' },
  karyna:       { wiki: null, gender: 'female' },
  fiona:        { wiki: null, gender: 'female' },
  kahn:         { wiki: null, gender: 'male' },
  bella:        { wiki: null, gender: 'female' },
  bussue:       { wiki: null, gender: 'male' },
  fontanilla:   { wiki: null, gender: 'male' },
  richardson:   { wiki: 'Bill Richardson', gender: 'male' },
  siegal:       { wiki: null, gender: 'female' },
  pritzker:     { wiki: 'Tom Pritzker', gender: 'male' },
  leon_black:   { wiki: 'Leon Black', gender: 'male' },
  wexner:       { wiki: 'Les Wexner', gender: 'male' },
  indyke:       { wiki: null, gender: 'male' },
  joslin:       { wiki: null, gender: 'male' },
  dershowitz:   { wiki: 'Alan Dershowitz', gender: 'male' },
  bergman:      { wiki: 'Mickey Bergman', gender: 'male' },
  pickett:      { wiki: null, gender: 'male' },
  dasha:        { wiki: null, gender: 'female' },
  lundeg:       { wiki: null, gender: 'male' },
  barak:        { wiki: 'Ehud Barak', gender: 'male' },
  fenn:         { wiki: null, gender: 'male' },
};

async function fetchWikiImage(articleTitle) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(articleTitle)}&prop=pageimages&pithumbsize=${THUMB_SIZE}&format=json&origin=*`;
  const resp = await fetch(url);
  const data = await resp.json();
  const pages = data.query?.pages;
  if (!pages) return null;

  const page = Object.values(pages)[0];
  return page?.thumbnail?.source || null;
}

async function downloadImage(imageUrl, filename) {
  const resp = await fetch(imageUrl);
  if (!resp.ok) {
    console.log(`  FAILED (${resp.status}) for ${filename}`);
    return false;
  }
  const buffer = Buffer.from(await resp.arrayBuffer());
  await writeFile(join(IMG_DIR, filename), buffer);
  console.log(`  Downloaded: ${filename} (${buffer.length} bytes)`);
  return true;
}

async function main() {
  if (!existsSync(IMG_DIR)) {
    await mkdir(IMG_DIR, { recursive: true });
  }

  const results = {};
  const wikiPeople = Object.entries(PEOPLE).filter(([_, v]) => v.wiki);

  console.log(`Fetching images for ${wikiPeople.length} people from Wikipedia...\n`);

  // Batch fetch in groups of 5
  for (let i = 0; i < wikiPeople.length; i += 5) {
    const batch = wikiPeople.slice(i, i + 5);
    const promises = batch.map(async ([id, { wiki, gender }]) => {
      console.log(`Looking up: ${wiki} (${id})`);
      try {
        const imgUrl = await fetchWikiImage(wiki);
        if (imgUrl) {
          // Determine extension from URL
          const ext = imgUrl.match(/\.(jpg|jpeg|png|svg|gif)/i)?.[1] || 'jpg';
          const filename = `${id}.${ext}`;
          const ok = await downloadImage(imgUrl, filename);
          if (ok) {
            results[id] = { image: filename, gender };
            return;
          }
        }
        console.log(`  No image found for ${wiki}`);
        results[id] = { image: null, gender };
      } catch (err) {
        console.log(`  Error for ${wiki}: ${err.message}`);
        results[id] = { image: null, gender };
      }
    });
    await Promise.all(promises);
  }

  // Add non-wiki people with just gender info
  for (const [id, { wiki, gender }] of Object.entries(PEOPLE)) {
    if (!wiki) {
      results[id] = { image: null, gender };
    }
  }

  console.log(`\n--- RESULTS ---`);
  let found = 0;
  let missing = 0;
  for (const [id, { image, gender }] of Object.entries(results)) {
    if (image) {
      console.log(`  ${id}: ${image}`);
      found++;
    } else {
      console.log(`  ${id}: default-${gender}.svg`);
      missing++;
    }
  }
  console.log(`\nFound: ${found}, Default: ${missing}, Total: ${found + missing}`);

  // Write results JSON for graph.json update
  await writeFile(
    join(IMG_DIR, '_image_map.json'),
    JSON.stringify(results, null, 2),
  );
  console.log(`\nWrote _image_map.json`);
}

main().catch(console.error);
