/**
 * WSH Database Viewer - Simple Web UI to view database tables
 * Runs on port 5682
 * Uses pg module directly (more reliable than Prisma)
 */

const http = require('http');
const { Client } = require('pg');

// Database connection
const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://wsh:wsh_secure_password@postgres:5432/wsh_db?schema=public'
});

const PORT = 5682;

// Connect to database
async function connectDB() {
    try {
        await client.connect();
        console.log('Connected to PostgreSQL');
    } catch (err) {
        console.error('Failed to connect to database:', err.message);
        process.exit(1);
    }
}

// HTML template
const htmlTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
    <title>WSH DB Viewer - ${title}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        h1 { color: #38bdf8; margin-bottom: 10px; }
        h2 { color: #a5b4fc; margin: 20px 0 10px; }
        .nav { 
            background: #1e293b; 
            padding: 15px; 
            border-radius: 8px; 
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .nav a { 
            color: #38bdf8; 
            text-decoration: none; 
            padding: 8px 16px;
            background: #334155;
            border-radius: 6px;
            transition: all 0.2s;
        }
        .nav a:hover { background: #475569; }
        .nav a.active { background: #0ea5e9; color: white; }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            background: #1e293b;
            border-radius: 8px;
            overflow: hidden;
        }
        th { 
            background: #334155; 
            padding: 12px 15px; 
            text-align: left;
            font-weight: 600;
            color: #94a3b8;
            text-transform: uppercase;
            font-size: 12px;
        }
        td { 
            padding: 12px 15px; 
            border-top: 1px solid #334155;
            font-size: 14px;
        }
        tr:hover { background: #334155; }
        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 500;
        }
        .badge-green { background: #166534; color: #bbf7d0; }
        .badge-yellow { background: #854d0e; color: #fef08a; }
        .badge-red { background: #991b1b; color: #fecaca; }
        .badge-blue { background: #1e40af; color: #bfdbfe; }
        .card {
            background: #1e293b;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .stat { text-align: center; }
        .stat-value { font-size: 36px; font-weight: bold; color: #38bdf8; }
        .stat-label { color: #94a3b8; font-size: 14px; }
        pre { 
            background: #0f172a; 
            padding: 15px; 
            border-radius: 6px;
            overflow-x: auto;
            font-size: 12px;
        }
        .error { background: #450a0a; border: 1px solid #991b1b; padding: 15px; border-radius: 8px; }
        .success { background: #052e16; border: 1px solid #166534; padding: 15px; border-radius: 8px; }
        .json { color: #a5b4fc; }
        .truncate { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .actions { display: flex; gap: 10px; margin-bottom: 20px; }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            text-decoration: none;
            display: inline-block;
        }
        .btn-primary { background: #0ea5e9; color: white; }
        .btn-danger { background: #dc2626; color: white; }
        .btn:hover { opacity: 0.9; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🗄️ WSH Database Viewer</h1>
        <p style="color: #64748b; margin-bottom: 20px;">Read-only database viewer for WSH</p>
        
        <div class="nav">
            <a href="/" class="${title === 'Dashboard' ? 'active' : ''}">📊 Dashboard</a>
            <a href="/tables/users" class="${title === 'users' ? 'active' : ''}">👥 Users</a>
            <a href="/tables/notes" class="${title === 'notes' ? 'active' : ''}">📝 Notes</a>
            <a href="/tables/folders" class="${title === 'folders' ? 'active' : ''}">📁 Folders</a>
            <a href="/tables/audit_logs" class="${title === 'audit_logs' ? 'active' : ''}">📋 Audit Logs</a>
            <a href="/tables/system_config" class="${title === 'system_config' ? 'active' : ''}">⚙️ Config</a>
            <a href="/tables/script_executions" class="${title === 'script_executions' ? 'active' : ''}">⚡ Scripts</a>
            <a href="/schema" class="${title === 'Schema' ? 'active' : ''}">📐 Schema</a>
            <a href="/sql" class="${title === 'SQL' ? 'active' : ''}">🔧 SQL</a>
        </div>
        
        ${content}
        
        <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #334155; color: #64748b; font-size: 12px;">
            WSH Database Viewer - Port ${PORT} - <span id="time"></span>
            <script>document.getElementById('time').textContent = new Date().toISOString();</script>
        </footer>
    </div>
</body>
</html>
`;

// Format data for display
const formatValue = (val, maxLength = 50) => {
    if (val === null) return '<span style="color:#64748b">NULL</span>';
    if (val === undefined) return '';
    if (typeof val === 'boolean') return val ? '<span class="badge badge-green">true</span>' : '<span class="badge badge-red">false</span>';
    if (typeof val === 'object') return `<span class="json">${JSON.stringify(val).substring(0, maxLength)}</span>`;
    if (typeof val === 'string' && val.length > maxLength) {
        return `<span class="truncate" title="${val.replace(/"/g, '&quot;')}">${val.substring(0, maxLength)}...</span>`;
    }
    return String(val);
};

// Escape HTML
const escapeHtml = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

// Create server
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const path = url.pathname;
    
    try {
        // Dashboard
        if (path === '/') {
            const [userCount, noteCount, folderCount, auditCount] = await Promise.all([
                client.query('SELECT COUNT(*) FROM users').then(r => parseInt(r.rows[0].count)).catch(() => 0),
                client.query('SELECT COUNT(*) FROM notes').then(r => parseInt(r.rows[0].count)).catch(() => 0),
                client.query('SELECT COUNT(*) FROM folders').then(r => parseInt(r.rows[0].count)).catch(() => 0),
                client.query('SELECT COUNT(*) FROM audit_logs').then(r => parseInt(r.rows[0].count)).catch(() => 0),
            ]);
            
            const content = `
                <div class="card">
                    <h2>Database Statistics</h2>
                    <div class="grid" style="margin-top: 15px;">
                        <div class="stat">
                            <div class="stat-value">${userCount}</div>
                            <div class="stat-label">Users</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${noteCount}</div>
                            <div class="stat-label">Notes</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${folderCount}</div>
                            <div class="stat-label">Folders</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${auditCount}</div>
                            <div class="stat-label">Audit Logs</div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <h2>Quick Actions</h2>
                    <div class="actions" style="margin-top: 15px;">
                        <a href="/tables/users" class="btn btn-primary">View Users</a>
                        <a href="/tables/notes" class="btn btn-primary">View Notes</a>
                        <a href="/schema" class="btn btn-primary">View Schema</a>
                        <a href="/sql" class="btn btn-primary">Run SQL Query</a>
                    </div>
                </div>
            `;
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(htmlTemplate('Dashboard', content));
        }
        
        // View table
        else if (path.startsWith('/tables/')) {
            const tableName = path.replace('/tables/', '');
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = 50;
            const offset = (page - 1) * limit;
            
            // Validate table name (security)
            const validTables = ['users', 'notes', 'folders', 'audit_logs', 'system_config', 'script_executions', 'scheduled_tasks'];
            if (!validTables.includes(tableName)) {
                throw new Error('Invalid table name');
            }
            
            // Get table data
            const rowsResult = await client.query(`
                SELECT * FROM "${tableName}" 
                ORDER BY "createdAt" DESC NULLS LAST 
                LIMIT $1 OFFSET $2
            `, [limit, offset]);
            
            const rows = rowsResult.rows;
            
            const countResult = await client.query(`SELECT COUNT(*)::int as count FROM "${tableName}"`);
            const totalCount = countResult.rows[0]?.count || 0;
            const totalPages = Math.ceil(totalCount / limit);
            
            if (!rows || rows.length === 0) {
                const content = `
                    <div class="card">
                        <h2>Table: ${tableName}</h2>
                        <p style="margin-top: 15px; color: #64748b;">No data found in this table.</p>
                    </div>
                `;
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(htmlTemplate(tableName, content));
                return;
            }
            
            const columns = Object.keys(rows[0]);
            
            let tableHtml = `<table><thead><tr>`;
            columns.forEach(col => {
                tableHtml += `<th>${escapeHtml(col)}</th>`;
            });
            tableHtml += `</tr></thead><tbody>`;
            
            rows.forEach(row => {
                tableHtml += `<tr>`;
                columns.forEach(col => {
                    tableHtml += `<td>${formatValue(row[col])}</td>`;
                });
                tableHtml += `</tr>`;
            });
            tableHtml += `</tbody></table>`;
            
            const content = `
                <div class="card">
                    <h2>Table: ${tableName} (${totalCount} rows)</h2>
                    ${page > 1 || page < totalPages ? `
                        <div class="actions" style="margin-top: 15px;">
                            ${page > 1 ? `<a href="/tables/${tableName}?page=${page-1}" class="btn btn-primary">← Previous</a>` : ''}
                            <span style="color: #64748b;">Page ${page} of ${totalPages}</span>
                            ${page < totalPages ? `<a href="/tables/${tableName}?page=${page+1}" class="btn btn-primary">Next →</a>` : ''}
                        </div>
                    ` : ''}
                </div>
                ${tableHtml}
            `;
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(htmlTemplate(tableName, content));
        }
        
        // Schema view
        else if (path === '/schema') {
            const tablesResult = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                ORDER BY table_name
            `);
            
            let schemaHtml = '';
            
            for (const table of tablesResult.rows) {
                const columnsResult = await client.query(`
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = $1
                    ORDER BY ordinal_position
                `, [table.table_name]);
                
                schemaHtml += `<h2>📋 ${table.table_name}</h2>`;
                schemaHtml += `<table><thead><tr><th>Column</th><th>Type</th><th>Nullable</th><th>Default</th></tr></thead><tbody>`;
                columnsResult.rows.forEach(col => {
                    schemaHtml += `<tr>
                        <td><strong>${escapeHtml(col.column_name)}</strong></td>
                        <td>${escapeHtml(col.data_type)}</td>
                        <td>${col.is_nullable === 'YES' ? '<span class="badge badge-yellow">NULL</span>' : '<span class="badge badge-green">NOT NULL</span>'}</td>
                        <td>${col.column_default ? escapeHtml(col.column_default) : ''}</td>
                    </tr>`;
                });
                schemaHtml += `</tbody></table>`;
            }
            
            const content = `<div class="card">${schemaHtml}</div>`;
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(htmlTemplate('Schema', content));
        }
        
        // SQL query page
        else if (path === '/sql') {
            const query = url.searchParams.get('q');
            let resultHtml = '';
            
            if (query && req.method === 'GET') {
                try {
                    const upperQuery = query.trim().toUpperCase();
                    
                    if (upperQuery.startsWith('SELECT') || upperQuery.startsWith('SHOW') || upperQuery.startsWith('EXPLAIN')) {
                        const result = await client.query(query);
                        
                        if (result.rows && result.rows.length > 0) {
                            const columns = Object.keys(result.rows[0]);
                            resultHtml = `<h3>Results (${result.rows.length} rows)</h3>`;
                            resultHtml += `<table><thead><tr>`;
                            columns.forEach(col => resultHtml += `<th>${escapeHtml(col)}</th>`);
                            resultHtml += `</tr></thead><tbody>`;
                            result.rows.forEach(row => {
                                resultHtml += `<tr>`;
                                columns.forEach(col => resultHtml += `<td>${formatValue(row[col], 100)}</td>`);
                                resultHtml += `</tr>`;
                            });
                            resultHtml += `</tbody></table>`;
                        } else {
                            resultHtml = `<div class="success">Query executed successfully. No results returned.</div>`;
                        }
                    } else {
                        resultHtml = `<div class="error">Only SELECT queries are allowed for security.</div>`;
                    }
                } catch (err) {
                    resultHtml = `<div class="error">Error: ${escapeHtml(err.message)}</div>`;
                }
            }
            
            const content = `
                <div class="card">
                    <h2>Run SQL Query (SELECT only)</h2>
                    <form method="GET" action="/sql" style="margin-top: 15px;">
                        <textarea name="q" rows="4" style="width: 100%; background: #0f172a; color: #e2e8f0; border: 1px solid #334155; border-radius: 6px; padding: 15px; font-family: monospace; font-size: 14px;" placeholder="SELECT * FROM users LIMIT 10;">${query ? escapeHtml(query) : ''}</textarea>
                        <div style="margin-top: 10px;">
                            <button type="submit" class="btn btn-primary">Execute Query</button>
                            <a href="/sql" class="btn" style="background: #334155;">Clear</a>
                        </div>
                    </form>
                </div>
                ${resultHtml ? `<div class="card">${resultHtml}</div>` : ''}
            `;
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(htmlTemplate('SQL', content));
        }
        
        // API endpoint for raw data
        else if (path === '/api/tables') {
            const result = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            `);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result.rows));
        }
        
        // 404
        else {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(htmlTemplate('404', '<div class="error">Page not found</div>'));
        }
        
    } catch (error) {
        console.error('Error:', error);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(htmlTemplate('Error', `<div class="error">Error: ${escapeHtml(error.message)}</div>`));
    }
});

// Start server
async function start() {
    await connectDB();
    
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`
========================================
  WSH Database Viewer
  Running on port ${PORT}
  
  Open in browser: http://localhost:${PORT}
========================================
`);
    });
}

// Handle shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await client.end();
    server.close();
    process.exit(0);
});

// Start
start();
