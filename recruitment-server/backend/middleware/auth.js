
const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is missing.");

    return res.status(500).json({
      success: false,
      message: "Server authentication is not configured."
    });
  }

  const token = req.cookies?.terrahire_token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Please log in to continue."
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.userId) {
      throw new Error("Token does not contain a user ID");
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      organization: decoded.organization || null
    };

    return next();
  } catch (error) {
    res.clearCookie("terrahire_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });

    return res.status(401).json({
      success: false,
      message: "Your session has expired or is invalid. Please log in again."
    });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please log in to continue."
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource."
      });
    }

    return next();
  };
}

module.exports = {
  requireAuth,
  authorizeRoles
};
