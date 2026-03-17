/**
 * Account Lockout Manager
 * Tracks failed login attempts and locks accounts after 3 failures
 * Accounts unlock after 30 minutes
 */

class AccountLockoutManager {
    constructor(lockoutsCollection) {
        this.collection = lockoutsCollection;
        this.MAX_ATTEMPTS = 3;
        this.LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
    }

    /**
     * Record a failed login attempt
     * @param {string} studentIDNumber - User's student ID
     * @returns {Promise<boolean>} - True if account is now locked
     */
    async recordFailedAttempt(studentIDNumber) {
        console.log(`🔒 [Lockout] Recording failed attempt for: ${studentIDNumber}`);
        
        const now = new Date();
        const lockoutUntil = new Date(now.getTime() + this.LOCKOUT_DURATION_MS);

        const result = await this.collection.updateOne(
            { studentIDNumber },
            {
                $inc: { failedAttempts: 1 },
                $set: { 
                    lastFailedAttempt: now,
                    lockedUntil: lockoutUntil
                }
            },
            { upsert: true }
        );

        // Check if account is now locked
        const lockout = await this.collection.findOne({ studentIDNumber });
        const isLocked = lockout.failedAttempts >= this.MAX_ATTEMPTS;

        if (isLocked) {
            console.warn(`🔒 [Lockout] Account LOCKED for ${studentIDNumber}. Attempts: ${lockout.failedAttempts}`);
        }

        return isLocked;
    }

    /**
     * Check if account is locked
     * @param {string} studentIDNumber - User's student ID
     * @returns {Promise<boolean>} - True if account is locked
     */
    async isAccountLocked(studentIDNumber) {
        const lockout = await this.collection.findOne({ studentIDNumber });

        if (!lockout) {
            return false; // No lockout record = not locked
        }

        const now = new Date();

        // Check if lockout period has expired
        if (lockout.lockedUntil && now > new Date(lockout.lockedUntil)) {
            console.log(`🔓 [Lockout] Lockout expired for ${studentIDNumber}, resetting`);
            await this.resetLockout(studentIDNumber);
            return false;
        }

        // Account is locked
        if (lockout.failedAttempts >= this.MAX_ATTEMPTS) {
            console.warn(`⛔ [Lockout] Account LOCKED for ${studentIDNumber}`);
            return true;
        }

        return false;
    }

    /**
     * Get remaining lockout time in seconds
     * @param {string} studentIDNumber - User's student ID
     * @returns {Promise<number>} - Seconds remaining (0 if not locked)
     */
    async getRemainingLockoutTime(studentIDNumber) {
        const lockout = await this.collection.findOne({ studentIDNumber });

        if (!lockout || !lockout.lockedUntil) {
            return 0;
        }

        const now = new Date();
        const remaining = (new Date(lockout.lockedUntil).getTime() - now.getTime()) / 1000;

        return Math.max(0, Math.floor(remaining));
    }

    /**
     * Reset lockout for successful login
     * @param {string} studentIDNumber - User's student ID
     * @returns {Promise<void>}
     */
    async resetLockout(studentIDNumber) {
        console.log(`✅ [Lockout] Resetting lockout for: ${studentIDNumber}`);
        await this.collection.deleteOne({ studentIDNumber });
    }

    /**
     * Manually unlock an account (admin only)
     * @param {string} studentIDNumber - User's student ID
     * @returns {Promise<void>}
     */
    async manualUnlock(studentIDNumber) {
        console.log(`🔓 [Lockout] Manually unlocking: ${studentIDNumber}`);
        await this.collection.deleteOne({ studentIDNumber });
    }
}

module.exports = AccountLockoutManager;