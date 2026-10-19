
const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const token = req.cookies?.terrahire_token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Please log in to continue."
    });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.clearCookie("terrahire_token");
    return res.status(401).json({
      success: false,
      message: "Your session has expired. Please log in again."
    });
  }
}

module.exports = { requireAuth };