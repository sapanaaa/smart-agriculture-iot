import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UserModel from "../../models/userModel.js";
import { sendVerificationEmail } from "../../utils/mailer.js";

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const BCRYPT_ROUNDS = 12;

/** Owner bootstrap: emails in OWNER_EMAIL (comma-separated) are auto-approved as "owner". */
function isBootstrapOwner(email) {
  const owners = (process.env.OWNER_EMAIL || "")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return owners.includes(email.toLowerCase().trim());
}

/**
 * POST /api/account/register
 * Body: { email, password, firstName?, lastName? }
 * Creates a pending_verification account and emails a verification link.
 */
export async function register(req, res) {
  try {
    const { email, password, firstName, lastName } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Password must be at least 8 characters.",
      });
    }

    const existing = await UserModel.findOne({ email: normalizedEmail });
    if (existing) {
      // Don't leak which emails exist beyond a generic conflict.
      return res.status(409).json({
        success: false,
        error: true,
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const rawToken = crypto.randomBytes(32).toString("hex");

    const owner = isBootstrapOwner(normalizedEmail);

    const user = await UserModel.create({
      email: normalizedEmail,
      password: passwordHash,
      firstName: firstName || null,
      lastName: lastName || null,
      user_role: owner ? "owner" : "farmer",
      status: "pending_verification",
      verificationToken: rawToken,
      verificationTokenExpires: new Date(Date.now() + VERIFICATION_TTL_MS),
    });

    try {
      await sendVerificationEmail(normalizedEmail, rawToken);
    } catch (mailErr) {
      // Roll back the half-created account so the user can cleanly retry
      // once email is configured (avoids a stuck, unverifiable account).
      console.error("Verification email failed:", mailErr.message);
      await UserModel.deleteOne({ _id: user._id }).catch(() => {});
      return res.status(502).json({
        success: false,
        error: true,
        emailSent: false,
        message:
          "We couldn't send the verification email right now. Please try again in a few minutes or contact an administrator.",
      });
    }

    return res.status(201).json({
      success: true,
      error: false,
      emailSent: true,
      message:
        "Account created. Check your email to verify your address. An admin will approve your account afterward.",
    });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Something went wrong during registration.",
    });
  }
}

/**
 * GET /api/account/verify?token=...&email=...
 * Confirms the email and moves the account to pending_approval
 * (or straight to approved for the bootstrap owner).
 */
export async function verifyEmail(req, res) {
  try {
    const { token, email } = req.query || {};
    if (!token || !email) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Verification token and email are required.",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const user = await UserModel.findOne({ email: normalizedEmail }).select(
      "+verificationToken +verificationTokenExpires"
    );

    if (!user || !user.verificationToken) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Invalid or already-used verification link.",
      });
    }

    if (user.verificationToken !== token) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Invalid verification token.",
      });
    }

    if (
      user.verificationTokenExpires &&
      user.verificationTokenExpires.getTime() < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Verification link has expired. Please register again.",
      });
    }

    user.emailVerified = new Date();
    user.verificationToken = null;
    user.verificationTokenExpires = null;

    // Bootstrap owner skips approval; everyone else waits for an admin.
    if (user.user_role === "owner") {
      user.status = "approved";
      user.approvedAt = new Date();
    } else {
      user.status = "pending_approval";
    }

    await user.save();

    return res.json({
      success: true,
      error: false,
      autoApproved: user.status === "approved",
      message:
        user.status === "approved"
          ? "Email verified. Your owner account is ready — you can sign in."
          : "Email verified. An administrator will review and approve your account shortly.",
    });
  } catch (err) {
    console.error("verifyEmail error:", err);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Something went wrong during verification.",
    });
  }
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Verifies credentials + lifecycle, returns a signed backend JWT and
 * a sanitized user object. Called by the NextAuth Credentials provider.
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const user = await UserModel.findOne({ email: normalizedEmail }).select(
      "+password"
    );

    // Generic message to avoid user enumeration.
    if (!user) {
      return res.status(401).json({
        success: false,
        error: true,
        message: "Invalid email or password.",
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({
        success: false,
        error: true,
        message: "Invalid email or password.",
      });
    }

    // Lifecycle gates — order matters for clear messaging.
    if (user.status === "pending_verification" || !user.emailVerified) {
      return res.status(403).json({
        success: false,
        error: true,
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email before signing in.",
      });
    }
    if (user.status === "pending_approval") {
      return res.status(403).json({
        success: false,
        error: true,
        code: "PENDING_APPROVAL",
        message: "Your account is awaiting administrator approval.",
      });
    }
    if (user.status === "rejected") {
      return res.status(403).json({
        success: false,
        error: true,
        code: "REJECTED",
        message: "Your account registration was not approved.",
      });
    }
    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        error: true,
        code: "SUSPENDED",
        message: "Your account has been suspended. Contact an administrator.",
      });
    }
    if (user.status !== "approved") {
      return res.status(403).json({
        success: false,
        error: true,
        message: "Your account cannot sign in at this time.",
      });
    }

    const tokenData = {
      id: user._id,
      email: user.email,
      user_role: user.user_role,
      status: user.status,
    };

    const token = jwt.sign(tokenData, process.env.TOKEN_SECRET_KEY, {
      expiresIn: "1d",
    });

    return res.json({
      success: true,
      error: false,
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        user_role: user.user_role,
        status: user.status,
        device_id: user.device_id,
        devices: user.devices,
        district: user.district,
        region: user.region,
        phone: user.phone,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Something went wrong during login.",
    });
  }
}
