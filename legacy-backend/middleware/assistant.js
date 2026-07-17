const assistant = (req, res, next) => {
    if (req.user && (req.user.role === 'assistant')) {
        next();
    } else {
        return res.status(403).json({ msg: 'Access denied. Assistant privileges required.' });
    }
}

module.exports = assistant;


