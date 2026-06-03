import jwt from "jsonwebtoken";

/**
 * GET /api/settingCookies
 * Header: Authorization: Bearer <backendToken>
 *
 * The backend JWT is minted at login (POST /api/auth/login) and carried in
 * the NextAuth session. This endpoint verifies that token and re-issues it
 * as an httpOnly `backend_token` cookie so the browser automatically sends
 * it on subsequent same-site API calls (onboarding, admin, etc).
 */
async function SettingCookies(req, res) {
  try {
    const bearer = req.headers?.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;

    if (!bearer) {
      return res.status(401).json({
        success: false,
        error: true,
        message: "Missing authentication token.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(bearer, process.env.TOKEN_SECRET_KEY);
    } catch {
      return res.status(403).json({
        success: false,
        error: true,
        message: "Invalid or expired token.",
      });
    }

    // Re-sign a fresh 1d token so cookie + payload stay consistent.
    const token = jwt.sign(
      {
        id: decoded.id,
        email: decoded.email,
        user_role: decoded.user_role,
        status: decoded.status,
      },
      process.env.TOKEN_SECRET_KEY,
      { expiresIn: "1d" }
    );

    // Behind nginx everything is same-origin over HTTPS, so a Lax,
    // Secure, httpOnly cookie is the right call. (Express must trust the
    // proxy for `secure` to register correctly — see index.js.)
    const isProd = process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    };

    return res.cookie("backend_token", token, cookieOptions).json({
      success: true,
      error: false,
      message: "Session cookie set.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: error.message || "Failed to set session cookie.",
    });
  }
}

export default SettingCookies;
