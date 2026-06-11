import path from 'node:path';
import { fileURLToPath } from 'node:url';

import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import sql from 'mssql';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPER_ADMIN_ROLE_NAME = 'TIP Administrator (Super User)';
const SUPER_ADMIN_ROLE_DESC = 'Full system access for seeded administrator';
const ADMIN_SITE_NAME = process.env.SEED_ADMIN_SITE_NAME || 'System Admin Site';
const ADMIN_SITE_CODE = process.env.SEED_ADMIN_SITE_CODE || 'SYS-ADMIN';
const ADMIN_FULL_NAME = process.env.SEED_ADMIN_FULL_NAME || 'System Admin';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin123';

function getDbConfig(hostOverride) {
  return {
    server: hostOverride || process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sqm',
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
    },
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

async function connectWithFallback() {
  const configuredHost = process.env.DB_HOST || '127.0.0.1';
  const candidateHosts = configuredHost === 'mssql'
    ? ['mssql', '127.0.0.1', 'localhost']
    : [configuredHost];

  let lastError = null;

  for (const host of candidateHosts) {
    try {
      const pool = await new sql.ConnectionPool(getDbConfig(host)).connect();
      if (host !== configuredHost) {
        console.log(`Connected using fallback host: ${host}`);
      }
      return pool;
    } catch (error) {
      lastError = error;
      if (host !== candidateHosts[candidateHosts.length - 1]) {
        console.warn(`Connection failed for host ${host}, trying next host...`);
      }
    }
  }

  throw lastError;
}

async function findOne(pool, queryBuilder) {
  const request = pool.request();
  const query = queryBuilder(request);
  const result = await query;
  return result.recordset[0] || null;
}

async function ensureSite(pool) {
  const existingSite = await findOne(pool, (request) =>
    request
      .input('siteName', sql.NVarChar, ADMIN_SITE_NAME)
      .query(`
        SELECT TOP 1 site_id
        FROM dbo.MFG_SITES
        WHERE site_name = @siteName
      `)
  );

  if (existingSite) {
    console.log(`Site exists: ${ADMIN_SITE_NAME}`);
    return existingSite.site_id;
  }

  const siteId = uuidv4();
  const now = new Date();

  await pool.request()
    .input('siteId', sql.NVarChar, siteId)
    .input('siteName', sql.NVarChar, ADMIN_SITE_NAME)
    .input('siteDesc', sql.NVarChar, 'Seeded site for administrator login')
    .input('siteCode', sql.NVarChar, ADMIN_SITE_CODE)
    .input('now', sql.DateTime, now)
    .query(`
      INSERT INTO dbo.MFG_SITES (
        site_id,
        site_name,
        site_desc,
        site_code,
        active_flag,
        last_update,
        updateby
      )
      VALUES (
        @siteId,
        @siteName,
        @siteDesc,
        @siteCode,
        1,
        @now,
        'SYSTEM'
      )
    `);

  console.log(`Created site: ${ADMIN_SITE_NAME}`);
  return siteId;
}

async function ensureRole(pool) {
  const existingRole = await findOne(pool, (request) =>
    request
      .input('roleName', sql.NVarChar, SUPER_ADMIN_ROLE_NAME)
      .query(`
        SELECT TOP 1 role_id
        FROM dbo.ROLES
        WHERE role_name = @roleName
      `)
  );

  if (existingRole) {
    console.log(`Role exists: ${SUPER_ADMIN_ROLE_NAME}`);
    return existingRole.role_id;
  }

  const roleId = uuidv4();
  const now = new Date();

  await pool.request()
    .input('roleId', sql.NVarChar, roleId)
    .input('roleName', sql.NVarChar, SUPER_ADMIN_ROLE_NAME)
    .input('roleDesc', sql.NVarChar, SUPER_ADMIN_ROLE_DESC)
    .input('now', sql.DateTime, now)
    .query(`
      INSERT INTO dbo.ROLES (
        role_id,
        role_name,
        role_desc,
        active_flag,
        last_update,
        updateby
      )
      VALUES (
        @roleId,
        @roleName,
        @roleDesc,
        1,
        @now,
        'SYSTEM'
      )
    `);

  console.log(`Created role: ${SUPER_ADMIN_ROLE_NAME}`);
  return roleId;
}

async function ensureAdminUser(pool, roleId, siteId) {
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const existingUser = await findOne(pool, (request) =>
    request
      .input('email', sql.NVarChar, ADMIN_EMAIL)
      .query(`
        SELECT TOP 1 user_id
        FROM dbo.USERS
        WHERE email = @email
      `)
  );

  const now = new Date();

  if (existingUser) {
    await pool.request()
      .input('userId', sql.NVarChar, existingUser.user_id)
      .input('fullName', sql.NVarChar, ADMIN_FULL_NAME)
      .input('email', sql.NVarChar, ADMIN_EMAIL)
      .input('password', sql.NVarChar, hashedPassword)
      .input('roleId', sql.NVarChar, roleId)
      .input('siteId', sql.NVarChar, siteId)
      .input('now', sql.DateTime, now)
      .query(`
        UPDATE dbo.USERS
        SET
          full_name = @fullName,
          email = @email,
          password = @password,
          role_id = @roleId,
          site_id = @siteId,
          active_flag = 1,
          local_user = 1,
          login_flag = 1,
          last_pasword_change = @now,
          last_update = @now,
          updateby = 'SYSTEM',
          change_pw = 0
        WHERE user_id = @userId
      `);

    console.log(`Updated admin user: ${ADMIN_EMAIL}`);
    return existingUser.user_id;
  }

  const userId = uuidv4();

  await pool.request()
    .input('userId', sql.NVarChar, userId)
    .input('fullName', sql.NVarChar, ADMIN_FULL_NAME)
    .input('email', sql.NVarChar, ADMIN_EMAIL)
    .input('password', sql.NVarChar, hashedPassword)
    .input('roleId', sql.NVarChar, roleId)
    .input('siteId', sql.NVarChar, siteId)
    .input('now', sql.DateTime, now)
    .query(`
      INSERT INTO dbo.USERS (
        user_id,
        full_name,
        email,
        password,
        role_id,
        site_id,
        creation_date,
        active_flag,
        last_pasword_change,
        local_user,
        login_flag,
        last_update,
        updateby,
        new_flag,
        change_pw
      )
      VALUES (
        @userId,
        @fullName,
        @email,
        @password,
        @roleId,
        @siteId,
        @now,
        1,
        @now,
        1,
        1,
        @now,
        'SYSTEM',
        0,
        0
      )
    `);

  console.log(`Created admin user: ${ADMIN_EMAIL}`);
  return userId;
}

async function seed() {
  let pool;

  try {
    pool = await connectWithFallback();

    console.log('Seeding admin data...');

    const siteId = await ensureSite(pool);
    const roleId = await ensureRole(pool);
    const userId = await ensureAdminUser(pool, roleId, siteId);

    console.log('');
    console.log('Admin seed complete.');
    console.log(`  Email: ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log(`  User ID: ${userId}`);
    console.log(`  Role ID: ${roleId}`);
    console.log(`  Site ID: ${siteId}`);
  } catch (error) {
    console.error('Failed to seed admin data:', error);
    process.exitCode = 1;
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

await seed();
