import React, { useState } from 'react';

export default function TableEditor() {
 
 
  const [connectionString, setConnectionString] = useState('');
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [editedRows, setEditedRows] = useState({});
  const [newRow, setNewRow] = useState({});
  const [error, setError] = useState('');

  const primaryKey = 'id'; // Change if your table uses a different primary key

  const loadTable = async () => {
    console.log("Loading table...");



    if (!connectionString || !tableName) {
      alert('Please enter both connection string and table name');
      return;
    }
    try {
      const colRes = await fetch('http://localhost:3001/table-columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString, tableName }),
      });
      const colData = await colRes.json();
      console.log("Fetched Columns:", colData);
      setColumns(colData);

      const rowRes = await fetch('http://localhost:3001/table-rows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString, tableName }),
      });
      const rowData = await rowRes.json();
      console.log("Fetched Rows:", rowData);
      setRows(rowData);
      setEditedRows({});
    } catch (err) {
      alert('Error loading table: ' + err.message);
    }
  };

  const handleCellChange = (rowIndex, columnName, value) => {
    const updatedRows = [...rows];
    updatedRows[rowIndex][columnName] = value;
    setRows(updatedRows);

    const pkValue = updatedRows[rowIndex][primaryKey];
    setEditedRows(prev => ({
      ...prev,
      [pkValue]: updatedRows[rowIndex],
    }));
  };

  const saveChanges = async () => {
    const updates = Object.values(editedRows);
    if (updates.length === 0) {
      alert('No changes to save');
      return;
    }

    try {
      for (const row of updates) {
        const pkValue = row[primaryKey];
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
        if (!res.ok) {
          alert(`Failed to update row with ${primaryKey}=${pkValue}: ${data.error}`);
        }
      }
      alert('Changes saved successfully');
      loadTable();
    } catch (err) {
      alert('Error saving changes: ' + err.message);
    }
  };
  async function handleInsertRow() {
  try {
    const res = await fetch('http://localhost:3001/table-insert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionString, tableName, row: newRow }),
    });
    const data = await res.json();
    if (res.ok) {
      alert('Row inserted!');
      setNewRow({});
      loadTable(); // Refresh the table data
    } else {
      alert('Insert failed: ' + data.error);
    }
  } catch (error) {
    alert('Error inserting row: ' + error.message);
  }
}

return (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #f2f6fc 0%, #dbeafe 100%)'
    }}
  >
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 4px 24px rgba(0,0,0,0.09)',
        padding: 36,
        minWidth: 600,
        maxWidth: 900,
        width: '100%'
      }}
    >
      <h1 style={{
        marginBottom: 28,
        color: '#1e293b',
        fontWeight: 800,
        letterSpacing: 1,
        fontSize: 32,
        textAlign: 'center'
      }}>
        Postgres Table Editor
      </h1>

      <div style={{
        marginBottom: 24,
        display: 'flex',
        gap: 14,
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <input
          type="text"
          placeholder="Connection String"
          value={connectionString}
          onChange={e => setConnectionString(e.target.value)}
          style={{
            flex: 2,
            padding: 12,
            borderRadius: 8,
            border: '1px solid #d1d5db',
            fontSize: 16,
            background: '#f1f5f9'
          }}
        />
        <input
          type="text"
          placeholder="Table Name"
          value={tableName}
          onChange={e => setTableName(e.target.value)}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 8,
            border: '1px solid #d1d5db',
            fontSize: 16,
            background: '#f1f5f9'
          }}
        />
        <button
          onClick={loadTable}
          style={{
            padding: '12px 28px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 'bold',
            fontSize: 16,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(37,99,235,0.10)',
            transition: 'background 0.2s'
          }}
          onMouseOver={e => (e.currentTarget.style.background = '#1d4ed8')}
          onMouseOut={e => (e.currentTarget.style.background = '#2563eb')}
        >
          Load Table
        </button>
      </div>

      {error && (
        <div style={{
          color: '#ef4444',
          background: '#fee2e2',
          borderRadius: 6,
          padding: '10px 18px',
          marginBottom: 18,
          textAlign: 'center',
          fontWeight: 500
        }}>
          {error}
        </div>
      )}

      {columns.length > 0 && (
        <>
          <div style={{ overflowX: 'auto', marginTop: 24 }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                background: '#f8fafc',
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <thead style={{ background: '#e0e7ef' }}>
                <tr>
                  {columns.map(col => (
                    <th
                      key={col.column_name}
                      style={{
                        padding: 12,
                        fontWeight: 'bold',
                        borderBottom: '1px solid #d1d5db',
                        textAlign: 'left',
                        fontSize: 15
                      }}
                    >
                      {col.column_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Insert Row */}
                <tr>
                  {columns.map(col => (
                    <td key={col.column_name}>
                      <input
                        type="text"
                        value={newRow[col.column_name] || ''}
                        onChange={e =>
                          setNewRow({ ...newRow, [col.column_name]: e.target.value })
                        }
                        style={{
                          width: '100%',
                          padding: 8,
                          borderRadius: 5,
                          border: '1px solid #e5e7eb',
                          fontSize: 15,
                          background: '#fff'
                        }}
                      />
                    </td>
                  ))}
                </tr>
                {/* Existing Rows */}
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
                          style={{
                            width: '100%',
                            padding: 8,
                            borderRadius: 5,
                            border: '1px solid #e5e7eb',
                            fontSize: 15,
                            background: '#fff'
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 22, textAlign: 'right' }}>
            <button
              onClick={handleInsertRow}
              style={{
                marginRight: 14,
                padding: '10px 24px',
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 'bold',
                fontSize: 15,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={e => (e.currentTarget.style.background = '#059669')}
              onMouseOut={e => (e.currentTarget.style.background = '#10b981')}
            >
              Insert Row
            </button>
            <button
              onClick={saveChanges}
              style={{
                padding: '10px 24px',
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 'bold',
                fontSize: 15,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseOver={e => (e.currentTarget.style.background = '#4338ca')}
              onMouseOut={e => (e.currentTarget.style.background = '#6366f1')}
            >
              Save Changes
            </button>
          </div>
        </>
      )}
    </div>
  </div>
)};

