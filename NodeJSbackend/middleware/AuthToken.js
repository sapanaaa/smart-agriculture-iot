import jwt from "jsonwebtoken";
import { promisify } from "util";

const verifyAsync = promisify(jwt.verify);

/**
 * Authentication middleware.
 * Verifies the backend JWT (cookie `backend_token`, falls back to the
 * Authorization: Bearer header) and attaches the decoded payload to
 * req.user = { id, email, user_role, status }.
 */
async function authToken(req, res, next) {
  try {
    const bearer = req.headers?.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;

    const backendToken = req.cookies?.backend_token || bearer;

    if (!backendToken) {
      return res.status(401).json({
        message: "You have to login first.",
        error: true,
        success: false,
      });
    }

    let decoded;
    try {
      decoded = await verifyAsync(backendToken, process.env.TOKEN_SECRET_KEY);
    } catch {
      return res.status(403).json({
        message: "Session is invalid or expired. Please login again.",
        error: true,
        success: false,
      });
    }

    if (!decoded?.id) {
      return res.status(403).json({
        message: "Token payload is invalid.",
        error: true,
        success: false,
      });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      user_role: decoded.user_role,
      status: decoded.status,
    };
    // Backwards-compat for older handlers that read req.userId.
    req.userId = decoded.id;

    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(403).json({
      message: "Authentication failed.",
      error: true,
      success: false,
    });
  }
}

/**
 * Authorization middleware factory.
 * Usage: requireRole("owner"), requireRole("owner", "admin")
 * Must run after authToken so req.user is populated.
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required.",
        error: true,
        success: false,
      });
    }
    if (!allowedRoles.includes(req.user.user_role)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action.",
        error: true,
        success: false,
      });
    }
    next();
  };
}

export default authToken;
