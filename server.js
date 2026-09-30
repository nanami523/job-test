const express = require('express');
const { Pool } = require('pg');
const app = express();
const PIN = process.env.PIN || '';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 20000,
  keepAlive: true,
});
// Neon 閒置會斷線；沒有這行，斷線事件會讓整個服務當機
pool.on('error', (e) => console.error('pool error:', e.message));

let inited = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function q(text, params) {
  for (let i = 0; i < 3; i++) {
    try {
      if (!inited) {
        await pool.query(
          'CREATE TABLE IF NOT EXISTS progress (id INT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT now())'
        );
        inited = true;
      }
      return await pool.query(text, params);
    } catch (e) {
      console.error('db error (try ' + (i + 1) + '):', e.message);
      if (i === 2) throw e;
      await sleep(1500);
    }
  }
}

app.use(express.json({ limit: '200kb' }));
app.use((req, res, next) => {
  if (/^\/(server\.js|package|deploy|node_modules|\.)/i.test(req.path)) return res.status(404).end();
  next();
});
app.use(express.static(__dirname));

function auth(req, res, next) {
  if (PIN && req.get('x-pin') !== PIN) return res.status(401).json({ error: 'unauthorized' });
  next();
}
app.get('/api/health', async (req, res) => {
  try { await q('SELECT 1'); res.json({ ok: true, db: true }); }
  catch (e) { res.status(500).json({ ok: true, db: false, error: e.message }); }
});
app.get('/api/progress', auth, async (req, res) => {
  try {
    const r = await q('SELECT data FROM progress WHERE id = 1');
    if (!r.rows.length) return res.json({ empty: true, done: {} });
    res.json({ done: r.rows[0].data });
  } catch (e) { res.status(500).json({ error: 'db' }); }
});
app.put('/api/progress', auth, async (req, res) => {
  const done = req.body && req.body.done;
  if (!done || typeof done !== 'object') return res.status(400).json({ error: 'bad' });
  try {
    await q(
      'INSERT INTO progress (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = now()',
      [JSON.stringify(done)]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'db' }); }
});
process.on('unhandledRejection', (e) => console.error('unhandled:', e && e.message));
app.listen(process.env.PORT || 3000, () => console.log('running'));
