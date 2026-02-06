/**
 * Download Wikipedia portraits for 20 famous Epstein-connected individuals.
 * Uses the Wikipedia API pageimages endpoint for free-use thumbnails.
 */
import { writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMG_DIR = join(__dirname, '..', 'public', 'data', 'images');

const PEOPLE = [
  { id: 'prince_andrew',  wiki: 'Prince_Andrew,_Duke_of_York', gender: 'male' },
  { id: 'clinton',        wiki: 'Bill_Clinton',                  gender: 'male' },
  { id: 'trump',          wiki: 'Donald_Trump',                  gender: 'male' },
  { id: 'gates',          wiki: 'Bill_Gates',                    gender: 'male' },
  { id: 'spacey',         wiki: 'Kevin_Spacey',                  gender: 'male' },
  { id: 'chris_tucker',   wiki: 'Chris_Tucker',                  gender: 'male' },
  { id: 'woody_allen',    wiki: 'Woody_Allen',                   gender: 'male' },
  { id: 'naomi_campbell',  wiki: 'Naomi_Campbell',               gender: 'female' },
  { id: 'hawking',        wiki: 'Stephen_Hawking',               gender: 'male' },
  { id: 'branson',        wiki: 'Richard_Branson',               gender: 'male' },
  { id: 'copperfield',    wiki: 'David_Copperfield_(illusionist)', gender: 'male' },
  { id: 'glenn_dubin',    wiki: 'Glenn_Dubin',                   gender: 'male' },
  { id: 'george_mitchell', wiki: 'George_J._Mitchell',           gender: 'male' },
  { id: 'larry_summers',  wiki: 'Lawrence_Summers',              gender: 'male' },
  { id: 'musk',           wiki: 'Elon_Musk',                     gender: 'male' },
  { id: 'groening',       wiki: 'Matt_Groening',                 gender: 'male' },
  { id: 'sarah_ferguson', wiki: 'Sarah,_Duchess_of_York',        gender: 'female' },
  { id: 'mandelson',      wiki: 'Peter_Mandelson',               gender: 'male' },
  { id: 'mick_jagger',    wiki: 'Mick_Jagger',                   gender: 'male' },
  { id: 'reid_hoffman',   wiki: 'Reid_Hoffman',                  gender: 'male' },
];

async function getWikiThumb(wikiTitle) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(wikiTitle)}&prop=pageimages&pithumbsize=300&format=json&origin=*`;
  try {
    const r = await fetch(url);
    const d = await r.json();
    const pages = d.query?.pages;
    if (pages == null) return null;
    const page = Object.values(pages)[0];
    return page?.thumbnail?.source || null;
  } catch {
    return null;
  }
}

async function downloadImage(imageUrl, filename) {
  try {
    const resp = await fetch(imageUrl);
    if (resp.ok === false) return false;
    const buffer = Buffer.from(await resp.arrayBuffer());
    if (buffer.length < 500) return false;
    await writeFile(join(IMG_DIR, filename), buffer);
    return buffer.length;
  } catch {
    return false;
  }
}

async function main() {
  console.log('Downloading portraits for 20 famous individuals...\n');

  let success = 0;
  const results = [];

  for (const person of PEOPLE) {
    // Check if already exists
    for (const ext of ['jpg', 'png', 'JPG', 'jpeg']) {
      if (existsSync(join(IMG_DIR, `${person.id}.${ext}`))) {
        console.log(`${person.id}: already exists`);
        results.push({ ...person, image: `${person.id}.${ext}` });
        success++;
        continue;
      }
    }

    if (results.find(r => r.id === person.id)) continue;

    const thumbUrl = await getWikiThumb(person.wiki);
    if (thumbUrl) {
      const ext = thumbUrl.match(/\.(jpg|jpeg|png)/i)?.[1]?.toLowerCase() || 'jpg';
      const filename = `${person.id}.${ext}`;
      const size = await downloadImage(thumbUrl, filename);
      if (size) {
        console.log(`${person.id}: downloaded ${filename} (${(size/1024).toFixed(0)}KB)`);
        results.push({ ...person, image: filename });
        success++;
      } else {
        console.log(`${person.id}: download failed`);
        results.push({ ...person, image: null });
      }
    } else {
      console.log(`${person.id}: no Wikipedia image`);
      results.push({ ...person, image: null });
    }

    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nDownloaded: ${success}/${PEOPLE.length}`);
  console.log('\nResults JSON:');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
