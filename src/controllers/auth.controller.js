import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db, { sql } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeychangeinproduction';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'supersecretrefreshkeychangeinproduction';

// USERS table (dbo.USERS - UUID based)
// ROLES table (dbo.ROLES - UUID based)

// Helper to generate tokens
const generateTokens = (user) => {
  const payload = { 
    userId: user.user_id,
    fullName: user.full_name,
    email: user.email, 
    roleId: user.role_id,
    siteId: user.site_id
  };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, { 
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    audience: 'sqm-client',
    issuer: 'sqm-api'
  });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  
  return { accessToken, refreshToken };
};

/**
 * Login - POST /api/auth/login
 */
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: {
        name: 'ValidationError',
        message: 'Email and password are required'
      }
    });
  }

  try {
    const [users] = await db.query(`
      SELECT u.*, r.role_name, r.role_id as role_code
      FROM dbo.USERS u
      LEFT JOIN dbo.ROLES r ON u.role_id = r.role_id
      WHERE u.email = ?
    `, [email]);
    
    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          name: 'NotFoundError',
          message: 'Invalid email or password'
        }
      });
    }

    const user = users[0];
    
    if (!user.active_flag) {
      return res.status(403).json({
        success: false,
        error: {
          name: 'ForbiddenError',
          message: 'Account is deactivated'
        }
      });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          name: 'NotFoundError',
          message: 'Invalid email or password'
        }
      });
    }

    const tokens = generateTokens(user);
    const isAdmin = user.role_name?.toLowerCase().includes('admin') ? 1 : 0;

    const responsePayload = {
      success: true,
      message: 'Welcome back!',
      isSupplier: false, // Supplier association should come from SUPPLIERSUSER table
      userData: {
        USER_ID: user.user_id,
        FULL_NAME: user.full_name,
        EMAIL: user.email,
        ROLE_ID: user.role_id || '',
        SITE_ID: user.site_id || '', 
        ROLE_NAME: user.role_name || 'User',
        SITE_NAME: '', 
        CREATION_DATE: user.creation_date,
        ACTIVE_FLAG: user.active_flag ? true : false,
        LAST_PASWORD_CHANGE: user.last_pasword_change,
        LOCAL_USER: user.local_user ? true : false,
        LOGIN_FLAG: user.login_flag ? true : false,
        LAST_UPDATE: user.last_update,
        UPDATEBY: user.updateby,
        isAdmin: isAdmin
      },
      accessToken: tokens.accessToken,
      mustChangePassword: user.change_pw ? true : false, 
      userMenu: [], 
      accessibleForms: [] 
    };

    console.log('Login Response Payload:', JSON.stringify(responsePayload, null, 2));

    res.json(responsePayload);

  } catch (error) {
    console.error('Login error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      error: {
        name: 'InternalServerError',
        message: 'An unexpected error occurred'
      }
    });
  }
};

/**
 * Register - POST /api/auth/register
 */
export const register = async (req, res) => {
  const { name, email, password, roleId, siteId } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      error: {
        name: 'ValidationError',
        message: 'Missing required fields: name, email, password'
      }
    });
  }

  // FK fields are required by DB constraints
  if (!roleId || !siteId) {
    return res.status(400).json({
      success: false,
      error: {
        name: 'ValidationError',
        message: 'Missing required fields: roleId and siteId are required'
      }
    });
  }

  try {
    const [existing] = await db.query('SELECT user_id FROM dbo.USERS WHERE email = ?', [email]);
    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          name: 'ConflictError',
          message: 'User already exists'
        }
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();
    const id = uuidv4();

    const pool = await db.getPool();
    const request = pool.request();
    request.input('id', sql.NVarChar, id);
    request.input('name', sql.NVarChar, name);
    request.input('email', sql.NVarChar, email);
    request.input('password', sql.NVarChar, hashedPassword);
    request.input('roleId', sql.NVarChar, roleId);
    request.input('siteId', sql.NVarChar, siteId);
    request.input('now', sql.DateTime, now);

    await request.query(`
      INSERT INTO dbo.USERS (user_id, full_name, email, password, role_id, site_id, creation_date, active_flag, last_update, updateby, change_pw)
      VALUES (@id, @name, @email, @password, @roleId, @siteId, @now, 1, @now, 'SYSTEM', 1)
    `);

    const [newUsers] = await db.query(`
      SELECT u.*, r.role_name
      FROM dbo.USERS u
      LEFT JOIN dbo.ROLES r ON u.role_id = r.role_id
      WHERE u.email = ?
    `, [email]);
    
    const user = newUsers[0];
    const tokens = generateTokens(user);

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      isSupplier: false,
      userData: {
        USER_ID: user.user_id,
        FULL_NAME: user.full_name,
        EMAIL: user.email,
        ROLE_ID: user.role_id || '',
        ROLE_NAME: user.role_name || 'User',
        SITE_NAME: '',
        CREATION_DATE: user.creation_date,
        ACTIVE_FLAG: true,
        isAdmin: 0
      },
      accessToken: tokens.accessToken,
      mustChangePassword: true,
      userMenu: [],
      accessibleForms: []
    });

  } catch (error) {
    console.error('Register error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      error: {
        name: 'InternalServerError',
        message: 'An unexpected error occurred'
      }
    });
  }
};

