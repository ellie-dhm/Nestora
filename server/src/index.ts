import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";
import { pool } from "./db";
import propertiesRouter from "./routes/properties";
import authRouter from "./routes/auth";
import inquiriesRouter from "./routes/inquiries";

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/api/properties", propertiesRouter);
app.use("/api/inquiries", inquiriesRouter);
app.set("trust proxy", 1); // needed behind Render's proxy for secure cookies
app.use("/api/auth", authRouter);

// keep this after all routes
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  },
);

app.get("/api/health", async (_req, res) => {
  const { rows } = await pool.query("select now()");
  res.json({ ok: true, dbTime: rows[0].now });
});
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API on ${process.env.PORT}`));
