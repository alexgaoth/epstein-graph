import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { readFileSync } from 'fs';
import pg from 'pg';
import multer from 'multer';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

// ---------------------------------------------------------------------------
// Volume path for uploaded images
// ---------------------------------------------------------------------------
const VOLUME_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH || '/images';

// ---------------------------------------------------------------------------
// PostgreSQL
// ---------------------------------------------------------------------------
const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;

async function migrate() {
  if (!pool) {
    console.log('[db] No DATABASE_URL — running without database');
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_nodes (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      role TEXT DEFAULT '',
      "group" TEXT NOT NULL DEFAULT 'associate',
      gender TEXT NOT NULL DEFAULT 'male',
      image TEXT DEFAULT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      ip_address INET DEFAULT NULL
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_edges (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      target TEXT NOT NULL,
      connection_type TEXT NOT NULL DEFAULT 'other',
      doj_link TEXT DEFAULT '',
      document_title TEXT DEFAULT '',
      quote_snippet TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      ip_address INET DEFAULT NULL
    );
  `);
  console.log('[db] Database tables ready');
}

// ---------------------------------------------------------------------------
// Multer — image upload
// ---------------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VOLUME_PATH),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// ---------------------------------------------------------------------------
// Turnstile verification
// ---------------------------------------------------------------------------
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || '';

async function verifyTurnstile(token) {
  if (!TURNSTILE_SECRET) return true; // skip in dev
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: TURNSTILE_SECRET, response: token }),
  });
  const data = await res.json();
  return data.success === true;
}

// ---------------------------------------------------------------------------
// Cache base graph.json
// ---------------------------------------------------------------------------
let baseGraph;
try {
  baseGraph = JSON.parse(readFileSync(join(__dirname, 'dist', 'data', 'graph.json'), 'utf-8'));
} catch {
  try {
    baseGraph = JSON.parse(readFileSync(join(__dirname, 'public', 'data', 'graph.json'), 'utf-8'));
  } catch {
    baseGraph = { nodes: [], edges: [], groups: {} };
    console.warn('[server] Could not load graph.json — starting with empty graph');
  }
}

// ---------------------------------------------------------------------------
// Validation constants
// ---------------------------------------------------------------------------
const ALLOWED_GROUPS = ['central', 'staff', 'associate', 'accuser', 'legal', 'aviation', 'prosecution', 'international'];
const ALLOWED_CONNECTION_TYPES = ['named in document', 'flight record', 'testimony mention', 'financial record', 'photograph', 'other'];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------

/** GET /api/graph — merged base + user-submitted data */
app.get('/api/graph', async (_req, res) => {
  try {
    let userNodes = [];
    let userEdges = [];
    if (pool) {
      const nodesResult = await pool.query('SELECT id, label, role, "group", gender, image FROM user_nodes ORDER BY created_at');
      userNodes = nodesResult.rows;
      const edgesResult = await pool.query('SELECT id, source, target, connection_type, doj_link, document_title, quote_snippet FROM user_edges ORDER BY created_at');
      userEdges = edgesResult.rows;
    }

    const merged = {
      groups: baseGraph.groups || {},
      nodes: [...baseGraph.nodes, ...userNodes],
      edges: [...baseGraph.edges, ...userEdges],
    };
    res.json(merged);
  } catch (err) {
    console.error('[api/graph] Error:', err);
    res.status(500).json({ error: 'Failed to load graph data' });
  }
});

/** GET /api/nodes — lightweight list for dropdowns */
app.get('/api/nodes', async (_req, res) => {
  try {
    const baseList = baseGraph.nodes.map((n) => ({ id: n.id, label: n.label }));
    let userList = [];
    if (pool) {
      const result = await pool.query('SELECT id, label FROM user_nodes ORDER BY label');
      userList = result.rows;
    }
    res.json([...baseList, ...userList]);
  } catch (err) {
    console.error('[api/nodes] Error:', err);
    res.status(500).json({ error: 'Failed to load nodes' });
  }
});

/** POST /api/nodes — create a new person node */
app.post('/api/nodes', upload.single('image'), async (req, res) => {
  try {
    // Turnstile check
    const token = req.body.turnstileToken || '';
    const valid = await verifyTurnstile(token);
    if (!valid) {
      return res.status(403).json({ error: 'Turnstile verification failed — please complete the challenge' });
    }

    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { label, role, group, gender } = req.body;

    // Validation
    if (!label || typeof label !== 'string' || label.trim().length < 2 || label.trim().length > 100) {
      return res.status(400).json({ error: 'Label must be 2-100 characters' });
    }
    const cleanLabel = label.trim();
    const cleanGroup = ALLOWED_GROUPS.includes(group) ? group : 'associate';
    const cleanGender = gender === 'female' ? 'female' : 'male';
    const cleanRole = (role || '').slice(0, 200);

    // Duplicate check (case-insensitive against both base + DB)
    const allBaseLabels = baseGraph.nodes.map((n) => n.label.toLowerCase());
    if (allBaseLabels.includes(cleanLabel.toLowerCase())) {
      return res.status(409).json({ error: 'A person with this name already exists' });
    }
    const dbDup = await pool.query('SELECT id FROM user_nodes WHERE LOWER(label) = LOWER($1)', [cleanLabel]);
    if (dbDup.rows.length > 0) {
      return res.status(409).json({ error: 'A person with this name already exists' });
    }

    const id = slugify(cleanLabel) + '-' + crypto.randomBytes(3).toString('hex');
    const imageName = req.file ? req.file.filename : null;

    await pool.query(
      `INSERT INTO user_nodes (id, label, role, "group", gender, image, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, cleanLabel, cleanRole, cleanGroup, cleanGender, imageName, req.ip]
    );

    const node = { id, label: cleanLabel, role: cleanRole, group: cleanGroup, gender: cleanGender, image: imageName };
    res.status(201).json(node);
  } catch (err) {
    console.error('[api/nodes] Error:', err);
    res.status(500).json({ error: 'Failed to create node' });
  }
});

