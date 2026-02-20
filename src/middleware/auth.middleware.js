import jwt from 'jsonwebtoken';
import db from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeychangeinproduction';

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request (req.user)
 */
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        name: 'UnauthorizedError',
        message: 'No token provided' // 401
      }
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach decoded user info (userId, roleId, siteId, etc) to request
    req.user = decoded;
    
    // Optional: Check active status from DB if critical (Tradeoff: Performance)
    // For now, we trust the token expiration (15m)
    
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
            success: false, 
            error: {
                name: 'UnauthorizedError',
                message: 'Token expired' 
            }
        }); 
    }
    return res.status(403).json({
        success: false,
        error: {
            name: 'ForbiddenError',
            message: 'Invalid token' // 403
        }
    });
  }
};