/**
 * Change Password - POST /api/auth/change-password
 */
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: {
        name: 'UnauthorizedError',
        message: 'Authentication required'
      }
    });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    
    const [users] = await db.query('SELECT * FROM dbo.USERS WHERE user_id = ?', [userId]);
    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          name: 'NotFoundError',
          message: 'User not found'
        }
      });
    }

    const user = users[0];

    if (currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: {
            name: 'UnauthorizedError',
            message: 'Current password is incorrect'
          }
        });
      }
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          name: 'ValidationError',
          message: 'New password must be at least 8 characters'
        }
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const now = new Date();

    await db.query(`
      UPDATE dbo.USERS 
      SET password = ?, last_pasword_change = ?, last_update = ?, change_pw = 0
      WHERE user_id = ?
    `, [hashedPassword, now, now, userId]);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          name: 'UnauthorizedError',
          message: 'Invalid or expired token'
        }
      });
    }
    console.error('Change password error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      error: {
        name: 'InternalServerError',
        message: 'An unexpected error occurred'
      }
    });
  }
};

/**
 * Refresh Token - POST /api/auth/refresh
 */
export const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: {
        name: 'ValidationError',
        message: 'Refresh token required'
      }
    });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const userId = decoded.userId;
    
    const [users] = await db.query('SELECT * FROM dbo.USERS WHERE user_id = ?', [userId]);
    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          name: 'UnauthorizedError',
          message: 'User not found'
        }
      });
    }
    
    const user = users[0];
    const tokens = generateTokens(user);
    
    res.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: {
        name: 'ForbiddenError',
        message: 'Invalid refresh token'
      }
    });
  }
};

/**
 * Logout - POST /api/auth/logout
 */
export const logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

/**
 * Get Current User - GET /api/auth/me
 */
export const me = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: {
        name: 'UnauthorizedError',
        message: 'No token provided'
      }
    });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    
    const [users] = await db.query(`
      SELECT u.*, r.role_name
      FROM dbo.USERS u
      LEFT JOIN dbo.ROLES r ON u.role_id = r.role_id
      WHERE u.user_id = ?
    `, [userId]);
    
    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          name: 'NotFoundError',
          message: 'User not found'
        }
      });
    }
     
    const user = users[0];
    const isAdmin = user.role_name?.toLowerCase().includes('admin') ? 1 : 0;
    
    res.json({
      success: true,
      userData: {
        USER_ID: user.user_id,
        FULL_NAME: user.full_name,
        EMAIL: user.email,
        ROLE_ID: user.role_id || '',
        SITE_ID: user.site_id || '',
        ROLE_NAME: user.role_name || 'User',
        SITE_NAME: '',
        CREATION_DATE: user.creation_date,
        ACTIVE_FLAG: user.active_flag ? true : false,
        isAdmin: isAdmin
      }
    });
  } catch(e) {
    return res.status(401).json({
      success: false,
      error: {
        name: 'UnauthorizedError',
        message: 'Invalid token'
      }
    });
  }
};
