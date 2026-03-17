/**
 * Audit Logger
 * Logs all auth-related actions to MongoDB tblLogs
 */

class AuditLogger {
    constructor(logsCollection) {
        this.collection = logsCollection;
    }

    /**
     * Log a login attempt
     * @param {Object} params - Log parameters
     * @param {string} params.studentIDNumber - User's student ID
     * @param {string} params.firstName - User's first name
     * @param {string} params.lastName - User's last name
     * @param {string} params.role - User's role (student, teacher, admin)
     * @param {string} params.ip - User's IP address
     * @param {string} params.userAgent - Browser user agent
     * @param {boolean} params.success - Login success/failure
     * @param {string} params.reason - Failure reason (optional)
     * @returns {Promise<void>}
     */
    async logLogin(params) {
        const {
            studentIDNumber,
            firstName,
            lastName,
            role,
            ip,
            userAgent,
            success,
            reason
        } = params;

        const logEntry = {
            timestamp: new Date(),
            action: 'LOGIN',
            success,
            user: {
                studentIDNumber,
                firstName,
                lastName,
                role
            },
            ip,
            userAgent,
            reason: reason || null
        };

        try {
            await this.collection.insertOne(logEntry);
            console.log(`📝 [AuditLog] Login logged: ${studentIDNumber} (${success ? 'SUCCESS' : 'FAILED'})`);
        } catch (err) {
            console.error('❌ [AuditLog] Error logging login:', err);
        }
    }

    /**
     * Log a logout event
     * @param {Object} params - Log parameters
     * @param {string} params.studentIDNumber - User's student ID
     * @param {string} params.firstName - User's first name
     * @param {string} params.lastName - User's last name
     * @param {string} params.role - User's role
     * @param {string} params.ip - User's IP address
     * @param {string} params.userAgent - Browser user agent
     * @returns {Promise<void>}
     */
    async logLogout(params) {
        const {
            studentIDNumber,
            firstName,
            lastName,
            role,
            ip,
            userAgent
        } = params;

        const logEntry = {
            timestamp: new Date(),
            action: 'LOGOUT',
            success: true,
            user: {
                studentIDNumber,
                firstName,
                lastName,
                role
            },
            ip,
            userAgent
        };

        try {
            await this.collection.insertOne(logEntry);
            console.log(`📝 [AuditLog] Logout logged: ${studentIDNumber}`);
        } catch (err) {
            console.error('❌ [AuditLog] Error logging logout:', err);
        }
    }

    /**
     * Log an account lockout event
     * @param {Object} params - Log parameters
     * @param {string} params.studentIDNumber - User's student ID
     * @param {string} params.ip - User's IP address
     * @param {string} params.userAgent - Browser user agent
     * @param {number} params.attempts - Number of failed attempts
     * @returns {Promise<void>}
     */
    async logAccountLockout(params) {
        const {
            studentIDNumber,
            ip,
            userAgent,
            attempts
        } = params;

        const logEntry = {
            timestamp: new Date(),
            action: 'ACCOUNT_LOCKED',
            success: false,
            user: {
                studentIDNumber
            },
            ip,
            userAgent,
            reason: `Account locked after ${attempts} failed login attempts`,
            attempts
        };

        try {
            await this.collection.insertOne(logEntry);
            console.warn(`📝 [AuditLog] Account locked: ${studentIDNumber} after ${attempts} attempts`);
        } catch (err) {
            console.error('❌ [AuditLog] Error logging account lockout:', err);
        }
    }

    /**
     * Log a password reset request
     * @param {Object} params - Log parameters
     * @param {string} params.studentIDNumber - User's student ID
     * @param {string} params.email - User's email
     * @param {string} params.ip - User's IP address
     * @param {string} params.userAgent - Browser user agent
     * @returns {Promise<void>}
     */
    async logPasswordReset(params) {
        const {
            studentIDNumber,
            email,
            ip,
            userAgent
        } = params;

        const logEntry = {
            timestamp: new Date(),
            action: 'PASSWORD_RESET_REQUEST',
            success: true,
            user: {
                studentIDNumber,
                email
            },
            ip,
            userAgent
        };

        try {
            await this.collection.insertOne(logEntry);
            console.log(`📝 [AuditLog] Password reset requested: ${studentIDNumber}`);
        } catch (err) {
            console.error('❌ [AuditLog] Error logging password reset:', err);
        }
    }
}

module.exports = AuditLogger;