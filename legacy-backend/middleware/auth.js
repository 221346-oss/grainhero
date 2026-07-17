const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { USER_STATUSES } = require("../configs/enum");

const auth = async (req, res, next) => {
  try {
    console.log("=== AUTH MIDDLEWARE ===");
    console.log("Authorization header:", req.header("Authorization"));

    let token = req.header("Authorization");

    if (!token) {
      console.log("No authorization token found");
      return res
        .status(401)
        .json({ msg: "Authorization denied. Token not found." });
    }

    // Handle Bearer token format
    token = token.startsWith("Bearer ") ? token.split(" ")[1] : token;
    console.log("Extracted token:", token.substring(0, 20) + "...");

    // Verify JWT signature
    console.log(
      "Verifying JWT with secret:",
      process.env.JWT_SECRET ? "Secret exists" : "No secret"
    );
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded JWT:", decoded);

    // Get user details from database with fresh data
    const user = await User.findById(decoded.user.id).select("-password");
    console.log("Found user:", user ? "User exists" : "User not found");

    if (!user) {
      return res.status(401).json({ msg: "User not found." });
    }

    if (user.blocked) {
      return res.status(403).json({ msg: "User account is blocked." });
    }

    // Attach user to request
    req.user = user;
    req.token = token;

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(401).json({ msg: "Token is not valid." });
  }
};

// Optional auth middleware - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    let token = req.header("Authorization");

    if (!token) {
      req.user = null;
      return next();
    }

    token = token.startsWith("Bearer ") ? token.split(" ")[1] : token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.user.id).select("-password");

    if (user && !user.blocked) {
      req.user = user;
      req.token = token;
    } else {
      req.user = null;
    }

    next();
  } catch (err) {
    req.user = null;
    next();
  }
};

module.exports = { auth, optionalAuth };
