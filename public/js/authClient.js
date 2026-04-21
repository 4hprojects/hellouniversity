/**
 * Auth Client
 * Frontend helper for authentication
 * Reusable across all pages (main, CRFV, Attendance)
 */

class AuthClient {
    constructor() {
        this.baseUrl = window.location.origin;
    }

    sanitizeReturnTo(returnTo) {
        const value = String(returnTo || '').trim();
        if (!value || !value.startsWith('/') || value.startsWith('//') || /[\r\n]/.test(value)) {
            return null;
        }

        try {
            const parsed = new URL(value, this.baseUrl);
            if (parsed.origin !== this.baseUrl) {
                return null;
            }
            return `${parsed.pathname}${parsed.search}${parsed.hash}`;
        } catch (_err) {
            return null;
        }
    }

    /**
     * Check if user is authenticated
     * @returns {Promise<boolean>}
     */
    async isAuthenticated() {
        try {
            const res = await fetch(`${this.baseUrl}/api/check-auth`);
            const data = await res.json();
            return data.authenticated === true;
        } catch (err) {
            console.error('❌ [AuthClient] Error checking auth:', err);
            return false;
        }
    }

    /**
     * Get current user details
     * @returns {Promise<Object|null>} - User object or null if not authenticated
     */
    async getCurrentUser() {
        try {
            const res = await fetch(`${this.baseUrl}/api/user-details`);
            if (res.status === 401) {
                return null;
            }
            const data = await res.json();
            return data.success ? data.user : null;
        } catch (err) {
            console.error('❌ [AuthClient] Error getting user details:', err);
            return null;
        }
    }

    /**
     * Login with student ID and password
     * @param {string} studentIDNumber
     * @param {string} password
     * @returns {Promise<Object>} - { success, message, user }
     */
    async login(studentIDNumber, password, options = {}) {
        try {
            const returnTo = this.sanitizeReturnTo(options.returnTo);
            const res = await fetch(`${this.baseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ studentIDNumber, password, returnTo })
            });

            const data = await res.json();
            return {
                success: res.ok && data.success,
                message: data.message || 'Login failed',
                user: data.user || null,
                role: data.role || data.user?.role || null,
                redirectPath: data.redirectPath || this.getDashboardPath(data.role || data.user?.role),
                statusCode: res.status
            };
        } catch (err) {
            console.error('❌ [AuthClient] Login error:', err);
            return {
                success: false,
                message: 'Network error. Please try again.',
                user: null,
                statusCode: 0
            };
        }
    }

    /**
     * Logout current user
     * @returns {Promise<Object>} - { success, message }
     */
    async logout(options = {}) {
        try {
            const returnTo = this.sanitizeReturnTo(
                options.returnTo || `${window.location.pathname}${window.location.search}${window.location.hash}`
            );
            const res = await fetch(`${this.baseUrl}/auth/logout`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ returnTo })
            });

            const data = await res.json();
            return {
                success: res.ok && data.success,
                message: data.message || 'Logout failed',
                redirectPath: data.redirectPath || (returnTo?.startsWith('/crfv') ? '/crfv' : '/login')
            };
        } catch (err) {
            console.error('❌ [AuthClient] Logout error:', err);
            return {
                success: false,
                message: 'Network error. Please try again.',
                redirectPath: '/login'
            };
        }
    }

    /**
     * Redirect to login if not authenticated
     * @returns {Promise<void>}
     */
    async requireAuth() {
        const authenticated = await this.isAuthenticated();
        if (!authenticated) {
            console.log('⚠️ [AuthClient] Not authenticated, redirecting to login');
            window.location.href = `${this.baseUrl}/login`;
        }
    }

    /**
     * Redirect to dashboard if already authenticated
     * Useful for login page - don't show login if already logged in
     * @returns {Promise<void>}
     */
    async redirectIfAuthenticated(options = {}) {
        try {
            const res = await fetch(`${this.baseUrl}/api/check-auth`);
            const data = await res.json();
            if (data.authenticated) {
                const redirectPath = this.sanitizeReturnTo(options.returnTo)
                    || data.redirectPath
                    || this.getDashboardPath(data.user?.role);
                console.log('✅ [AuthClient] Already authenticated, redirecting to dashboard');
                window.location.href = `${this.baseUrl}${redirectPath}`;
            }
        } catch (err) {
            console.error('❌ [AuthClient] Error checking redirect auth:', err);
        }
    }

    getDashboardPath(role) {
        if (window.roleRedirects && typeof window.roleRedirects.getDashboardPath === 'function') {
            return window.roleRedirects.getDashboardPath(role);
        }

        switch (role) {
            case 'admin':
                return '/admin_dashboard';
            case 'teacher':
                return '/teacher/dashboard';
            case 'manager':
                return '/crfv';
            case 'student':
            default:
                return '/dashboard';
        }
    }

    /**
     * Get user's role
     * @returns {Promise<string|null>} - Role or null if not authenticated
     */
    async getUserRole() {
        const user = await this.getCurrentUser();
        return user?.role || null;
    }

    /**
     * Check if user has specific role
     * @param {string|string[]} roles - Role(s) to check
     * @returns {Promise<boolean>}
     */
    async hasRole(roles) {
        const rolesArray = Array.isArray(roles) ? roles : [roles];
        const userRole = await this.getUserRole();
        return userRole && rolesArray.includes(userRole);
    }
}

// Export as global for easy use
window.authClient = new AuthClient();
