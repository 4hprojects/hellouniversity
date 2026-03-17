/**
 * Authentication Middleware
 * Provides reusable auth checks for routes
 */

/**
 * Check if user is authenticated
 * Sets req.user with session data
 */
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        req.user = {
            userId: req.session.userId,
            studentIDNumber: req.session.studentIDNumber,
            role: req.session.role,
            firstName: req.session.firstName,
            lastName: req.session.lastName
        };
        return next();
    }
    
    console.warn('⚠️ [Auth] Unauthenticated access attempt');
    return res.status(401).json({ 
        success: false, 
        message: 'Not authenticated. Please log in.' 
    });
};

/**
 * Check if user is teacher or admin
 * Must call isAuthenticated first
 */
const isTeacherOrAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Not authenticated' 
        });
    }

    if (req.user.role === 'teacher' || req.user.role === 'admin') {
        return next();
    }

    console.warn(`⚠️ [Auth] Access denied for ${req.user.studentIDNumber} (role: ${req.user.role})`);
    return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Teacher or admin access required.' 
    });
};

/**
 * Check if user is admin
 * Must call isAuthenticated first
 */
const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Not authenticated' 
        });
    }

    if (req.user.role === 'admin') {
        return next();
    }

    console.warn(`⚠️ [Auth] Admin access denied for ${req.user.studentIDNumber}`);
    return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin access required.' 
    });
};

/**
 * Check if user is student
 * Must call isAuthenticated first
 */
const isStudent = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Not authenticated' 
        });
    }

    if (req.user.role === 'student') {
        return next();
    }

    console.warn(`⚠️ [Auth] Student access denied for ${req.user.studentIDNumber}`);
    return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Student access required.' 
    });
};

module.exports = {
    isAuthenticated,
    isTeacherOrAdmin,
    isAdmin,
    isStudent
};