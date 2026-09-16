const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  console.log(`🔒 [AUTH] ${req.method} ${req.path} - Checking authentication...`);
  
  try {
    const authHeader = req.headers.authorization;

    // Check Authorization header
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log(`❌ [AUTH] No token provided`);
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Get token
    const token = authHeader.split(" ")[1];
    console.log(`✓ [AUTH] Token found: ${token.substring(0, 20)}...`);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`✓ [AUTH] Token verified for user: ${decoded.email} (${decoded.role})`);

    // Store user information in request
    req.user = decoded;

    // Continue to the protected route
    next();
  } catch (error) {
    console.log(`❌ [AUTH] Token verification failed: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

module.exports = {
  protect,
};
