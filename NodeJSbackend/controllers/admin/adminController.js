import mongoose from "mongoose";
import UserModel, { USER_ROLES } from "../../models/userModel.js";
import { sendApprovalEmail } from "../../utils/mailer.js";

/**
 * GET /api/admin/users?status=&role=&q=
 * Lists all users with optional filters. Admin/owner only.
 */
export async function listUsers(req, res) {
  try {
    const { status, role, q } = req.query || {};
    const filter = {};

    if (status) filter.status = status;
    if (role) filter.user_role = role;
    if (q) {
      const rx = new RegExp(String(q).trim(), "i");
      filter.$or = [{ email: rx }, { firstName: rx }, { lastName: rx }];
    }

    const users = await UserModel.find(filter).sort({ createdAt: -1 }).lean();

    return res.json({
      success: true,
      error: false,
      count: users.length,
      data: users,
    });
  } catch (err) {
    console.error("listUsers error:", err);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to load users.",
    });
  }
}

/**
 * PATCH /api/admin/users/:id/approve
 * Moves a pending_approval (or rejected/suspended) user to approved.
 */
export async function approveUser(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, error: true, message: "Invalid user id." });
    }

    const user = await UserModel.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: true, message: "User not found." });
    }

    if (!user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "User has not verified their email yet.",
      });
    }

    user.status = "approved";
    user.approvedBy = req.user.id;
    user.approvedAt = new Date();
    await user.save();

    // Best-effort notification — don't fail the request if mail breaks.
    try {
      await sendApprovalEmail(user.email, user.firstName);
    } catch (mailErr) {
      console.error("Approval email failed:", mailErr.message);
    }

    return res.json({
      success: true,
      error: false,
      message: "User approved.",
      data: { id: user._id, status: user.status },
    });
  } catch (err) {
    console.error("approveUser error:", err);
    return res
      .status(500)
      .json({ success: false, error: true, message: "Failed to approve user." });
  }
}

/**
 * PATCH /api/admin/users/:id/reject
 */
export async function rejectUser(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, error: true, message: "Invalid user id." });
    }

    const user = await UserModel.findByIdAndUpdate(
      id,
      { status: "rejected", approvedBy: req.user.id, approvedAt: new Date() },
      { new: true }
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: true, message: "User not found." });
    }

    return res.json({
      success: true,
      error: false,
      message: "User rejected.",
      data: { id: user._id, status: user.status },
    });
  } catch (err) {
    console.error("rejectUser error:", err);
    return res
      .status(500)
      .json({ success: false, error: true, message: "Failed to reject user." });
  }
}

/**
 * PATCH /api/admin/users/:id/suspend
 */
export async function suspendUser(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, error: true, message: "Invalid user id." });
    }

    // An owner cannot be suspended (avoids locking everyone out).
    const target = await UserModel.findById(id);
    if (!target) {
      return res
        .status(404)
        .json({ success: false, error: true, message: "User not found." });
    }
    if (target.user_role === "owner") {
      return res.status(403).json({
        success: false,
        error: true,
        message: "The owner account cannot be suspended.",
      });
    }

    target.status = "suspended";
    await target.save();

    return res.json({
      success: true,
      error: false,
      message: "User suspended.",
      data: { id: target._id, status: target.status },
    });
  } catch (err) {
    console.error("suspendUser error:", err);
    return res
      .status(500)
      .json({ success: false, error: true, message: "Failed to suspend user." });
  }
}

/**
 * PATCH /api/admin/users/:id/role
 * Body: { role }
 * Only the owner may grant the "owner" or "admin" role; admins may set "farmer".
 */
export async function setUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, error: true, message: "Invalid user id." });
    }
    if (!USER_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: `Role must be one of: ${USER_ROLES.join(", ")}.`,
      });
    }

    // Privilege rule: granting admin/owner requires the actor to be owner.
    const actorRole = req.user.user_role;
    if ((role === "owner" || role === "admin") && actorRole !== "owner") {
      return res.status(403).json({
        success: false,
        error: true,
        message: "Only the owner can grant admin or owner roles.",
      });
    }

    const user = await UserModel.findByIdAndUpdate(
      id,
      { user_role: role },
      { new: true }
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: true, message: "User not found." });
    }

    return res.json({
      success: true,
      error: false,
      message: "Role updated.",
      data: { id: user._id, user_role: user.user_role },
    });
  } catch (err) {
    console.error("setUserRole error:", err);
    return res
      .status(500)
      .json({ success: false, error: true, message: "Failed to update role." });
  }
}

/**
 * DELETE /api/admin/users/:id
 * Permanently removes a user. Owner accounts cannot be deleted, and an
 * admin cannot delete their own account.
 */
export async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, error: true, message: "Invalid user id." });
    }

    if (String(id) === String(req.user.id)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "You cannot delete your own account.",
      });
    }

    const target = await UserModel.findById(id);
    if (!target) {
      return res
        .status(404)
        .json({ success: false, error: true, message: "User not found." });
    }
    if (target.user_role === "owner") {
      return res.status(403).json({
        success: false,
        error: true,
        message: "Owner accounts cannot be deleted.",
      });
    }

    // Only the owner may delete an admin.
    if (target.user_role === "admin" && req.user.user_role !== "owner") {
      return res.status(403).json({
        success: false,
        error: true,
        message: "Only the owner can delete an admin account.",
      });
    }

    await UserModel.findByIdAndDelete(id);

    return res.json({
      success: true,
      error: false,
      message: "User deleted.",
      data: { id },
    });
  } catch (err) {
    console.error("deleteUser error:", err);
    return res
      .status(500)
      .json({ success: false, error: true, message: "Failed to delete user." });
  }
}

export async function setUserDevices(req, res) {
  try {
    const { id } = req.params;
    const { devices } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, error: true, message: "Invalid user id." });
    }
    if (!Array.isArray(devices)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "devices must be an array of device IDs.",
      });
    }

    const cleaned = [
      ...new Set(
        devices.map((d) => String(d).trim()).filter((d) => d.length > 0)
      ),
    ];

    const user = await UserModel.findByIdAndUpdate(
      id,
      { devices: cleaned, device_id: cleaned[0] || null },
      { new: true }
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, error: true, message: "User not found." });
    }

    return res.json({
      success: true,
      error: false,
      message: "Devices updated.",
      data: { id: user._id, devices: user.devices, device_id: user.device_id },
    });
  } catch (err) {
    console.error("setUserDevices error:", err);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to update devices.",
    });
  }
}
