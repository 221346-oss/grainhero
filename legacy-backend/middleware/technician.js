const { USER_ROLES } = require('../configs/enum');

const technician = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ msg: 'Authentication required.' });
    }

    const userRole = req.user.role;
    
    // Allow all roles (technician is the lowest privilege level)
    if (userRole === USER_ROLES.SUPER_ADMIN || 
        userRole === USER_ROLES.ADMIN || 
        userRole === USER_ROLES.MANAGER ||
        userRole === USER_ROLES.TECHNICIAN) {
        next();
    } else {
        return res.status(403).json({ 
            msg: 'Access denied. Technician privileges or higher required.',
            user_role: userRole
        });
    }
}

module.exports = technician;
