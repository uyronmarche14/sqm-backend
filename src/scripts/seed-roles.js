import { v4 as uuidv4 } from 'uuid';
import db, { sql } from '../config/db.js';

// Roles to seed based on the system RBAC requirements
const roles = [
  { name: 'TIP Administrator (Super User)', code: 'TIP_ADMIN', desc: 'Full system access, super user privileges' },
  { name: 'TIP IQA Dept', code: 'TIP_IQA', desc: 'IQA Department access' },
  { name: 'TIP MED Dept', code: 'TIP_MED', desc: 'MED Department access' },
  { name: 'TIP SQA Dept', code: 'TIP_SQA', desc: 'SQA Department access' },
  { name: 'TIP MPD Dept', code: 'TIP_MPD', desc: 'MPD Department access' },
  { name: 'Suppliers', code: 'SUPPLIER', desc: 'Supplier user access' },
  { name: 'SAE (China)', code: 'SAE', desc: 'SAE China access' },
  { name: 'Yokohama (Japan)', code: 'JAPAN', desc: 'Yokohama Japan access' },
];

const seedRoles = async () => {
  console.log('--- Seeding Roles into dbo.ROLES ---');
  
  try {
    const pool = await db.getPool();
    const now = new Date();
    
    for (const role of roles) {
      // Check if role already exists by name
      const [existing] = await db.query('SELECT role_id FROM dbo.ROLES WHERE role_name = ?', [role.name]);
      
      if (existing.length > 0) {
        console.log(`⏭️  Role already exists: ${role.name}`);
        continue;
      }

      const id = uuidv4();
      const request = pool.request();
      request.input('id', sql.NVarChar, id);
      request.input('name', sql.NVarChar, role.name);
      request.input('desc', sql.NVarChar, role.desc);
      request.input('now', sql.DateTime, now);

      await request.query(`
        INSERT INTO dbo.ROLES (role_id, role_name, role_desc, active_flag, last_update, updateby)
        VALUES (@id, @name, @desc, 1, @now, 'SYSTEM')
      `);

      console.log(`✅ Created role: ${role.name} (${role.code}) - ID: ${id}`);
    }

    console.log('\n--- Done Seeding Roles ---');
    
    // List all roles
    const [allRoles] = await db.query('SELECT role_id, role_name FROM dbo.ROLES ORDER BY role_name');
    console.log('\nAll Roles in Database:');
    allRoles.forEach(r => console.log(`  - ${r.role_name}: ${r.role_id}`));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding roles:', error.message);
    process.exit(1);
  }
};

seedRoles();
