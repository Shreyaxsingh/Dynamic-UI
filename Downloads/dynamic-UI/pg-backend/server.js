const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');


const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Helper to create a new Pool with SSL for Supabase or other Postgres servers
function createPool(connectionString) {
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Remove or adjust if not using SSL
  });
}

// Validate table name to prevent SQL injection (allow only letters, numbers, underscores)
function validateTableName(tableName) {
  return /^[a-zA-Z0-9_]+$/.test(tableName);
}

// Endpoint: Get columns metadata for a table
app.post('/table-columns', async (req, res) => {
  const { connectionString, tableName } = req.body;
  if (!connectionString || !tableName) {
    return res.status(400).json({ error: 'connectionString and tableName required' });
  }
  if (!validateTableName(tableName)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }

  const pool = createPool(connectionString);
  try {
    const query = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `;
    const result = await pool.query(query, [tableName]);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await pool.end();
  }
});

// Endpoint: Get rows from a table (limit 100 by default)
app.post('/table-rows', async (req, res) => {
  const { connectionString, tableName, limit = 100 } = req.body;
  if (!connectionString || !tableName) {
    return res.status(400).json({ error: 'connectionString and tableName required' });
  }
  if (!validateTableName(tableName)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }

  const pool = createPool(connectionString);
  try {
    // Note: tableName cannot be parameterized, so we validate it strictly
    const query = `SELECT * FROM "${tableName}" LIMIT $1`;
    const result = await pool.query(query, [limit]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error in /table-rows:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await pool.end();
  }
});

// Endpoint: Update a row (requires primary key column and value)
app.post('/table-update', async (req, res) => {
  const { connectionString, tableName, row, primaryKey, primaryKeyValue } = req.body;
  if (!connectionString || !tableName || !row || !primaryKey || primaryKeyValue === undefined) {
    return res.status(400).json({ error: 'connectionString, tableName, row data, primaryKey and primaryKeyValue required' });
  }
  if (!validateTableName(tableName)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }

  const pool = createPool(connectionString);
  try {
    const columns = Object.keys(row);
    const values = Object.values(row);
    const setClause = columns.map((col, i) => `"${col}"=$${i + 1}`).join(', ');

    values.push(primaryKeyValue);

    const query = `
      UPDATE "${tableName}"
      SET ${setClause}
      WHERE "${primaryKey}" = $${values.length}
      RETURNING *
    `;
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await pool.end();
  }
});

// Endpoint: Insert a new row
app.post('/table-insert', async (req, res) => {
  const { connectionString, tableName, row } = req.body;
  if (!connectionString || !tableName || !row) {
    return res.status(400).json({ error: 'connectionString, tableName, and row data required' });
  }
  if (!validateTableName(tableName)) {
    return res.status(400).json({ error: 'Invalid table name' });
  }

  const pool = createPool(connectionString);
  try {
    const columns = Object.keys(row);
    const values = Object.values(row);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const colNames = columns.map(col => `"${col}"`).join(', ');

    const query = `INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders}) RETURNING *`;
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error in /table-insert:", error);
    res.status(500).json({ error: error.message });
  } finally {
    await pool.end();
  }
});


// Root route to verify server is running
app.get('/', (req, res) => {
  res.send('Backend server is running');
});
// Start the server
app.listen(port, () => {
  console.log(`Backend server running on http://localhost:3001`);
});
