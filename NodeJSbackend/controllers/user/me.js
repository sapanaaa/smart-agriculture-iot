import UserModel from "../../models/userModel.js";

/**
 * GET /api/me
 * Returns the authenticated user's profile (sans password).
 * Requires authToken middleware (sets req.user.id).
 */
export async function getMe(req, res) {
  try {
    const user = await UserModel.findById(req.user.id).lean();
    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: true, message: "User not found." });
    }

    delete user.password;
    delete user.verificationToken;
    delete user.verificationTokenExpires;

    return res.json({ success: true, error: false, data: user });
  } catch (err) {
    console.error("getMe error:", err);
    return res
      .status(500)
      .json({ success: false, error: true, message: "Failed to load profile." });
  }
}
