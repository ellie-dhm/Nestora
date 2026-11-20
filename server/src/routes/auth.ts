import { Router, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
  role: z.enum(["buyer", "agent"]).default("buyer"), // admin is never self-assigned
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const isProd = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? "none" : "lax") as "none" | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setSession(res: Response, user: { id: string; role: string }) {
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET!,
    {
      expiresIn: "7d",
    },
  );
  res.cookie("token", token, cookieOptions);
}

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      fields: parsed.error.flatten().fieldErrors,
    });
  }
  const { name, email, password, role } = parsed.data;

  const exists = await pool.query("select 1 from users where email = $1", [
    email,
  ]);
  if (exists.rowCount)
    return res.status(409).json({ error: "Email already in use" });

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    `insert into users (name, email, password_hash, role)
     values ($1, $2, $3, $4) returning id, name, email, role`,
    [name, email, hash, role],
  );
  setSession(res, rows[0]);
  res.status(201).json({ user: rows[0] });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid email or password" });
  const { email, password } = parsed.data;

  const { rows } = await pool.query("select * from users where email = $1", [
    email,
  ]);
  const user = rows[0];
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });

  setSession(res, user);
  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token", cookieOptions);
  res.json({ ok: true });
});

router.get("/me", async (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.json({ user: null });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as unknown as {
      id: string;
    };
    const { rows } = await pool.query(
      "select id, name, email, role from users where id = $1",
      [payload.id],
    );
    res.json({ user: rows[0] ?? null });
  } catch {
    // expired or invalid token: treat as logged out
    res.clearCookie("token", cookieOptions);
    res.json({ user: null });
  }
});

export default router;
