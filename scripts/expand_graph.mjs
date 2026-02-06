/**
 * Expand graph.json with 20 famous Epstein-connected individuals.
 * All connections sourced from DOJ released files, court documents, flight logs, and public records.
 */
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GRAPH_PATH = join(__dirname, '..', 'public', 'data', 'graph.json');

const NEW_NODES = [
  {
    id: 'prince_andrew',
    label: 'Prince Andrew',
    role: 'Duke of York — named in Giuffre lawsuit, photographed with victim',
    group: 'international',
    gender: 'male',
    image: 'prince_andrew.jpg',
  },
  {
    id: 'clinton',
    label: 'Bill Clinton',
    role: 'Former US President — 17+ flights on Epstein plane per logs',
    group: 'associate',
    gender: 'male',
    image: 'clinton.jpg',
  },
  {
    id: 'trump',
    label: 'Donald Trump',
    role: 'Former US President — 7+ flights on Epstein jet in 1990s per logs',
    group: 'associate',
    gender: 'male',
    image: 'trump.jpg',
  },
  {
    id: 'gates',
    label: 'Bill Gates',
    role: 'Microsoft co-founder — multiple meetings with Epstein 2011-2014',
    group: 'associate',
    gender: 'male',
    image: 'gates.jpg',
  },
  {
    id: 'spacey',
    label: 'Kevin Spacey',
    role: 'Actor — flew on Epstein plane to Africa with Clinton',
    group: 'associate',
    gender: 'male',
    image: 'spacey.jpg',
  },
  {
    id: 'chris_tucker',
    label: 'Chris Tucker',
    role: 'Comedian — flew on Epstein plane to Africa with Clinton',
    group: 'associate',
    gender: 'male',
    image: 'chris_tucker.jpg',
  },
  {
    id: 'woody_allen',
    label: 'Woody Allen',
    role: 'Director — 9+ trips documented with Epstein per calendar',
    group: 'associate',
    gender: 'male',
    image: 'woody_allen.jpg',
  },
  {
    id: 'naomi_campbell',
    label: 'Naomi Campbell',
    role: 'Model — in flight logs, attended Epstein events',
    group: 'associate',
    gender: 'female',
    image: 'naomi_campbell.jpg',
  },
  {
    id: 'hawking',
    label: 'Stephen Hawking',
    role: 'Physicist — attended conference on Epstein\'s island 2006',
    group: 'associate',
    gender: 'male',
    image: 'hawking.jpg',
  },
  {
    id: 'branson',
    label: 'Richard Branson',
    role: 'Virgin Group founder — named in DOJ files, Epstein emails',
    group: 'associate',
    gender: 'male',
    image: 'branson.jpg',
  },
  {
    id: 'copperfield',
    label: 'David Copperfield',
    role: 'Illusionist — named in Giuffre testimony, visited island',
    group: 'associate',
    gender: 'male',
    image: 'copperfield.jpg',
  },
  {
    id: 'glenn_dubin',
    label: 'Glenn Dubin',
    role: 'Hedge fund manager — named in Giuffre allegations',
    group: 'associate',
    gender: 'male',
    image: 'glenn_dubin.jpg',
  },
  {
    id: 'george_mitchell',
    label: 'George Mitchell',
    role: 'Former Senate Majority Leader — named in Giuffre testimony',
    group: 'associate',
    gender: 'male',
    image: 'george_mitchell.jpg',
  },
  {
    id: 'larry_summers',
    label: 'Larry Summers',
    role: 'Former Treasury Secretary — flew on Epstein plane, meetings documented',
    group: 'associate',
    gender: 'male',
    image: 'larry_summers.jpg',
  },
  {
    id: 'musk',
    label: 'Elon Musk',
    role: 'Tesla CEO — email requesting "wild" island party, photographed with Maxwell',
    group: 'associate',
    gender: 'male',
    image: 'musk.jpg',
  },
  {
    id: 'groening',
    label: 'Matt Groening',
    role: 'Simpsons creator — Giuffre allegation on Epstein plane',
    group: 'associate',
    gender: 'male',
    image: 'groening.jpg',
  },
  {
    id: 'sarah_ferguson',
    label: 'Sarah Ferguson',
    role: 'Duchess of York — received $18K from Epstein via Prince Andrew',
    group: 'international',
    gender: 'female',
    image: 'sarah_ferguson.jpg',
  },
  {
    id: 'mandelson',
    label: 'Peter Mandelson',
    role: 'British politician — named in Epstein files, meetings documented',
    group: 'international',
    gender: 'male',
    image: 'mandelson.jpg',
  },
  {
    id: 'mick_jagger',
    label: 'Mick Jagger',
    role: 'Rolling Stones frontman — name appears in DOJ file release',
    group: 'associate',
    gender: 'male',
    image: 'mick_jagger.jpg',
  },
  {
    id: 'reid_hoffman',
    label: 'Reid Hoffman',
    role: 'LinkedIn co-founder — met Epstein post-conviction, apologized publicly',
    group: 'associate',
    gender: 'male',
    image: 'reid_hoffman.jpg',
  },
];

