import jwt from "jsonwebtoken";
import { config } from "../config.js";

// Bypass Auth: Always return a generic Local Admin
export function authenticate(req, res, next) {
  req.user = {
    id: "000000000000000000000000", // dummy ObjectId
    username: "Local Admin",
    role: "admin"
  };
  next();
}

export function requireAdmin(req, res, next) {
  // Since authenticate always sets role: "admin", this will always pass
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Forbidden: Admin access required" });
  }
}
