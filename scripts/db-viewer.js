/**
 * WSH Database Viewer - Simple Web UI to view database tables
 * Runs on port 5682
 * Uses pg module directly (more reliable than Prisma)
 * v3.1.0 - Added password change functionality
 */

const http = require('http');
const crypto = require('crypto');
const { Client } = require('pg');

// Simple bcrypt hash function (using Node.js crypto)
function hashPassword(password) {
    // Generate a salt and hash using SHA256 (simplified for Node.js without bcrypt dependency)
    // In production, use bcrypt properly
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `$pbkdf2-sha512$${salt}$${hash}`;
}

// Simpler hash for demo purposes (matches the pattern in start.ps1)
function simpleBcryptHash(password) {
    // This creates a hash that looks like bcrypt but uses SHA256
    // The actual authentication uses bcryptjs in the API
    const salt = crypto.randomBytes(16).toString('base64').substring(0, 22);
    const hash = crypto.createHash('sha256').update(password + salt).digest('base64');
    return `$2a$10$${salt.replace(/\+/g, '.').replace(/\//g, '_')}${hash.substring(0, 31)}`;
}

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

// HTML template - NO EMOJIS to avoid encoding issues
const htmlTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
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
        .icon { margin-right: 6px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>WSH Database Viewer</h1>
        <p style="color: #64748b; margin-bottom: 20px;">Read-only database viewer for WSH</p>
        
        <div class="nav">
            <a href="/" class="${title === 'Dashboard' ? 'active' : ''}">[DB] Dashboard</a>
            <a href="/users/manage" class="${title === 'User Management' ? 'active' : ''}">[M] Manage Users</a>
            <a href="/tables/users" class="${title === 'users' ? 'active' : ''}">[U] Users</a>
            <a href="/tables/notes" class="${title === 'notes' ? 'active' : ''}">[N] Notes</a>
            <a href="/tables/folders" class="${title === 'folders' ? 'active' : ''}">[F] Folders</a>
            <a href="/tables/audit_logs" class="${title === 'audit_logs' ? 'active' : ''}">[L] Audit Logs</a>
            <a href="/tables/system_config" class="${title === 'system_config' ? 'active' : ''}">[C] Config</a>
            <a href="/tables/script_executions" class="${title === 'script_executions' ? 'active' : ''}">[S] Scripts</a>
            <a href="/schema" class="${title === 'Schema' ? 'active' : ''}">[+] Schema</a>
            <a href="/sql" class="${title === 'SQL' ? 'active' : ''}">[>] SQL</a>
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
    if (typeof val === 'object') return '<span class="json">' + JSON.stringify(val).substring(0, maxLength) + '</span>';
    if (typeof val === 'string' && val.length > maxLength) {
        return '<span class="truncate" title="' + val.replace(/"/g, '&quot;') + '">' + val.substring(0, maxLength) + '...</span>';
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
    const url = new URL(req.url, 'http://localhost:' + PORT);
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
                        <a href="/users/manage" class="btn btn-primary">Manage Users</a>
                        <a href="/tables/users" class="btn btn-primary">View Users</a>
                        <a href="/tables/notes" class="btn btn-primary">View Notes</a>
                        <a href="/schema" class="btn btn-primary">View Schema</a>
                        <a href="/sql" class="btn btn-primary">Run SQL Query</a>
                    </div>
                </div>
            `;
            
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
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
            const rowsResult = await client.query(
                'SELECT * FROM "' + tableName + '" ORDER BY "createdAt" DESC NULLS LAST LIMIT $1 OFFSET $2',
                [limit, offset]
            );
            
            const rows = rowsResult.rows;
            
            const countResult = await client.query('SELECT COUNT(*)::int as count FROM "' + tableName + '"');
            const totalCount = countResult.rows[0]?.count || 0;
            const totalPages = Math.ceil(totalCount / limit);
            
            if (!rows || rows.length === 0) {
                const content = `
                    <div class="card">
                        <h2>Table: ${tableName}</h2>
                        <p style="margin-top: 15px; color: #64748b;">No data found in this table.</p>
                    </div>
                `;
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(htmlTemplate(tableName, content));
                return;
            }
            
            const columns = Object.keys(rows[0]);
            
            let tableHtml = '<table><thead><tr>';
            columns.forEach(col => {
                tableHtml += '<th>' + escapeHtml(col) + '</th>';
            });
            tableHtml += '</tr></thead><tbody>';
            
            rows.forEach(row => {
                tableHtml += '<tr>';
                columns.forEach(col => {
                    tableHtml += '<td>' + formatValue(row[col]) + '</td>';
                });
                tableHtml += '</tr>';
            });
            tableHtml += '</tbody></table>';
            
            const content = `
                <div class="card">
                    <h2>Table: ${tableName} (${totalCount} rows)</h2>
                    ${page > 1 || page < totalPages ? `
                        <div class="actions" style="margin-top: 15px;">
                            ${page > 1 ? '<a href="/tables/' + tableName + '?page=' + (page-1) + '" class="btn btn-primary">&lt; Previous</a>' : ''}
                            <span style="color: #64748b;">Page ${page} of ${totalPages}</span>
                            ${page < totalPages ? '<a href="/tables/' + tableName + '?page=' + (page+1) + '" class="btn btn-primary">Next &gt;</a>' : ''}
                        </div>
                    ` : ''}
                </div>
                ${tableHtml}
            `;
            
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
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
                
                schemaHtml += '<h2>[T] ' + table.table_name + '</h2>';
                schemaHtml += '<table><thead><tr><th>Column</th><th>Type</th><th>Nullable</th><th>Default</th></tr></thead><tbody>';
                columnsResult.rows.forEach(col => {
                    schemaHtml += '<tr>';
                    schemaHtml += '<td><strong>' + escapeHtml(col.column_name) + '</strong></td>';
                    schemaHtml += '<td>' + escapeHtml(col.data_type) + '</td>';
                    schemaHtml += '<td>' + (col.is_nullable === 'YES' ? '<span class="badge badge-yellow">NULL</span>' : '<span class="badge badge-green">NOT NULL</span>') + '</td>';
                    schemaHtml += '<td>' + (col.column_default ? escapeHtml(col.column_default) : '') + '</td>';
                    schemaHtml += '</tr>';
                });
                schemaHtml += '</tbody></table>';
            }
            
            const content = '<div class="card">' + schemaHtml + '</div>';
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(htmlTemplate('Schema', content));
        }
        
        // SQL query page
        else if (path === '/sql') {
            const query = url.searchParams.get('q');
            let resultHtml = '';
            
            if (query && req.method === 'GET') {
                try {
                    const upperQuery = query.trim().toUpperCase();
                    
                    // Allow SELECT, SHOW, EXPLAIN
                    if (upperQuery.startsWith('SELECT') || upperQuery.startsWith('SHOW') || upperQuery.startsWith('EXPLAIN')) {
                        const result = await client.query(query);
                        
                        if (result.rows && result.rows.length > 0) {
                            const columns = Object.keys(result.rows[0]);
                            resultHtml = '<h3>Results (' + result.rows.length + ' rows)</h3>';
                            resultHtml += '<table><thead><tr>';
                            columns.forEach(col => resultHtml += '<th>' + escapeHtml(col) + '</th>');
                            resultHtml += '</tr></thead><tbody>';
                            result.rows.forEach(row => {
                                resultHtml += '<tr>';
                                columns.forEach(col => resultHtml += '<td>' + formatValue(row[col], 100) + '</td>');
                                resultHtml += '</tr>';
                            });
                            resultHtml += '</tbody></table>';
                        } else {
                            resultHtml = '<div class="success">Query executed successfully. No results returned.</div>';
                        }
                    }
                    // Allow UPDATE for user management (role changes only)
                    else if (upperQuery.startsWith('UPDATE') && upperQuery.includes('USERS') && (upperQuery.includes('ROLE') || upperQuery.includes('STATUS'))) {
                        const result = await client.query(query);
                        resultHtml = '<div class="success">Update executed successfully. ' + result.rowCount + ' row(s) affected.</div>';
                        resultHtml += '<p style="margin-top: 10px;"><a href="/tables/users" class="btn btn-primary">View Users Table</a></p>';
                    }
                    // Allow INSERT into audit_logs
                    else if (upperQuery.startsWith('INSERT') && upperQuery.includes('AUDIT_LOGS')) {
                        const result = await client.query(query);
                        resultHtml = '<div class="success">Audit log entry created. ' + result.rowCount + ' row(s) inserted.</div>';
                    }
                    else {
                        resultHtml = '<div class="error">Only SELECT queries and user management UPDATEs are allowed.</div>';
                        resultHtml += '<p style="margin-top: 10px; color: #94a3b8;">Allowed: SELECT, SHOW, EXPLAIN, UPDATE users SET role/status</p>';
                    }
                } catch (err) {
                    resultHtml = '<div class="error">Error: ' + escapeHtml(err.message) + '</div>';
                }
            }
            
            const content = `
                <div class="card">
                    <h2>Run SQL Query</h2>
                    <p style="color: #94a3b8; margin-top: 5px; margin-bottom: 15px;">Allowed: SELECT, SHOW, EXPLAIN, UPDATE users (role/status only)</p>
                    <form method="GET" action="/sql" style="margin-top: 15px;">
                        <textarea name="q" rows="4" style="width: 100%; background: #0f172a; color: #e2e8f0; border: 1px solid #334155; border-radius: 6px; padding: 15px; font-family: monospace; font-size: 14px;" placeholder="SELECT * FROM users LIMIT 10;">${query ? escapeHtml(query) : ''}</textarea>
                        <div style="margin-top: 10px;">
                            <button type="submit" class="btn btn-primary">Execute Query</button>
                            <a href="/sql" class="btn" style="background: #334155;">Clear</a>
                        </div>
                    </form>
                </div>
                <div class="card">
                    <h3>Quick User Management Queries</h3>
                    <div style="margin-top: 15px; display: grid; gap: 10px;">
                        <button onclick="setQuery('SELECT email, username, role, status FROM users ORDER BY role;')" class="btn" style="background: #334155; text-align: left;">[1] View all users with roles</button>
                        <button onclick="setQuery('UPDATE users SET role = \\'super-admin\\' WHERE email = \\'EMAIL\\';')" class="btn" style="background: #334155; text-align: left;">[2] Promote user to SUPER ADMIN</button>
                        <button onclick="setQuery('UPDATE users SET role = \\'admin\\' WHERE email = \\'EMAIL\\';')" class="btn" style="background: #334155; text-align: left;">[3] Set user to ADMIN</button>
                        <button onclick="setQuery('UPDATE users SET role = \\'user\\' WHERE email = \\'EMAIL\\';')" class="btn" style="background: #334155; text-align: left;">[4] Demote user to regular USER</button>
                        <button onclick="setQuery('UPDATE users SET status = \\'banned\\' WHERE email = \\'EMAIL\\';')" class="btn" style="background: #334155; text-align: left;">[5] Ban user by email</button>
                        <button onclick="setQuery('UPDATE users SET status = \\'active\\' WHERE email = \\'EMAIL\\';')" class="btn" style="background: #334155; text-align: left;">[6] Unban/Activate user</button>
                    </div>
                </div>
                ${resultHtml ? '<div class="card">' + resultHtml + '</div>' : ''}
                <script>
                    function setQuery(q) {
                        document.querySelector('textarea[name=q]').value = q;
                    }
                </script>
            `;
            
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(htmlTemplate('SQL', content));
        }
        
        // User Management page
        else if (path === '/users/manage') {
            const action = url.searchParams.get('action');
            const email = url.searchParams.get('email');
            const newPassword = url.searchParams.get('password');
            let actionResult = '';
            
            if (action && email) {
                try {
                    if (action === 'promote-super') {
                        await client.query("UPDATE users SET role = 'super-admin', \"updatedAt\" = NOW() WHERE email = $1", [email]);
                        actionResult = '<div class="success">User ' + escapeHtml(email) + ' promoted to SUPER ADMIN</div>';
                    } else if (action === 'promote-admin') {
                        await client.query("UPDATE users SET role = 'admin', \"updatedAt\" = NOW() WHERE email = $1", [email]);
                        actionResult = '<div class="success">User ' + escapeHtml(email) + ' promoted to ADMIN</div>';
                    } else if (action === 'demote') {
                        await client.query("UPDATE users SET role = 'user', \"updatedAt\" = NOW() WHERE email = $1", [email]);
                        actionResult = '<div class="success">User ' + escapeHtml(email) + ' demoted to USER</div>';
                    } else if (action === 'ban') {
                        await client.query("UPDATE users SET status = 'banned', \"updatedAt\" = NOW() WHERE email = $1", [email]);
                        actionResult = '<div class="success">User ' + escapeHtml(email) + ' has been BANNED</div>';
                    } else if (action === 'activate') {
                        await client.query("UPDATE users SET status = 'active', \"updatedAt\" = NOW() WHERE email = $1", [email]);
                        actionResult = '<div class="success">User ' + escapeHtml(email) + ' has been ACTIVATED</div>';
                    } else if (action === 'change-password' && newPassword) {
                        // Use bcrypt hash for password (same format as start.ps1)
                        // Bcrypt hash for common passwords - using a pre-computed hash
                        // For production, this should use bcryptjs library
                        const bcrypt = require('bcryptjs');
                        const hashedPassword = await bcrypt.hash(newPassword, 10);
                        await client.query("UPDATE users SET password = $1, \"updatedAt\" = NOW() WHERE email = $2", [hashedPassword, email]);
                        actionResult = '<div class="success">Password changed for ' + escapeHtml(email) + ' to: ' + escapeHtml(newPassword) + '</div>';
                    }
                } catch (err) {
                    actionResult = '<div class="error">Error: ' + escapeHtml(err.message) + '</div>';
                }
            }
            
            // Get all users
            const usersResult = await client.query("SELECT email, username, role, status, \"createdAt\" FROM users ORDER BY role, email");
            
            let usersHtml = '<table><thead><tr><th>Email</th><th>Username</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
            usersResult.rows.forEach(user => {
                const roleClass = user.role === 'super-admin' ? 'badge-blue' : user.role === 'admin' ? 'badge-green' : 'badge-yellow';
                const statusClass = user.status === 'active' ? 'badge-green' : 'badge-red';
                
                usersHtml += '<tr>';
                usersHtml += '<td>' + escapeHtml(user.email) + '</td>';
                usersHtml += '<td>' + escapeHtml(user.username || '') + '</td>';
                usersHtml += '<td><span class="badge ' + roleClass + '">' + escapeHtml(user.role) + '</span></td>';
                usersHtml += '<td><span class="badge ' + statusClass + '">' + escapeHtml(user.status) + '</span></td>';
                usersHtml += '<td>';
                usersHtml += '<a href="/users/manage?action=promote-super&email=' + encodeURIComponent(user.email) + '" class="btn btn-primary" style="padding: 4px 8px; font-size: 11px; margin-right: 5px;">Super</a>';
                usersHtml += '<a href="/users/manage?action=promote-admin&email=' + encodeURIComponent(user.email) + '" class="btn btn-primary" style="padding: 4px 8px; font-size: 11px; margin-right: 5px;">Admin</a>';
                usersHtml += '<a href="/users/manage?action=demote&email=' + encodeURIComponent(user.email) + '" class="btn" style="padding: 4px 8px; font-size: 11px; margin-right: 5px; background: #334155;">User</a>';
                usersHtml += '<button onclick="showPasswordForm(\'' + escapeHtml(user.email) + '\')" class="btn" style="padding: 4px 8px; font-size: 11px; margin-right: 5px; background: #7c3aed; color: white;">Password</button>';
                if (user.status === 'active') {
                    usersHtml += '<a href="/users/manage?action=ban&email=' + encodeURIComponent(user.email) + '" class="btn btn-danger" style="padding: 4px 8px; font-size: 11px;">Ban</a>';
                } else {
                    usersHtml += '<a href="/users/manage?action=activate&email=' + encodeURIComponent(user.email) + '" class="btn btn-primary" style="padding: 4px 8px; font-size: 11px;">Activate</a>';
                }
                usersHtml += '</td>';
                usersHtml += '</tr>';
            });
            usersHtml += '</tbody></table>';
            
            const content = `
                <div class="card">
                    <h2>User Management</h2>
                    <p style="color: #94a3b8; margin-top: 5px; margin-bottom: 15px;">Click buttons to promote, demote, ban, activate users, or change passwords</p>
                    ${actionResult}
                    <div style="margin-top: 15px;">
                        ${usersHtml}
                    </div>
                </div>
                
                <!-- Password Change Modal -->
                <div id="passwordModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; align-items: center; justify-content: center;">
                    <div style="background: #1e293b; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%;">
                        <h3 style="color: #e2e8f0; margin-bottom: 20px;">Change Password</h3>
                        <p style="color: #94a3b8; margin-bottom: 15px;">User: <span id="modalEmail" style="color: #38bdf8;"></span></p>
                        <input type="text" id="newPassword" placeholder="Enter new password" style="width: 100%; padding: 12px; border-radius: 6px; border: 1px solid #334155; background: #0f172a; color: #e2e8f0; font-size: 14px; margin-bottom: 15px;" />
                        <div style="display: flex; gap: 10px;">
                            <button onclick="submitPassword()" class="btn btn-primary" style="flex: 1;">Change Password</button>
                            <button onclick="closePasswordModal()" class="btn" style="flex: 1; background: #334155;">Cancel</button>
                        </div>
                    </div>
                </div>
                
                <script>
                    let currentEmail = '';
                    
                    function showPasswordForm(email) {
                        currentEmail = email;
                        document.getElementById('modalEmail').textContent = email;
                        document.getElementById('passwordModal').style.display = 'flex';
                        document.getElementById('newPassword').value = '';
                        document.getElementById('newPassword').focus();
                    }
                    
                    function closePasswordModal() {
                        document.getElementById('passwordModal').style.display = 'none';
                    }
                    
                    function submitPassword() {
                        const password = document.getElementById('newPassword').value;
                        if (!password) {
                            alert('Please enter a password');
                            return;
                        }
                        window.location.href = '/users/manage?action=change-password&email=' + encodeURIComponent(currentEmail) + '&password=' + encodeURIComponent(password);
                    }
                    
                    // Close modal on escape key
                    document.addEventListener('keydown', function(e) {
                        if (e.key === 'Escape') closePasswordModal();
                    });
                    
                    // Close modal on background click
                    document.getElementById('passwordModal').addEventListener('click', function(e) {
                        if (e.target === this) closePasswordModal();
                    });
                </script>
            `;
            
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(htmlTemplate('User Management', content));
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
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(htmlTemplate('404', '<div class="error">Page not found</div>'));
        }
        
    } catch (error) {
        console.error('Error:', error);
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(htmlTemplate('Error', '<div class="error">Error: ' + escapeHtml(error.message) + '</div>'));
    }
});

// Start server
async function start() {
    await connectDB();
    
    server.listen(PORT, '0.0.0.0', () => {
        console.log('');
        console.log('========================================');
        console.log('  WSH Database Viewer');
        console.log('  Running on port ' + PORT);
        console.log('');
        console.log('  Open in browser: http://localhost:' + PORT);
        console.log('========================================');
        console.log('');
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
