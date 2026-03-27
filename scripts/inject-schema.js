#!/usr/bin/env node
/**
 * WSH Database Schema Injector
 * Reads JSON schema and creates PostgreSQL tables
 * Usage: node inject-schema.js [--drop] [--verbose]
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Parse command line args
const args = process.argv.slice(2);
const shouldDrop = args.includes('--drop');
const verbose = args.includes('--verbose');

// Database connection
const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://wsh:wsh123@postgres:5432/wshdb'
});

// Load JSON schema
function loadSchema() {
  const schemaPath = path.join(__dirname, '..', 'schema', 'tables.json');
  
  if (!fs.existsSync(schemaPath)) {
    log('red', `ERROR: Schema file not found at ${schemaPath}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(schemaPath, 'utf8');
  return JSON.parse(content);
}

// Generate CREATE TABLE SQL from JSON
function generateCreateTableSQL(tableName, tableDef) {
  let sql = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n`;
  
  const columns = tableDef.columns.map(col => {
    let colDef = `  "${col.name}" ${col.type}`;
    
    if (col.primary) {
      colDef += ' PRIMARY KEY';
    }
    
    if (col.default) {
      colDef += ` DEFAULT ${col.default}`;
    }
    
    if (!col.nullable && !col.primary) {
      colDef += ' NOT NULL';
    }
    
    if (col.unique && !col.primary) {
      colDef += ' UNIQUE';
    }
    
    return colDef;
  });
  
  sql += columns.join(',\n');
  sql += '\n);';
  
  return sql;
}

// Generate index creation SQL
function generateIndexSQL(tableName, tableDef) {
  const statements = [];
  
  if (tableDef.indexes) {
    for (const idx of tableDef.indexes) {
      const unique = idx.unique ? 'UNIQUE ' : '';
      const cols = idx.columns.map(c => `"${c}"`).join(', ');
      statements.push(`CREATE ${unique}INDEX IF NOT EXISTS "${idx.name}" ON "${tableName}" (${cols});`);
    }
  }
  
  return statements;
}

// Generate foreign key SQL (as ALTER TABLE)
function generateForeignKeySQL(tableName, tableDef) {
  const statements = [];
  
  if (tableDef.foreignKeys) {
    for (const fk of tableDef.foreignKeys) {
      const cols = fk.columns.map(c => `"${c}"`).join(', ');
      const refCols = fk.refColumns.map(c => `"${c}"`).join(', ');
      let stmt = `ALTER TABLE "${tableName}" DROP CONSTRAINT IF EXISTS "${fk.name}";`;
      statements.push(stmt);
      
      stmt = `ALTER TABLE "${tableName}" ADD CONSTRAINT "${fk.name}" FOREIGN KEY (${cols}) REFERENCES "${fk.references}"(${refCols}) ON DELETE ${fk.onDelete};`;
      statements.push(stmt);
    }
  }
  
  return statements;
}

// Generate DROP TABLE SQL
function generateDropSQL(schema) {
  // Drop in reverse order due to foreign keys
  const tables = [...schema.tableOrder].reverse();
  return tables.map(t => `DROP TABLE IF EXISTS "${t}" CASCADE;`);
}

// Main execution
async function main() {
  log('cyan', '========================================');
  log('cyan', '  WSH Database Schema Injector');
  log('cyan', '========================================');
  log('white', '');
  
  try {
    // Load schema
    log('blue', '[1/5] Loading JSON schema...');
    const schema = loadSchema();
    log('green', `      Found ${Object.keys(schema.tables).length} tables`);
    if (verbose) {
      log('white', `      Tables: ${schema.tableOrder.join(', ')}`);
    }
    
    // Connect to database
    log('blue', '[2/5] Connecting to PostgreSQL...');
    await client.connect();
    log('green', '      Connected successfully');
    
    // Drop tables if requested
    if (shouldDrop) {
      log('yellow', '[3/5] Dropping existing tables (CASCADE)...');
      const dropStatements = generateDropSQL(schema);
      for (const stmt of dropStatements) {
        if (verbose) log('white', `      ${stmt}`);
        await client.query(stmt);
      }
      log('green', '      Tables dropped');
    } else {
      log('white', '[3/5] Skipping drop (--drop not specified)');
    }
    
    // Create tables in order
    log('blue', '[4/5] Creating tables...');
    for (const tableName of schema.tableOrder) {
      const tableDef = schema.tables[tableName];
      
      // Check if table exists
      const checkResult = await client.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
        [tableName]
      );
      
      if (checkResult.rows[0].exists && !shouldDrop) {
        log('yellow', `      Table "${tableName}" already exists - skipping`);
        continue;
      }
      
      const createSQL = generateCreateTableSQL(tableName, tableDef);
      if (verbose) {
        log('white', `      Creating table: ${tableName}`);
        console.log(createSQL);
      }
      
      await client.query(createSQL);
      log('green', `      ✓ Created table: ${tableName}`);
    }
    
    // Create indexes
    log('blue', '[4.5/5] Creating indexes...');
    for (const tableName of schema.tableOrder) {
      const tableDef = schema.tables[tableName];
      const indexStatements = generateIndexSQL(tableName, tableDef);
      
      for (const stmt of indexStatements) {
        if (verbose) log('white', `      ${stmt}`);
        await client.query(stmt);
      }
      
      if (indexStatements.length > 0) {
        log('green', `      ✓ Created ${indexStatements.length} indexes for ${tableName}`);
      }
    }
    
    // Create foreign keys
    log('blue', '[4.7/5] Creating foreign keys...');
    for (const tableName of schema.tableOrder) {
      const tableDef = schema.tables[tableName];
      const fkStatements = generateForeignKeySQL(tableName, tableDef);
      
      for (const stmt of fkStatements) {
        if (verbose) log('white', `      ${stmt}`);
        await client.query(stmt);
      }
      
      if (fkStatements.length > 0) {
        log('green', `      ✓ Created foreign keys for ${tableName}`);
      }
    }
    
    // Verify tables
    log('blue', '[5/5] Verifying tables...');
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    log('green', '      Tables in database:');
    for (const row of result.rows) {
      log('white', `      - ${row.table_name}`);
    }
    
    log('cyan', '');
    log('green', '========================================');
    log('green', '  Schema injection completed successfully!');
    log('green', '========================================');
    
  } catch (error) {
    log('red', '');
    log('red', '========================================');
    log('red', '  ERROR: Schema injection failed!');
    log('red', '========================================');
    log('red', `  ${error.message}`);
    
    if (verbose && error.stack) {
      log('red', error.stack);
    }
    
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run
main();
