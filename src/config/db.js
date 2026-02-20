import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Microsoft SQL Server Configuration
 */
const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'sqm_db', // Ensure this points to the right DB (user likely wants 'master' if that's where tables are, but we respect env)
  port: parseInt(process.env.DB_PORT || '1433', 10),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Debug: Log connection settings
console.log('DB Config:', {
  ...config,
  password: '***masked***',
});

// Connection pool
let pool = null;

export async function getPool() {
  if (pool) return pool;
  try {
    pool = await sql.connect(config);
    console.log(`✅ Connected to Microsoft SQL Server (${config.database})`);
    return pool;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    throw err;
  }
}

async function query(queryText, params = []) {
  const pool = await getPool();
  const request = pool.request();
  
  // Handle named parameters OR inputs.
  // Simple ? replacement for compatibility with existing code
  let mssqlQuery = queryText;
  if (params.length > 0) {
      let paramIndex = 0;
      mssqlQuery = queryText.replace(/\?/g, () => {
        paramIndex++;
        const pName = `param${paramIndex}`;
        return `@${pName}`;
      });
      params.forEach((value, index) => {
          const pName = `param${index + 1}`;
          if (typeof value === 'number') {
              if (Number.isInteger(value)) {
                  request.input(pName, sql.Int, value);
              } else {
                  request.input(pName, sql.Float, value);
              }
          } else if (typeof value === 'boolean') {
               request.input(pName, sql.Bit, value);
          } else if (value instanceof Date) {
               request.input(pName, sql.DateTime, value);
          } else {
              // String or null
              // Force NVarChar for strings to avoid validation issues
              request.input(pName, sql.NVarChar, value);
          }
      });
  }
  
  try {
    const result = await request.query(mssqlQuery);
    return [result.recordset || [], result];
  } catch (err) {
    console.error('Query error:', err.message);
    // console.error('SQL:', mssqlQuery); // debug
    throw err;
  }
}

async function close() {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('Database connection closed');
  }
}

export { sql, close };
export default { query, close, getPool, sql };