/** POST /api/edges — create a new connection */
app.post('/api/edges', async (req, res) => {
  try {
    // Turnstile check
    const token = req.body.turnstileToken || '';
    const valid = await verifyTurnstile(token);
    if (!valid) {
      return res.status(403).json({ error: 'Turnstile verification failed — please complete the challenge' });
    }

    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { source, target, connection_type, doj_link, document_title, quote_snippet } = req.body;

    // Validation
    if (!source || !target) {
      return res.status(400).json({ error: 'Source and target are required' });
    }
    if (source === target) {
      return res.status(400).json({ error: 'Source and target must be different' });
    }

    const cleanType = ALLOWED_CONNECTION_TYPES.includes(connection_type) ? connection_type : 'other';
    const cleanLink = (doj_link || '').slice(0, 500);
    const cleanTitle = (document_title || '').slice(0, 300);
    const cleanSnippet = (quote_snippet || '').slice(0, 1000);

    // Verify source and target exist in either base graph or DB
    const allNodeIds = new Set(baseGraph.nodes.map((n) => n.id));
    if (pool) {
      const dbNodes = await pool.query('SELECT id FROM user_nodes');
      dbNodes.rows.forEach((r) => allNodeIds.add(r.id));
    }
    if (!allNodeIds.has(source)) {
      return res.status(400).json({ error: 'Source node not found' });
    }
    if (!allNodeIds.has(target)) {
      return res.status(400).json({ error: 'Target node not found' });
    }

    const id = `e-${crypto.randomBytes(6).toString('hex')}`;

    await pool.query(
      `INSERT INTO user_edges (id, source, target, connection_type, doj_link, document_title, quote_snippet, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, source, target, cleanType, cleanLink, cleanTitle, cleanSnippet, req.ip]
    );

    const edge = { id, source, target, connection_type: cleanType, doj_link: cleanLink, document_title: cleanTitle, quote_snippet: cleanSnippet };
    res.status(201).json(edge);
  } catch (err) {
    console.error('[api/edges] Error:', err);
    res.status(500).json({ error: 'Failed to create edge' });
  }
});

// ---------------------------------------------------------------------------
// Static file serving
// ---------------------------------------------------------------------------
app.use(express.static(join(__dirname, 'dist')));
app.use('/data/images', express.static(VOLUME_PATH));

// SPA fallback — inject runtime config and serve index.html
let indexHtml;
try {
  indexHtml = readFileSync(join(__dirname, 'dist', 'index.html'), 'utf-8');
} catch { indexHtml = null; }

app.get('*', (_req, res) => {
  if (indexHtml) {
    const siteKey = process.env.VITE_TURNSTILE_SITE_KEY || '';
    const html = indexHtml.replace(
      '</head>',
      `<script>window.__TURNSTILE_SITE_KEY__="${siteKey}";</script></head>`
    );
    res.type('html').send(html);
  } else {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
migrate().then(() => {
  app.listen(PORT, () => {
    console.log(`[epstein-graph] Server running on port ${PORT}`);
    console.log(`  Local: http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('[server] Migration failed:', err);
  // Start anyway without DB
  app.listen(PORT, () => {
    console.log(`[epstein-graph] Server running on port ${PORT} (without database)`);
  });
});
