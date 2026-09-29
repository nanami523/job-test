const express = require('express');
const { Pool } = require('pg');
const app = express();
const PIN = process.env.PIN || '';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
app.use(express.json({ limit: '200kb' }));
app.use((req, res, next) => {
  if (/^\/(server\.js|package|deploy|node_modules|\.)/i.test(req.path)) return res.status(404).end();
  next();
});
app.use(express.static(__dirname));

async function init() {
  await pool.query(
    'CREATE TABLE IF NOT EXISTS progress (id INT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT now())'
  );
}
function auth(req, res, next) {
  if (PIN && req.get('x-pin') !== PIN) return res.status(401).json({ error: 'unauthorized' });
  next();
}
app.get('/api/progress', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT data FROM progress WHERE id = 1');
    if (!r.rows.length) return res.json({ empty: true, done: {} });
    res.json({ done: r.rows[0].data });
  } catch (e) { res.status(500).json({ error: 'db' }); }
});
app.put('/api/progress', auth, async (req, res) => {
  const done = req.body && req.body.done;
  if (!done || typeof done !== 'object') return res.status(400).json({ error: 'bad' });
  try {
    await pool.query(
      'INSERT INTO progress (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = now()',
      [JSON.stringify(done)]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'db' }); }
});
init().then(() => {
  app.listen(process.env.PORT || 3000, () => console.log('running'));
}).catch((e) => { console.error(e); process.exit(1); });
