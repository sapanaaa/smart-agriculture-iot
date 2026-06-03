// Migrate legacy magic-link users (no status field) to a valid lifecycle state.
// They were verified and active under the old system, so we mark them approved.
import mongoose from "mongoose";
import dotenv from "dotenv";
import UserModel from "../models/userModel.js";

dotenv.config();
await mongoose.connect(process.env.MONGODB_URI);

const res = await UserModel.updateMany(
  { status: { $in: [null, undefined] } },
  { $set: { status: "approved" } }
);
console.log("Legacy users migrated to approved:", res.modifiedCount);

await mongoose.disconnect();
process.exit(0);
