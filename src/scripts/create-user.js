import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db, { sql } from '../config/db.js';

const args = process.argv.slice(2);
const email = args[0];
const password = args[1];
const fullName = args[2] || 'Script User';
const roleId = args[3] || ''; // UUID for role, empty if not provided
const siteId = args[4] || ''; // UUID for site, required by FK

if (!email || !password) {
  console.log('Usage: node src/scripts/create-user.js <email> <password> [fullName] [roleId] [siteId]');
  process.exit(1);
}

const createUser = async () => {
  try {
    // Check if user exists (using dbo.USERS)
    const [existing] = await db.query('SELECT user_id FROM dbo.USERS WHERE email = ?', [email]);
    if (existing.length > 0) {
      console.log('User already exists with email:', email);
      process.exit(0);
    }

    // Generate UUID
    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();

    const pool = await db.getPool();
    const request = pool.request();
    request.input('id', sql.NVarChar, id);
    request.input('name', sql.NVarChar, fullName);
    request.input('email', sql.NVarChar, email);
    request.input('password', sql.NVarChar, hashedPassword);
    request.input('roleId', sql.NVarChar, roleId);
    request.input('siteId', sql.NVarChar, siteId);
    request.input('now', sql.DateTime, now);

    await request.query(`
      INSERT INTO dbo.USERS 
      (user_id, full_name, email, password, role_id, site_id, creation_date, active_flag, last_update, updateby)
      VALUES (@id, @name, @email, @password, @roleId, @siteId, @now, 1, @now, 'SYSTEM')
    `);

    console.log(`✅ User created successfully!`);
    console.log(`   Email: ${email}`);
    console.log(`   User ID: ${id}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    process.exit(1);
  }
};

createUser();
