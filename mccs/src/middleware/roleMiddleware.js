const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    console.log(`🔑 [ROLE] Checking authorization for roles: [${allowedRoles.join(', ')}]`);
    
    // Check that authentication already happened
    if (!req.user) {
      console.log(`❌ [ROLE] No user object found - authentication missing`);
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    console.log(`👤 [ROLE] User role: ${req.user.role}`);
    
    // Check user's role
    if (!allowedRoles.includes(req.user.role)) {
      console.log(`❌ [ROLE] Access denied - user role '${req.user.role}' not in allowed roles`);
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission.",
      });
    }

    console.log(`✓ [ROLE] Authorization passed`);
    next();
  };
};

module.exports = {
  authorize,
};
