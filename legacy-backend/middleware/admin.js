const { USER_ROLES } = require('../configs/enum');

const admin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ msg: 'Authentication required.' });
    }

    const userRole = req.user.role;
    
    // Allow super_admin and admin roles
    if (userRole === USER_ROLES.SUPER_ADMIN || userRole === USER_ROLES.ADMIN) {
        next();
    } else {
        return res.status(403).json({ 
            msg: 'Access denied. Admin privileges required.',
            user_role: userRole
        });
    }
}

module.exports = admin;


