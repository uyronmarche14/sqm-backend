import { v4 as uuidv4 } from 'uuid';
import db, { sql } from '../config/db.js';
import bcrypt from 'bcryptjs';

// USERS table (dbo.USERS - UUID based)
// Schema: user_id, full_name, email, password, role_id, site_id, creation_date, active_flag, last_pasword_change, local_user, login_flag, last_update, updateby, new_flag, change_pw

const mapUserToDto = (user) => ({
  user_id: user.user_id,
  full_name: user.full_name,
  email: user.email,
  role_id: user.role_id,
  site_id: user.site_id,
  active_flag: user.active_flag ? 1 : 0,
  creation_date: user.creation_date,
  last_password_change: user.last_pasword_change, // Note: typo in DB column name
  login_flag: user.login_flag ? 1 : 0,
  local_user: user.local_user ? 1 : 0,
  updateby: user.updateby,
  last_update: user.last_update
});

export const getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM dbo.USERS ORDER BY full_name');
    const users = rows.map(mapUserToDto);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM dbo.USERS WHERE user_id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(mapUserToDto(rows[0]));
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createUser = async (req, res) => {
  const { full_name, email, password, role_id, site_id, active_flag } = req.body;
  
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields: full_name, email, password' });
  }

  // FK fields are required by DB constraints
  if (!role_id || !site_id) {
    return res.status(400).json({ error: 'Missing required fields: role_id and site_id are required' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const now = new Date();
  const userId = uuidv4();

  try {
    const pool = await db.getPool();
    
    // Create User
    const userRequest = pool.request();
    userRequest.input('id', sql.NVarChar, userId);
    userRequest.input('name', sql.NVarChar, full_name);
    userRequest.input('email', sql.NVarChar, email);
    userRequest.input('password', sql.NVarChar, hashedPassword);
    userRequest.input('roleId', sql.NVarChar, role_id);
    userRequest.input('siteId', sql.NVarChar, site_id);
    userRequest.input('activeFlag', sql.Bit, active_flag !== undefined ? active_flag : 1);
    userRequest.input('now', sql.DateTime, now);

    await userRequest.query(`
        INSERT INTO dbo.USERS 
        (user_id, full_name, email, password, role_id, site_id, creation_date, active_flag, last_update, updateby)
        VALUES (@id, @name, @email, @password, @roleId, @siteId, @now, @activeFlag, @now, 'SYSTEM')
    `);

    // Check if role is SUPPLIER - auto-create supplier and link
    const [roleRows] = await db.query('SELECT role_name FROM dbo.ROLES WHERE role_id = ?', [role_id]);
    const roleName = roleRows.length > 0 ? roleRows[0].role_name : '';
    console.log('Role check for auto-supplier - role_id:', role_id, 'role_name:', roleName);
    
    // More flexible matching - check if role name contains "Supplier" (case insensitive)
    if (roleName && roleName.toUpperCase().includes('SUPPLIER')) {
      console.log('Creating auto-supplier for SUPPLIER role user:', full_name);
      
      // Create Supplier
      const supplierId = uuidv4();
      const supplierRequest = pool.request();
      supplierRequest.input('supplierId', sql.NVarChar, supplierId);
      supplierRequest.input('supplierName', sql.NVarChar, full_name); // Same as user name
      supplierRequest.input('siteId', sql.NVarChar, site_id);
      supplierRequest.input('now', sql.DateTime, now);

      await supplierRequest.query(`
          INSERT INTO dbo.SUPPLIERS 
          (supplier_id, supplier_name, site_id, supplier_desc, location, active_flag, last_update, updateby)
          VALUES (@supplierId, @supplierName, @siteId, '', '', 1, @now, 'SYSTEM')
      `);

      // Create SUPPLIERSUSER link
      const linkId = uuidv4();
      const linkRequest = pool.request();
      linkRequest.input('linkId', sql.NVarChar, linkId);
      linkRequest.input('supplierId', sql.NVarChar, supplierId);
      linkRequest.input('userId', sql.NVarChar, userId);
      linkRequest.input('now', sql.DateTime, now);

      await linkRequest.query(`
          INSERT INTO dbo.SUPPLIERSUSER 
          (Id, supplier_id, user_id, active_flag, last_update, updatedby)
          VALUES (@linkId, @supplierId, @userId, 1, @now, 'SYSTEM')
      `);

      console.log('Auto-created supplier:', supplierId, 'linked to user:', userId);
    }

    const [rows] = await db.query('SELECT * FROM dbo.USERS WHERE user_id = ?', [userId]);
    res.status(201).json(mapUserToDto(rows[0]));
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.message.includes('violation of UNIQUE KEY constraint') || error.message.includes('duplicate key')) {
        return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { full_name, email, role_id, site_id, active_flag, login_flag } = req.body;

  console.log('updateUser called with:', { id, full_name, email, role_id, site_id, active_flag, login_flag });
X`X`
  try {
    const [check] = await db.query('SELECT user_id FROM dbo.USERS WHERE user_id = ?', [id]);
    if (check.length === 0) {
        return res.status(404).json({ error: 'User not found' });
    }

    const fields = [];
    const updateValues = [];
    
    if (full_name !== undefined && full_name !== '') { fields.push('full_name = ?'); updateValues.push(full_name); }
    if (email !== undefined && email !== '') { fields.push('email = ?'); updateValues.push(email); }
    
    // Only update FK fields if they are valid UUIDs (non-empty) and exist in DB
    if (role_id !== undefined && role_id !== '' && role_id !== null) { 
      // Verify role exists
      const [roleCheck] = await db.query('SELECT role_id FROM dbo.ROLES WHERE role_id = ?', [role_id]);
      if (roleCheck.length > 0) {
        fields.push('role_id = ?'); 
        updateValues.push(role_id); 
      } else {
        console.warn('Invalid role_id provided, skipping:', role_id);
      }
    }
    
    if (site_id !== undefined && site_id !== '' && site_id !== null) { 
      // Verify site exists
      const [siteCheck] = await db.query('SELECT site_id FROM dbo.MFG_SITES WHERE site_id = ?', [site_id]);
      if (siteCheck.length > 0) {
        fields.push('site_id = ?'); 
        updateValues.push(site_id); 
      } else {
        console.warn('Invalid site_id provided, skipping:', site_id);
      }
    }
    
    if (active_flag !== undefined) { fields.push('active_flag = ?'); updateValues.push(active_flag); }
    if (login_flag !== undefined) { fields.push('login_flag = ?'); updateValues.push(login_flag); }
    
    fields.push('last_update = ?');
    updateValues.push(new Date());

    if (fields.length === 1) { 
        return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(id);
    const sqlStr = `UPDATE dbo.USERS SET ${fields.join(', ')} WHERE user_id = ?`;
    console.log('Executing SQL:', sqlStr, 'with values:', updateValues);
    
    await db.query(sqlStr, updateValues);
    
    const [rows] = await db.query('SELECT * FROM dbo.USERS WHERE user_id = ?', [id]);
    res.json(mapUserToDto(rows[0]));
  } catch (error) {
     console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const changePassword = async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ error: 'New password is required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const now = new Date();
    await db.query('UPDATE dbo.USERS SET password = ?, last_pasword_change = ?, last_update = ? WHERE user_id = ?', [hashedPassword, now, now, id]);
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM dbo.USERS WHERE user_id = ?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
