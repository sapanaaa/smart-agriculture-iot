/**
 * Seed (or reset) the bootstrap owner account so there is always a way into
 * the admin panel. Usage:
 *
 *   node scripts/seedOwner.js <email> <password> [firstName] [lastName]
 *
 * If args are omitted, falls back to OWNER_EMAIL from .env and a default
 * password. The created account is fully approved + email-verified.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import UserModel from "../models/userModel.js";

dotenv.config();

const email = (process.argv[2] || process.env.OWNER_EMAIL || "").toLowerCase().trim();
const password = process.argv[3] || "Admin@12345";
const firstName = process.argv[4] || "Admin";
const lastName = process.argv[5] || "Owner";

if (!email) {
  console.error("No email provided and OWNER_EMAIL is not set.");
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);

const passwordHash = await bcrypt.hash(password, 12);

const existing = await UserModel.findOne({ email });

if (existing) {
  existing.password = passwordHash;
  existing.user_role = "owner";
  existing.status = "approved";
  existing.emailVerified = new Date();
  existing.verificationToken = null;
  existing.verificationTokenExpires = null;
  if (!existing.firstName) existing.firstName = firstName;
  if (!existing.lastName) existing.lastName = lastName;
  await existing.save();
  console.log("Updated existing account to approved OWNER:", email);
} else {
  await UserModel.create({
    email,
    password: passwordHash,
    firstName,
    lastName,
    user_role: "owner",
    status: "approved",
    emailVerified: new Date(),
  });
  console.log("Created approved OWNER account:", email);
}

console.log("─────────────────────────────────────────");
console.log("  Login credentials");
console.log("  Email   :", email);
console.log("  Password:", password);
console.log("─────────────────────────────────────────");

await mongoose.disconnect();
process.exit(0);
