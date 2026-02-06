import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve Vite build output
app.use(express.static(join(__dirname, 'dist')));

// Serve Railway volume images (fallback for persistent storage)
const VOLUME_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH || '/images';
app.use('/data/images', express.static(VOLUME_PATH));

// SPA fallback — serve index.html for all non-file routes
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[epstein-graph] Server running on port ${PORT}`);
  console.log(`  Local: http://localhost:${PORT}`);
});
