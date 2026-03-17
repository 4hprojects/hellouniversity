# HelloUniversity Database Schema

## Overview

This document describes the MongoDB collections and schemas used in the HelloUniversity modular auth system.

---

## Collections

### 1. `tblAccountLockouts` (NEW - Auth System)

**Purpose**: Track failed login attempts and manage account lockouts

**Auto-cleanup**: Documents expire 30 minutes after `lockedUntil`

**Schema**:
```javascript
{
  _id: ObjectId,
  studentIDNumber: string,      // Unique index
  failedAttempts: number,        // Count of failed attempts
  lockedUntil: Date,             // When account unlocks (TTL)
  lastFailedAttempt: Date        // Timestamp of last failed attempt
}
```

**Indexes**:
- `studentIDNumber` (UNIQUE) - Fast lookups by student ID
- `lockedUntil` (TTL) - Auto-delete expired documents
- `lastFailedAttempt` - For analytics

**Example Document**:
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  studentIDNumber: "S12345",
  failedAttempts: 3,
  lockedUntil: ISODate("2025-11-20T15:30:00.000Z"),
  lastFailedAttempt: ISODate("2025-11-19T15:30:00.000Z")
}
```

**Lifecycle**:
- Created on first failed login
- Incremented with each failed attempt
- Auto-deleted 30 minutes after `lockedUntil` (TTL)
- Manually deleted on successful login

---

### 2. `tblLogs` (Audit Trail)

**Purpose**: Log all authentication and system events for auditing

**Retention**: Keep for at least 90 days

**Schema**:
```javascript
{
  _id: ObjectId,
  timestamp: Date,               // When event occurred
  action: string,                // LOGIN, LOGOUT, ACCOUNT_LOCKED, PASSWORD_RESET_REQUEST
  success: boolean,              // Whether action succeeded
  user: {
    studentIDNumber: string,     // User's unique ID
    firstName: string,           // User's first name
    lastName: string,            // User's last name
    role: string                 // student, teacher, admin
  },
  ip: string,                    // Client IP address
  userAgent: string,             // Browser user agent
  reason: string,                // Why action failed (optional)
  attempts: number               // Number of failed attempts (optional)
}
```

**Indexes**:
- `timestamp` - Chronological queries
- `action` - Filter by action type
- `user.studentIDNumber` - User-specific logs
- `success` - Filter success/failure
- Compound: `user.studentIDNumber + action + timestamp`

**Example Documents**:

**Login Success**:
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439012"),
  timestamp: ISODate("2025-11-19T15:00:00.000Z"),
  action: "LOGIN",
  success: true,
  user: {
    studentIDNumber: "S12345",
    firstName: "John",
    lastName: "Doe",
    role: "student"
  },
  ip: "192.168.1.100",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
}
```

**Login Failed**:
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439013"),
  timestamp: ISODate("2025-11-19T14:55:00.000Z"),
  action: "LOGIN",
  success: false,
  user: {
    studentIDNumber: "S12345",
    firstName: "John",
    lastName: "Doe",
    role: "student"
  },
  ip: "192.168.1.100",
  userAgent: "Mozilla/5.0...",
  reason: "Password mismatch (attempt 2)"
}
```

**Account Locked**:
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439014"),
  timestamp: ISODate("2025-11-19T14:57:00.000Z"),
  action: "ACCOUNT_LOCKED",
  success: false,
  user: {
    studentIDNumber: "S12345"
  },
  ip: "192.168.1.100",
  userAgent: "Mozilla/5.0...",
  reason: "Account locked after 3 failed login attempts",
  attempts: 3
}
```

---

### 3. `tblUser` (User Credentials)

**Purpose**: Store user accounts and authentication data

**Schema**:
```javascript
{
  _id: ObjectId,
  studentIDNumber: string,       // Unique ID (unique index)
  email: string,                 // Email address (sparse index)
  password: string,              // bcrypt hashed password
  firstName: string,             // User's first name
  lastName: string,              // User's last name
  role: string,                  // "student", "teacher", or "admin"
  resetOTP: string,              // OTP for password reset (optional)
  resetOTPExpires: Date,         // When OTP expires (optional)
  createdAt: Date,               // Account creation date
  updatedAt: Date                // Last update
}
```

**Indexes**:
- `studentIDNumber` (UNIQUE) - Fast login lookups
- `email` (SPARSE) - For password reset flow
- `role` - Role-based queries

**Example Document**:
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439015"),
  studentIDNumber: "S12345",
  email: "john.doe@university.edu",
  password: "$2b$10$abcdefghijklmnopqrstuvwxyz123456", // bcrypt hash
  firstName: "John",
  lastName: "Doe",
  role: "student",
  createdAt: ISODate("2025-01-01T00:00:00.000Z"),
  updatedAt: ISODate("2025-11-19T00:00:00.000Z")
}
```

---

## Useful MongoDB Queries

### Get user's login history
```javascript
db.tblLogs.find({
  "user.studentIDNumber": "S12345",
  "action": "LOGIN"
}).sort({ timestamp: -1 }).limit(10)
```

### Check if user is currently locked
```javascript
db.tblAccountLockouts.findOne({ studentIDNumber: "S12345" })
```

### Get all failed logins in the last hour
```javascript
db.tblLogs.find({
  "action": "LOGIN",
  "success": false,
  "timestamp": { $gte: new Date(Date.now() - 60 * 60 * 1000) }
}).sort({ timestamp: -1 })
```

### Get user's audit trail (last 30 days)
```javascript
db.tblLogs.find({
  "user.studentIDNumber": "S12345",
  "timestamp": { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
}).sort({ timestamp: -1 })
```

### Delete old logs (older than 90 days)
```javascript
db.tblLogs.deleteMany({
  "timestamp": { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
})
```

### Get locked accounts
```javascript
db.tblAccountLockouts.find({ lockedUntil: { $gt: new Date() } })
```

### Unlock a specific account manually
```javascript
db.tblAccountLockouts.deleteOne({ studentIDNumber: "S12345" })
```

---

## Index Performance

**Total Indexes**: 11 across 3 collections
- tblAccountLockouts: 3 indexes
- tblLogs: 5 indexes
- tblUser: 3 indexes

**Estimated Storage**: 15-20 MB for typical installation

**TTL Behavior**: 
- Documents auto-delete 30 minutes after `lockedUntil`
- MongoDB checks every 60 seconds
- Reduces manual cleanup needs

---
