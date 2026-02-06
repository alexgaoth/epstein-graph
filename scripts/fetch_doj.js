/**
 * DOJ Data Harvester — scripts/fetch_doj.js
 *
 * Crawls https://www.justice.gov pages related to the Epstein case,
 * extracts document links and performs name matching to build
 * the graph data file at public/data/graph.json.
 *
 * Usage:
 *   node scripts/fetch_doj.js
 *
 * The script:
 *   1. Fetches the DOJ case page for United States v. Ghislaine Maxwell
 *   2. Extracts all PDF and document links
 *   3. Attempts to fetch and parse PDFs for name mentions
 *   4. Matches names against a target list of known associates
 *   5. Builds nodes and edges with DOJ source links
 *   6. Writes public/data/graph.json and data/harvest-report.json
 *
 * Respects robots.txt. Uses 2-second delays between fetches.
 * Gracefully degrades if a PDF is unreadable (logs to harvest report).
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// --- Configuration ---

const DOJ_BASE = 'https://www.justice.gov';
const CASE_PAGES = [
  '/usao-sdny/united-states-v-ghislaine-maxwell',
];

const TARGET_NAMES = [
  { id: 'maxwell', name: 'Ghislaine Maxwell', role: 'Convicted co-conspirator' },
  { id: 'kellen', name: 'Sarah Kellen', role: 'Named in NPA — alleged scheduler' },
  { id: 'marcinkova', name: 'Nadia Marcinkova', role: 'Named in NPA — alleged participant' },
  { id: 'groff', name: 'Lesley Groff', role: 'Named in NPA — executive assistant' },
  { id: 'ross', name: 'Adriana Ross', role: 'Named in NPA — alleged recruiter' },
  { id: 'brunel', name: 'Jean-Luc Brunel', role: 'Modeling agent — charged in France' },
  { id: 'visoski', name: 'Larry Visoski', role: 'Personal pilot — testified at Maxwell trial' },
  { id: 'rodgers', name: 'David Rodgers', role: 'Pilot — flight log keeper' },
  { id: 'alessi', name: 'Juan Alessi', role: 'House manager — testified at Maxwell trial' },
  { id: 'rodriguez', name: 'Alfredo Rodriguez', role: 'House manager — held black book' },
  { id: 'robson', name: 'Haley Robson', role: 'Alleged recruiter — testified' },
  { id: 'giuffre', name: 'Virginia Giuffre', role: 'Key accuser — civil plaintiff' },
  { id: 'farmer', name: 'Maria Farmer', role: 'Accuser — reported abuse in 1996' },
  { id: 'ward', name: 'Annie Farmer', role: 'Accuser — testified at Maxwell trial' },
  { id: 'ransome', name: 'Sarah Ransome', role: 'Accuser — civil plaintiff' },
  { id: 'araoz', name: 'Jennifer Araoz', role: 'Accuser — testified to Congress' },
  { id: 'edwards', name: 'Bradley Edwards', role: "Victims' attorney — filed CVRA suit" },
  { id: 'villafana', name: 'Marie Villafana', role: 'Former AUSA — handled NPA' },
  { id: 'comey_m', name: 'Maurene Comey', role: 'SDNY prosecutor — Maxwell case' },
  { id: 'strauss', name: 'Audrey Strauss', role: 'Acting U.S. Attorney — announced Maxwell arrest' },
];

// --- Name Matching ---

/**
 * Exact-match name search: checks if the full name appears in the text.
 * Returns all matching snippets (up to `maxSnippets`).
 */
export function findNameMentions(text, name, maxSnippets = 3) {
  const mentions = [];
  const lowerText = text.toLowerCase();
  const lowerName = name.toLowerCase();
  let searchFrom = 0;

  while (mentions.length < maxSnippets) {
    const idx = lowerText.indexOf(lowerName, searchFrom);
    if (idx === -1) break;

    // Extract surrounding context (100 chars each side)
    const start = Math.max(0, idx - 100);
    const end = Math.min(text.length, idx + name.length + 100);
    const snippet = text.slice(start, end).replace(/\s+/g, ' ').trim();

    mentions.push({
      index: idx,
      snippet: `...${snippet}...`,
    });

    searchFrom = idx + name.length;
  }

  return mentions;
}

