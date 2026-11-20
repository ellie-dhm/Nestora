import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db";

export type Role = "buyer" | "agent" | "admin";
export interface AuthUser {
  id: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as unknown as {
      id: string;
    };
    // read the current role from the database, not from the token
    const { rows } = await pool.query(
      "select id, role from users where id = $1",
      [payload.id],
    );
    if (!rows[0])
      return res.status(401).json({ error: "Account no longer exists" });
    req.user = { id: rows[0].id, role: rows[0].role };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
