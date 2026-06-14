import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "viewer"], default: "viewer" }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