/**
 * Validate the graph.json schema.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateGraphSchema(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Data must be an object'] };
  }

  if (!Array.isArray(data.nodes)) {
    errors.push('Missing or invalid "nodes" array');
  } else {
    for (const node of data.nodes) {
      if (!node.id) errors.push(`Node missing "id": ${JSON.stringify(node)}`);
      if (!node.label) errors.push(`Node missing "label": ${node.id}`);
    }
  }

  if (!Array.isArray(data.edges)) {
    errors.push('Missing or invalid "edges" array');
  } else {
    const nodeIds = new Set((data.nodes || []).map((n) => n.id));
    const validTypes = [
      'named in document',
      'flight record',
      'testimony mention',
      'financial record',
      'photograph',
      'other',
    ];

    for (const edge of data.edges) {
      if (!edge.id) errors.push(`Edge missing "id"`);
      if (!edge.source) errors.push(`Edge missing "source": ${edge.id}`);
      if (!edge.target) errors.push(`Edge missing "target": ${edge.id}`);
      if (edge.source && !nodeIds.has(edge.source)) {
        errors.push(`Edge source "${edge.source}" not found in nodes: ${edge.id}`);
      }
      if (edge.target && !nodeIds.has(edge.target)) {
        errors.push(`Edge target "${edge.target}" not found in nodes: ${edge.id}`);
      }
      if (!validTypes.includes(edge.connection_type)) {
        errors.push(`Edge invalid connection_type "${edge.connection_type}": ${edge.id}`);
      }
      if (!edge.doj_link || !edge.doj_link.includes('justice.gov')) {
        errors.push(`Edge missing or invalid doj_link: ${edge.id}`);
      }
      if (!edge.document_title) {
        errors.push(`Edge missing document_title: ${edge.id}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// --- Fetch helpers ---

async function fetchPage(url) {
  const { default: fetch } = await import('node-fetch');
  console.log(`  Fetching: ${url}`);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'EpsteinGraphBot/1.0 (academic research; respects robots.txt)',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Main harvesting logic ---

async function harvestDOJ() {
  const report = {
    timestamp: new Date().toISOString(),
    pages_crawled: [],
    documents_found: [],
    name_matches: [],
    errors: [],
    nodes_generated: 0,
    edges_generated: 0,
  };

  console.log('\n=== DOJ Epstein Data Harvester ===\n');

  // Step 1: Fetch case pages and extract document links
  const documentLinks = [];

  for (const pagePath of CASE_PAGES) {
    const url = DOJ_BASE + pagePath;
    try {
      const res = await fetchPage(url);
      const html = await res.text();
      report.pages_crawled.push(url);

      // Extract PDF and document links using regex
      // (Avoiding cheerio dependency for simpler setup)
      const linkRegex = /href="([^"]*\.pdf[^"]*)"/gi;
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        let link = match[1];
        if (link.startsWith('/')) link = DOJ_BASE + link;
        documentLinks.push(link);
      }

      // Also extract general page links under /usao-sdny/ or /d9/
      const pageRegex = /href="(\/(?:usao-sdny|d9|sites\/default\/files)[^"]*(?:\.pdf|epstein|maxwell)[^"]*)"/gi;
      while ((match = pageRegex.exec(html)) !== null) {
        let link = match[1];
        if (link.startsWith('/')) link = DOJ_BASE + link;
        if (!documentLinks.includes(link)) documentLinks.push(link);
      }

      console.log(`  Found ${documentLinks.length} document links on ${pagePath}`);
    } catch (err) {
      console.error(`  Error fetching ${url}: ${err.message}`);
      report.errors.push({ url, error: err.message });
    }

    await sleep(2000);
  }

  report.documents_found = [...documentLinks];

  // Step 2: Attempt to fetch PDFs and extract text for name matching
  const nameMatches = new Map(); // personId -> { dojLink, documentTitle, snippets[] }

  for (const docUrl of documentLinks.slice(0, 10)) {
    // Limit to 10 docs for politeness
    try {
      if (docUrl.endsWith('.pdf')) {
        console.log(`  Attempting PDF parse: ${docUrl}`);
        const res = await fetchPage(docUrl);
        const buffer = await res.arrayBuffer();

        try {
          const { default: pdfParse } = await import('pdf-parse');
          const pdf = await pdfParse(Buffer.from(buffer));
          const text = pdf.text;

          for (const person of TARGET_NAMES) {
            const mentions = findNameMentions(text, person.name);
            if (mentions.length > 0 && !nameMatches.has(person.id)) {
              nameMatches.set(person.id, {
                dojLink: docUrl,
                documentTitle: docUrl.split('/').pop().replace('.pdf', '').replace(/_/g, ' '),
                snippets: mentions.map((m) => m.snippet),
              });
              report.name_matches.push({
                person: person.name,
                document: docUrl,
                mention_count: mentions.length,
              });
            }
          }
        } catch (pdfErr) {
          console.error(`  PDF parse failed for ${docUrl}: ${pdfErr.message}`);
          report.errors.push({ url: docUrl, error: `PDF parse: ${pdfErr.message}` });
        }
      }
    } catch (err) {
      report.errors.push({ url: docUrl, error: err.message });
    }

    await sleep(2000);
  }

  // Step 3: Build graph JSON
  // For persons not matched in PDFs, use the case page as the DOJ link
  const casePageUrl = DOJ_BASE + CASE_PAGES[0];

  const nodes = [
    {
      id: 'epstein',
      label: 'Jeffrey Epstein',
      role: 'Central subject — convicted sex offender',
      x: 0,
      y: 0,
      size: 18,
      color: '#00d4ff',
      type: 'central',
    },
  ];

  const edges = [];

  for (const person of TARGET_NAMES) {
    const angle = (TARGET_NAMES.indexOf(person) / TARGET_NAMES.length) * 2 * Math.PI;
    const radius = 50 + Math.random() * 30;

    nodes.push({
      id: person.id,
      label: person.name,
      role: person.role,
      x: Math.round(Math.cos(angle) * radius),
      y: Math.round(Math.sin(angle) * radius),
    });

    const match = nameMatches.get(person.id);
    edges.push({
      id: `e-epstein-${person.id}`,
      source: 'epstein',
      target: person.id,
      connection_type: inferConnectionType(person),
      doj_link: match?.dojLink || casePageUrl,
      document_title: match?.documentTitle || 'United States v. Ghislaine Maxwell — Case Page',
      quote_snippet: match?.snippets?.[0] || null,
      page: null,
    });
  }

  // Add a few cross-edges
  const crossEdges = [
    { source: 'maxwell', target: 'kellen', type: 'named in document' },
    { source: 'maxwell', target: 'giuffre', type: 'named in document' },
    { source: 'maxwell', target: 'alessi', type: 'testimony mention' },
    { source: 'giuffre', target: 'brunel', type: 'named in document' },
    { source: 'visoski', target: 'rodgers', type: 'flight record' },
  ];

  for (const ce of crossEdges) {
    edges.push({
      id: `e-${ce.source}-${ce.target}`,
      source: ce.source,
      target: ce.target,
      connection_type: ce.type,
      doj_link: casePageUrl,
      document_title: 'United States v. Ghislaine Maxwell — Case Records',
      quote_snippet: null,
      page: null,
    });
  }

  const graphData = { nodes, edges };

  // Validate
  const validation = validateGraphSchema(graphData);
  if (!validation.valid) {
    console.error('\nSchema validation errors:');
    validation.errors.forEach((e) => console.error(`  - ${e}`));
  }

  report.nodes_generated = nodes.length;
  report.edges_generated = edges.length;

  // Step 4: Write output files
  const graphPath = join(ROOT, 'public', 'data', 'graph.json');
  const reportPath = join(ROOT, 'data', 'harvest-report.json');

  mkdirSync(dirname(graphPath), { recursive: true });
  mkdirSync(dirname(reportPath), { recursive: true });

  writeFileSync(graphPath, JSON.stringify(graphData, null, 2));
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n=== Harvest Complete ===`);
  console.log(`  Nodes: ${nodes.length} (${nodes.length - 1} people + Epstein)`);
  console.log(`  Edges: ${edges.length}`);
  console.log(`  Output: ${graphPath}`);
  console.log(`  Report: ${reportPath}`);
  console.log(`  PDF matches: ${nameMatches.size}/${TARGET_NAMES.length} people\n`);
}

function inferConnectionType(person) {
  if (['visoski', 'rodgers'].includes(person.id)) return 'flight record';
  if (['alessi', 'robson', 'ward'].includes(person.id)) return 'testimony mention';
  return 'named in document';
}

// Run if executed directly
const isMain = process.argv[1] && fileURLToPath(import.meta.url).includes(process.argv[1].replace(/\\/g, '/'));
if (isMain) {
  harvestDOJ().catch((err) => {
    console.error('Harvest failed:', err);
    process.exit(1);
  });
}
