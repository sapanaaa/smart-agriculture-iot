// Quick check: list all users + their role/status.
import mongoose from "mongoose";
import dotenv from "dotenv";
import UserModel from "../models/userModel.js";

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);
const users = await UserModel.find().select("email user_role status emailVerified").lean();
console.log(`Total users: ${users.length}`);
for (const u of users) {
  console.log(`- ${u.email} | role=${u.user_role} | status=${u.status} | verified=${!!u.emailVerified}`);
}
await mongoose.disconnect();
process.exit(0);
