import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GRAPH_PATH = join(__dirname, '..', 'public', 'data', 'graph.json');

// Image files that exist + gender for every node
const NODE_META = {
  epstein:      { image: 'epstein.jpg', gender: 'male' },
  maxwell:      { image: 'maxwell.png', gender: 'female' },
  kellen:       { image: null, gender: 'female' },
  marcinkova:   { image: null, gender: 'female' },
  groff:        { image: null, gender: 'female' },
  ross:         { image: null, gender: 'female' },
  brunel:       { image: null, gender: 'male' },
  visoski:      { image: null, gender: 'male' },
  rodgers:      { image: null, gender: 'male' },
  alessi:       { image: null, gender: 'male' },
  rodriguez:    { image: null, gender: 'male' },
  robson:       { image: null, gender: 'female' },
  giuffre:      { image: null, gender: 'female' },
  farmer:       { image: null, gender: 'female' },
  ward:         { image: null, gender: 'female' },
  ransome:      { image: null, gender: 'female' },
  araoz:        { image: null, gender: 'female' },
  edwards:      { image: null, gender: 'male' },
  villafana:    { image: null, gender: 'female' },
  comey_m:      { image: null, gender: 'female' },
  strauss:      { image: 'strauss.jpg', gender: 'female' },
  karyna:       { image: null, gender: 'female' },
  fiona:        { image: null, gender: 'female' },
  kahn:         { image: null, gender: 'male' },
  bella:        { image: null, gender: 'female' },
  bussue:       { image: null, gender: 'male' },
  fontanilla:   { image: null, gender: 'male' },
  richardson:   { image: 'richardson.jpg', gender: 'male' },
  siegal:       { image: null, gender: 'female' },
  pritzker:     { image: null, gender: 'male' },
  leon_black:   { image: 'leon_black.jpg', gender: 'male' },
  wexner:       { image: 'wexner.JPG', gender: 'male' },
  indyke:       { image: null, gender: 'male' },
  joslin:       { image: null, gender: 'male' },
  dershowitz:   { image: 'dershowitz.jpg', gender: 'male' },
  bergman:      { image: null, gender: 'male' },
  pickett:      { image: null, gender: 'male' },
  dasha:        { image: null, gender: 'female' },
  lundeg:       { image: null, gender: 'male' },
  barak:        { image: 'barak.jpg', gender: 'male' },
  fenn:         { image: null, gender: 'male' },
};

async function main() {
  const raw = await readFile(GRAPH_PATH, 'utf-8');
  const data = JSON.parse(raw);

  let updated = 0;
  for (const node of data.nodes) {
    const meta = NODE_META[node.id];
    if (meta) {
      node.gender = meta.gender;
      if (meta.image) {
        node.image = meta.image;
      }
      updated++;
    } else {
      console.log(`WARNING: No meta for ${node.id}`);
    }
  }

  await writeFile(GRAPH_PATH, JSON.stringify(data, null, 2) + '\n');
  console.log(`Updated ${updated} nodes in graph.json`);
}

main().catch(console.error);
