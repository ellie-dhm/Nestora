import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

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

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    req.user = jwt.verify(
      token,
      process.env.JWT_SECRET!,
    ) as unknown as AuthUser;
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
