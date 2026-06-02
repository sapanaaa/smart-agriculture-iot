import mongoose from "mongoose";

/**
 * User roles (RBAC).
 *  - owner  : super admin. Full control. Bootstrapped via OWNER_EMAIL env.
 *  - admin  : manages users & devices, approves registrations.
 *  - farmer : normal end user.
 */
export const USER_ROLES = ["owner", "admin", "farmer"];

/**
 * Account lifecycle status.
 *  - pending_verification : registered, email not yet confirmed.
 *  - pending_approval     : email verified, waiting for an admin/owner to approve.
 *  - approved             : may log in and use the app.
 *  - rejected             : admin denied the account.
 *  - suspended            : previously approved, access revoked by admin.
 */
export const USER_STATUS = [
  "pending_verification",
  "pending_approval",
  "approved",
  "rejected",
  "suspended",
];

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      default: null,
    },
    lastName: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // ── Authentication ────────────────────────────────────────
    // bcrypt hash. `select: false` so it is never returned by default queries.
    password: {
      type: String,
      required: true,
      select: false,
    },

    // NextAuth-compatible verified timestamp (null until email confirmed).
    emailVerified: {
      type: Date,
      default: null,
    },

    // Email-verification token (random hex) + expiry. Cleared after use.
    verificationToken: {
      type: String,
      default: null,
      select: false,
    },
    verificationTokenExpires: {
      type: Date,
      default: null,
      select: false,
    },

    // ── RBAC + lifecycle ──────────────────────────────────────
    user_role: {
      type: String,
      enum: USER_ROLES,
      default: "farmer",
    },
    status: {
      type: String,
      enum: USER_STATUS,
      default: "pending_verification",
    },

    // Who approved/rejected this account, and when (audit trail).
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },

    // ── Profile / devices ─────────────────────────────────────
    // A user may be assigned one or more ESP-32 device IDs by an admin.
    device_id: {
      type: String,
      default: null,
    },
    devices: {
      type: [String],
      default: [],
    },

    district: {
      type: String,
      default: null,
    },
    region: {
      type: String,
      enum: ["Terai", "Mid-hills", "Hilly", "Mountain", null],
      default: null,
    },
    phone: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const UserModel = mongoose.models.user || mongoose.model("user", userSchema);

export default UserModel;
