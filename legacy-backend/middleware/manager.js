const { USER_ROLES } = require('../configs/enum');

const manager = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ msg: 'Authentication required.' });
    }

    const userRole = req.user.role;
    
    // Allow super_admin, admin, and manager roles
    if (userRole === USER_ROLES.SUPER_ADMIN || 
        userRole === USER_ROLES.ADMIN || 
        userRole === USER_ROLES.MANAGER) {
        next();
    } else {
        return res.status(403).json({ 
            msg: 'Access denied. Manager privileges or higher required.',
            user_role: userRole
        });
    }
}

module.exports = manager;