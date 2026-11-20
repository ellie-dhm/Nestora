import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";
import { pool } from "./db";
import propertiesRouter from "./routes/properties";
import authRouter from "./routes/auth";
import inquiriesRouter from "./routes/inquiries";
import adminRouter from "./routes/admin";

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", 1);

app.get("/api/health", async (_req, res) => {
  const { rows } = await pool.query("select now()");
  res.json({ ok: true, dbTime: rows[0].now });
});
app.use("/api/auth", authRouter);
app.use("/api/properties", propertiesRouter);
app.use("/api/inquiries", inquiriesRouter);
app.use("/api/admin", adminRouter);

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

if (process.env.NODE_ENV !== "test") {
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`API on ${port}`));
}

export default app;
