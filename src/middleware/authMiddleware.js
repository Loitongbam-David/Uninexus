const supabase = require('../config/supabase');

const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Unauthorized. Missing or invalid token." });
    }

    const token = authHeader.split(' ')[1];

    // Verify token with Supabase Auth
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
        return res.status(401).json({ error: "Unauthorized. Token expired or invalid." });
    }

    // Enforce Walled Garden even for token access just in case
    if (!data.user.email.endsWith('@cuchd.in')) {
         return res.status(403).json({ error: "Unauthorized. Invalid Domain." });
    }

    // Attach user information to request for subsequent controllers
    req.user = data.user;
    next();
};

module.exports = { requireAuth };
