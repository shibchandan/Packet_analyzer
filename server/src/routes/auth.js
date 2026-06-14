import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { config } from "../config.js";

export const authRouter = Router();

// Used to check if setup is needed
authRouter.get("/status", async (req, res) => {
  const adminCount = await User.countDocuments({ role: "admin" });
  res.json({ setupRequired: adminCount === 0 });
});

// Create the first admin user
authRouter.post("/setup", async (req, res) => {
  const adminCount = await User.countDocuments({ role: "admin" });
  if (adminCount > 0) {
    return res.status(400).json({ message: "Setup already complete. Admin exists." });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, passwordHash, role: "admin" });

  const token = jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn: "7d" }
  );

  res.status(201).json({ token, role: user.role, username: user.username });
});

// Login
authRouter.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn: "7d" }
  );

  res.json({ token, role: user.role, username: user.username });
});
