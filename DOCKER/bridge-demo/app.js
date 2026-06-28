const express  = require('express');
const { Pool } = require('pg');

const app  = express();
const PORT = 3000;

// Connect using container NAME — Docker DNS resolves it
const pool = new Pool({
  host:     process.env.DB_HOST     || 'postgres-db',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'demodb',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'secret',
});

app.use(express.json());

// Home
app.get('/', (req, res) => {
  res.json({ status: 'running', message: 'Bridge demo app' });
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ app: 'healthy', database: 'connected' });
  } catch (err) {
    res.status(500).json({ app: 'healthy', database: 'unreachable', error: err.message });
  }
});

// Create a note
app.post('/notes', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  const result = await pool.query(
    'INSERT INTO notes(text, created_at) VALUES($1, NOW()) RETURNING *',
    [text]
  );
  res.status(201).json(result.rows[0]);
});

// Get all notes
app.get('/notes', async (req, res) => {
  const result = await pool.query('SELECT * FROM notes ORDER BY created_at DESC');
  res.json(result.rows);
});

// Create table on startup
async function init() {
  let retries = 10;
  while (retries > 0) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notes (
          id         SERIAL PRIMARY KEY,
          text       TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('Database connected and table ready');
      break;
    } catch (err) {
      retries--;
      console.log(`DB not ready yet, retrying... (${retries} left)`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

init().then(() => {
  app.listen(PORT, () => console.log(`App running on port ${PORT}`));
});
