import express from "express";

import userOnboarding from "../controllers/user/onboarding.js";
import { getMe } from "../controllers/user/me.js";
import SettingCookies from "../controllers/setcookies.js";

import { register, verifyEmail, login } from "../controllers/auth/authController.js";
import {
  listUsers,
  approveUser,
  rejectUser,
  suspendUser,
  setUserRole,
  setUserDevices,
  deleteUser,
} from "../controllers/admin/adminController.js";

import authToken, { requireRole } from "../middleware/AuthToken.js";

const route = express.Router();

/* ── Public authentication ─────────────────────────────────── */
route.post("/auth/register", register);
route.get("/auth/verify", verifyEmail);
route.post("/auth/login", login);

/* ── Session cookie relay (token in Authorization header) ──── */
route.get("/settingCookies", SettingCookies);

/* ── Authenticated user ────────────────────────────────────── */
route.get("/me", authToken, getMe);
route.post("/userOnboarding", authToken, userOnboarding);

/* ── Admin / owner only (RBAC) ─────────────────────────────── */
route.get("/admin/users", authToken, requireRole("owner", "admin"), listUsers);
route.patch("/admin/users/:id/approve", authToken, requireRole("owner", "admin"), approveUser);
route.patch("/admin/users/:id/reject", authToken, requireRole("owner", "admin"), rejectUser);
route.patch("/admin/users/:id/suspend", authToken, requireRole("owner", "admin"), suspendUser);
route.patch("/admin/users/:id/role", authToken, requireRole("owner", "admin"), setUserRole);
route.patch("/admin/users/:id/devices", authToken, requireRole("owner", "admin"), setUserDevices);
route.delete("/admin/users/:id", authToken, requireRole("owner", "admin"), deleteUser);

export default route;