const NEW_EDGES = [
  // Prince Andrew
  {
    id: 'e-epstein-prince_andrew',
    source: 'epstein',
    target: 'prince_andrew',
    connection_type: 'named in document',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'DOJ Files — Prince Andrew References (hundreds of mentions)',
    quote_snippet: 'Prince Andrew named hundreds of times across DOJ releases including private emails, Buckingham Palace dinner invitation, and photographs.',
  },
  {
    id: 'e-prince_andrew-giuffre',
    source: 'prince_andrew',
    target: 'giuffre',
    connection_type: 'named in document',
    doj_link: 'https://www.justice.gov/usao-sdny/united-states-v-ghislaine-maxwell',
    document_title: 'Giuffre v. Prince Andrew — Civil Lawsuit (settled 2022)',
    quote_snippet: 'Virginia Giuffre filed civil suit against Prince Andrew alleging sexual abuse. Settled out of court for reported $12M.',
  },
  {
    id: 'e-prince_andrew-maxwell',
    source: 'prince_andrew',
    target: 'maxwell',
    connection_type: 'named in document',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'DOJ Files — Maxwell-Andrew Social Connection',
    quote_snippet: 'Prince Andrew and Ghislaine Maxwell documented as longtime friends. Maxwell introduced Andrew to Epstein.',
  },
  {
    id: 'e-sarah_ferguson-prince_andrew',
    source: 'sarah_ferguson',
    target: 'prince_andrew',
    connection_type: 'financial record',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'DOJ Files — Ferguson-Epstein Payment',
    quote_snippet: 'Sarah Ferguson received $18,000 from Epstein via Prince Andrew to settle debts. Ferguson acknowledged payment publicly.',
  },
  // Clinton
  {
    id: 'e-epstein-clinton',
    source: 'epstein',
    target: 'clinton',
    connection_type: 'flight record',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'Flight Logs — Clinton Trips 2002-2003',
    quote_snippet: 'Flight logs document at least 17 flights with Clinton aboard to Siberia, Morocco, China, Armenia, and Africa.',
  },
  {
    id: 'e-clinton-maxwell',
    source: 'clinton',
    target: 'maxwell',
    connection_type: 'flight record',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'Flight Logs — Joint Passengers',
    quote_snippet: 'Ghislaine Maxwell documented on multiple flights alongside Bill Clinton on Epstein aircraft.',
  },
  // Trump
  {
    id: 'e-epstein-trump',
    source: 'epstein',
    target: 'trump',
    connection_type: 'flight record',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'Flight Logs — Trump Flights 1990s',
    quote_snippet: 'Trump flew at least seven times on Epstein private jet in four-year period in the 1990s per released flight logs.',
  },
  // Gates
  {
    id: 'e-epstein-gates',
    source: 'epstein',
    target: 'gates',
    connection_type: 'named in document',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'DOJ Files — Gates-Epstein Meetings',
    quote_snippet: 'Bill Gates met with Epstein multiple times between 2011-2014 after conviction. Gates later called meetings "a huge mistake."',
  },
  // Spacey + Chris Tucker (Africa trip with Clinton)
  {
    id: 'e-epstein-spacey',
    source: 'epstein',
    target: 'spacey',
    connection_type: 'flight record',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'Flight Logs — Africa Trip 2002',
    quote_snippet: 'Kevin Spacey documented on Epstein plane for Africa trip with Clinton, Chris Tucker in 2002.',
  },
  {
    id: 'e-epstein-chris_tucker',
    source: 'epstein',
    target: 'chris_tucker',
    connection_type: 'flight record',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'Flight Logs — Africa Trip 2002',
    quote_snippet: 'Chris Tucker documented on Epstein plane for Africa trip with Clinton, Kevin Spacey in 2002.',
  },
  {
    id: 'e-spacey-clinton',
    source: 'spacey',
    target: 'clinton',
    connection_type: 'flight record',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'Flight Logs — Africa Trip 2002',
    quote_snippet: 'Spacey and Clinton on same Epstein flights to Africa in 2002 per passenger manifests.',
  },
  {
    id: 'e-chris_tucker-clinton',
    source: 'chris_tucker',
    target: 'clinton',
    connection_type: 'flight record',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'Flight Logs — Africa Trip 2002',
    quote_snippet: 'Tucker and Clinton on same Epstein flights to Africa in 2002 per passenger manifests.',
  },
  // Woody Allen
  {
    id: 'e-epstein-woody_allen',
    source: 'epstein',
    target: 'woody_allen',
    connection_type: 'flight record',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'Flight Manifest & Calendar — Allen-Epstein Travel',
    quote_snippet: 'Woody Allen and wife on flight manifest March 23, 2014. Calendar documents 9+ trips including to NM ranch and Palm Beach.',
  },
  // Naomi Campbell
  {
    id: 'e-epstein-naomi_campbell',
    source: 'epstein',
    target: 'naomi_campbell',
    connection_type: 'flight record',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'Flight Logs — Campbell Appearances',
    quote_snippet: 'Naomi Campbell appears in Epstein flight logs and attended social events at Epstein properties.',
  },
  // Hawking
  {
    id: 'e-epstein-hawking',
    source: 'epstein',
    target: 'hawking',
    connection_type: 'named in document',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'DOJ Files — St. James Island Conference 2006',
    quote_snippet: 'Stephen Hawking attended a physics conference hosted by Epstein on his Caribbean island in 2006.',
  },
  // Branson
  {
    id: 'e-epstein-branson',
    source: 'epstein',
    target: 'branson',
    connection_type: 'named in document',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'DOJ Files — Epstein Emails Mentioning Branson',
    quote_snippet: 'Richard Branson named in Epstein documents and emails in DOJ file releases.',
  },
  // Copperfield
  {
    id: 'e-epstein-copperfield',
    source: 'epstein',
    target: 'copperfield',
    connection_type: 'testimony mention',
    doj_link: 'https://www.justice.gov/usao-sdny/united-states-v-ghislaine-maxwell',
    document_title: 'Giuffre Testimony — Copperfield Reference',
    quote_snippet: 'David Copperfield named in Virginia Giuffre testimony as having visited Epstein island.',
  },
  // Glenn Dubin
  {
    id: 'e-epstein-glenn_dubin',
    source: 'epstein',
    target: 'glenn_dubin',
    connection_type: 'named in document',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'DOJ Files — Dubin-Epstein Social Connection',
    quote_snippet: 'Glenn Dubin named in Giuffre allegations and documented as longtime Epstein associate. Dubin denied all allegations.',
  },
  {
    id: 'e-glenn_dubin-giuffre',
    source: 'glenn_dubin',
    target: 'giuffre',
    connection_type: 'testimony mention',
    doj_link: 'https://www.justice.gov/usao-sdny/united-states-v-ghislaine-maxwell',
    document_title: 'Giuffre Deposition — Dubin Allegations',
    quote_snippet: 'Virginia Giuffre named Glenn Dubin in sworn testimony. Dubin vehemently denied allegations.',
  },
  // George Mitchell
  {
    id: 'e-epstein-george_mitchell',
    source: 'epstein',
    target: 'george_mitchell',
    connection_type: 'named in document',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'DOJ Files — Mitchell-Epstein Connections',
    quote_snippet: 'Former Senate Majority Leader George Mitchell named in Giuffre testimony. Mitchell denied all allegations.',
  },
  {
    id: 'e-george_mitchell-giuffre',
    source: 'george_mitchell',
    target: 'giuffre',
    connection_type: 'testimony mention',
    doj_link: 'https://www.justice.gov/usao-sdny/united-states-v-ghislaine-maxwell',
    document_title: 'Giuffre Deposition — Mitchell Allegations',
    quote_snippet: 'Virginia Giuffre named George Mitchell under oath. Mitchell denied allegations through spokesperson.',
  },
  // Larry Summers
  {
    id: 'e-epstein-larry_summers',
    source: 'epstein',
    target: 'larry_summers',
    connection_type: 'flight record',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'Flight Logs — Summers Appearances',
    quote_snippet: 'Lawrence Summers appeared in Epstein flight logs and documented meetings post-conviction.',
  },
  // Musk
  {
    id: 'e-epstein-musk',
    source: 'epstein',
    target: 'musk',
    connection_type: 'named in document',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'DOJ Files — Musk Email to Epstein',
    quote_snippet: 'Email shows Musk expressing desire to attend "wild" party on Epstein island. Musk denies ever visiting the island.',
  },
  {
    id: 'e-musk-maxwell',
    source: 'musk',
    target: 'maxwell',
    connection_type: 'named in document',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'DOJ Files — Musk-Maxwell Photo',
    quote_snippet: 'Elon Musk photographed alongside Ghislaine Maxwell at 2014 event. Musk says it was a random photo.',
  },
  // Groening
  {
    id: 'e-epstein-groening',
    source: 'epstein',
    target: 'groening',
    connection_type: 'testimony mention',
    doj_link: 'https://www.justice.gov/usao-sdny/united-states-v-ghislaine-maxwell',
    document_title: 'Giuffre Testimony — Groening on Plane',
    quote_snippet: 'Virginia Giuffre testified about encounter with Matt Groening on Epstein plane.',
  },
  // Mandelson
  {
    id: 'e-epstein-mandelson',
    source: 'epstein',
    target: 'mandelson',
    connection_type: 'named in document',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'DOJ Files — Mandelson References',
    quote_snippet: 'Peter Mandelson named in Epstein files with meetings documented. Mandelson denied any impropriety.',
  },
  // Mick Jagger
  {
    id: 'e-epstein-mick_jagger',
    source: 'epstein',
    target: 'mick_jagger',
    connection_type: 'named in document',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'DOJ File Release — Jagger Name Appearance',
    quote_snippet: 'Mick Jagger name appears in DOJ file release documents.',
  },
  // Reid Hoffman
  {
    id: 'e-epstein-reid_hoffman',
    source: 'epstein',
    target: 'reid_hoffman',
    connection_type: 'named in document',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'DOJ Files — Hoffman-Epstein Post-Conviction Meetings',
    quote_snippet: 'Reid Hoffman met with Epstein after conviction. Hoffman later publicly apologized for the association.',
  },
  // Cross-connections
  {
    id: 'e-copperfield-giuffre',
    source: 'copperfield',
    target: 'giuffre',
    connection_type: 'testimony mention',
    doj_link: 'https://www.justice.gov/usao-sdny/united-states-v-ghislaine-maxwell',
    document_title: 'Giuffre Testimony — Copperfield Reference',
    quote_snippet: 'Virginia Giuffre referenced Copperfield in testimony about visitors to Epstein island.',
  },
  {
    id: 'e-prince_andrew-siegal',
    source: 'prince_andrew',
    target: 'siegal',
    connection_type: 'named in document',
    doj_link: 'https://www.justice.gov/epstein',
    document_title: 'DOJ Files — 2011 Epstein Mansion Event',
    quote_snippet: 'Prince Andrew attended 2011 event at Epstein Manhattan mansion organized by Peggy Siegal.',
  },
];

