import React, { useState, useEffect } from 'react';

export default function TableEditor() {
  const [connectionString, setConnectionString] = useState('');
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [editedRows, setEditedRows] = useState({}); // Keep track of edited rows keyed by primary key

  // You may need to adjust this depending on your primary key column name
  const primaryKey = 'id';

  async function loadTable() {
    if (!connectionString || !tableName) {
      alert('Please enter connection string and table name');
      return;
    }

    try {
      // Fetch columns
      const colRes = await fetch('http://localhost:3001/table-columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString, tableName }),
      });
      const colData = await colRes.json();
      setColumns(colData);

      // Fetch rows
      const rowRes = await fetch('http://localhost:3001/table-rows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString, tableName, limit: 100 }),
      });
      const rowData = await rowRes.json();
      setRows(rowData);
      setEditedRows({});
    } catch (error) {
      alert('Error loading table: ' + error.message);
    }
  }

  function handleCellChange(rowIndex, columnName, value) {
    setRows(prevRows => {
      const newRows = [...prevRows];
      newRows[rowIndex] = { ...newRows[rowIndex], [columnName]: value };
      return newRows;
    });

    // Track edited rows by primary key value
    const pkValue = rows[rowIndex][primaryKey];
    setEditedRows(prev => ({
      ...prev,
      [pkValue]: { ...rows[rowIndex], [columnName]: value },
    }));
  }

  async function saveChanges() {
    const updates = Object.values(editedRows);
    if (updates.length === 0) {
      alert('No changes to save');
      return;
    }

    try {
      for (const row of updates) {
        const pkValue = row[primaryKey];
        // Remove primary key from row data to avoid updating it
        const { [primaryKey]: _, ...rowData } = row;

        const res = await fetch('http://localhost:3001/table-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectionString,
            tableName,
            row: rowData,
            primaryKey,
            primaryKeyValue: pkValue,
          }),
        });

        const data = await res.json();
        if (res.status !== 200) {
          alert(`Failed to update row with ${primaryKey}=${pkValue}: ${data.error}`);
        }
      }
      alert('Changes saved successfully');
      loadTable(); // Reload fresh data
    } catch (error) {
      alert('Error saving changes: ' + error.message);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Postgres Table Editor</h2>
      <div style={{ marginBottom: 10 }}>
        <input
          type="text"
          placeholder="Connection String"
          value={connectionString}
          onChange={e => setConnectionString(e.target.value)}
          style={{ width: '60%', marginRight: 10 }}
        />
        <input
          type="text"
          placeholder="Table Name"
          value={tableName}
          onChange={e => setTableName(e.target.value)}
          style={{ width: '20%', marginRight: 10 }}
        />
        <button onClick={loadTable}>Load Table</button>
      </div>

      {columns.length > 0  && rows.length > 0 &&(
        <div>
          <table border="1" cellPadding="5" cellSpacing="0">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.column_name}>{col.column_name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={row[primaryKey] || rowIndex}>
                  {columns.map(col => (
                    <td key={col.column_name}>
                      <input
                        type="text"
                        value={row[col.column_name] ?? ''}
                        onChange={e =>
                          handleCellChange(rowIndex, col.column_name, e.target.value)
                        }
                        style={{ width: '100%' }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={saveChanges} style={{ marginTop: 10 }}>
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
