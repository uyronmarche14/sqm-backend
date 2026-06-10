# Auth Module API

**Documentation status:** ✅ Active

## Overview

Authentication and authorization module. Handles login, logout, JWT token management, password management, and current user context.

## Endpoints

All under `/api/auth`.

### POST `/login`

Authenticate with email and password. Returns JWT tokens and user context.

**Protection:** Rate-limited (10 attempts/hour/IP via `authLimiter`).

**Request Body:**
```json
{
  "email": "admin@gmail.com",
  "password": "admin123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Welcome back!",
  "userData": {
    "USER_ID": "USER-SYSTEM-ADMIN",
    "FULL_NAME": "...",
    "EMAIL": "...",
    "ROLE_ID": "ROLE-SUPER-ADMIN",
    "SITE_ID": "SITE-SYSTEM",
    "ROLE_NAME": "...",
    "ACTIVE_FLAG": true,
    "LOGIN_FLAG": true,
    "LOCAL_USER": true,
    "isAdmin": 1
  },
  "tokens": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Error Responses:**
| Code | Condition |
|---|---|
| 401 | Invalid credentials |
| 429 | Rate limit exceeded |

---

### POST `/logout`

Clear refresh cookie.

**Protection:** Public.

---

### POST `/refresh`

Exchange refresh token for a new access token.

**Protection:** Rate-limited via `authRefreshLimiter`. Reads refresh token from httpOnly cookie.

---

### GET `/me`

Get current user's profile, permissions, and accessible forms.

**Protection:** `requireAuth` middleware.

**Response:** Full user context including assigned roles, accessible form codes, and menu structure.

**Error Responses:**
| Code | Condition |
|---|---|
| 401 | No valid access token |
| 404 | User not found |

---

### POST `/change-password`

Change authenticated user's password.

**Protection:** `requireAuth` middleware.

**Request Body:**
```json
{
  "currentPassword": "old123",
  "newPassword": "new456"
}
```

**Error Responses:**
| Code | Condition |
|---|---|
| 400 | Current password incorrect |
| 400 | New password too short (min 6 chars) |

---

### POST `/forgot-password`

Send password reset email.

**Protection:** Rate-limited via `authLimiter`.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Note:** Requires email transport configured (SMTP or file).

---

### POST `/reset-password`

Reset password with token from email.

**Protection:** Rate-limited via `authLimiter`.

**Request Body:**
```json
{
  "token": "...",
  "newPassword": "new456"
}
```

## Request Flow

```
Login → JWT access token (8h) + httpOnly refresh cookie (7d)
                ↓
         Protected routes (requireAuth middleware)
                ↓
         Token expired? → POST /refresh
                ↓
         Change password? → POST /change-password
```