async function main() {
  const raw = await readFile(GRAPH_PATH, 'utf-8');
  const data = JSON.parse(raw);

  // Add new group
  if (data.groups.celebrity == null) {
    data.groups.celebrity = {
      color: '#facc15',
      label: 'Celebrity / Public Figure',
    };
  }

  const existingNodeIds = new Set(data.nodes.map(n => n.id));
  const existingEdgeIds = new Set(data.edges.map(e => e.id));

  let nodesAdded = 0;
  for (const node of NEW_NODES) {
    if (existingNodeIds.has(node.id)) {
      console.log(`Node ${node.id}: already exists, skipping`);
      continue;
    }
    data.nodes.push(node);
    existingNodeIds.add(node.id);
    nodesAdded++;
    console.log(`Node ${node.id}: added`);
  }

  let edgesAdded = 0;
  for (const edge of NEW_EDGES) {
    if (existingEdgeIds.has(edge.id)) {
      console.log(`Edge ${edge.id}: already exists, skipping`);
      continue;
    }
    if (existingNodeIds.has(edge.source) && existingNodeIds.has(edge.target)) {
      data.edges.push(edge);
      existingEdgeIds.add(edge.id);
      edgesAdded++;
    } else {
      console.log(`Edge ${edge.id}: missing node (${edge.source} or ${edge.target})`);
    }
  }

  await writeFile(GRAPH_PATH, JSON.stringify(data, null, 2) + '\n');
  console.log(`\nDone: +${nodesAdded} nodes, +${edgesAdded} edges`);
  console.log(`Total: ${data.nodes.length} nodes, ${data.edges.length} edges`);
}

main().catch(console.error);
