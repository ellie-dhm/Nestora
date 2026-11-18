import { Router, Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
const idSchema = z.string().uuid();

const createSchema = z.object({
  property_id: z.string().uuid(),
  message: z.string().trim().min(10).max(1000),
});
const editSchema = z.object({ message: z.string().trim().min(10).max(1000) });
const replySchema = z.object({
  reply: z.string().trim().min(2).max(1000).optional(),
  status: z.enum(["replied", "closed"]),
});

function validationError(res: Response, error: z.ZodError) {
  return res
    .status(400)
    .json({ error: "Validation failed", fields: error.flatten().fieldErrors });
}

// Buyer: send an inquiry
router.post("/", requireAuth, requireRole("buyer"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);
  const { property_id, message } = parsed.data;

  const prop = await pool.query(
    "select id, status from properties where id = $1",
    [property_id],
  );
  if (!prop.rows[0])
    return res.status(404).json({ error: "Property not found" });
  if (prop.rows[0].status !== "available")
    return res
      .status(409)
      .json({ error: "This property is no longer available" });

  const { rows } = await pool.query(
    `insert into inquiries (property_id, user_id, message)
     values ($1, $2, $3) returning *`,
    [property_id, req.user!.id, message],
  );
  res.status(201).json({ inquiry: rows[0] });
});

// Buyer: my inquiries
router.get("/mine", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `select i.*, p.title as property_title, p.city as property_city
     from inquiries i join properties p on p.id = i.property_id
     where i.user_id = $1
     order by i.created_at desc`,
    [req.user!.id],
  );
  res.json({ items: rows });
});

// Agent: inquiries received on my properties (admin sees all)
router.get(
  "/received",
  requireAuth,
  requireRole("agent", "admin"),
  async (req, res) => {
    const isAdmin = req.user!.role === "admin";
    const { rows } = await pool.query(
      `select i.*, p.title as property_title, u.name as buyer_name, u.email as buyer_email
     from inquiries i
     join properties p on p.id = i.property_id
     join users u on u.id = i.user_id
     ${isAdmin ? "" : "where p.agent_id = $1"}
     order by i.created_at desc`,
      isAdmin ? [] : [req.user!.id],
    );
    res.json({ items: rows });
  },
);

// Buyer: edit own message while still "new"
router.put("/:id", requireAuth, requireRole("buyer"), async (req, res) => {
  if (!idSchema.safeParse(req.params.id).success)
    return res.status(404).json({ error: "Inquiry not found" });
  const parsed = editSchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed.error);

  const { rows } = await pool.query(
    `update inquiries set message = $1
     where id = $2 and user_id = $3 and status = 'new' returning *`,
    [parsed.data.message, req.params.id, req.user!.id],
  );
  if (!rows[0])
    return res
      .status(404)
      .json({ error: "Inquiry not found, or it can no longer be edited" });
  res.json({ inquiry: rows[0] });
});

// Agent (property owner) or admin: reply / change status
router.patch(
  "/:id/reply",
  requireAuth,
  requireRole("agent", "admin"),
  async (req, res) => {
    if (!idSchema.safeParse(req.params.id).success)
      return res.status(404).json({ error: "Inquiry not found" });
    const parsed = replySchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);

    const found = await pool.query(
      `select i.id, p.agent_id from inquiries i
     join properties p on p.id = i.property_id where i.id = $1`,
      [req.params.id],
    );
    const row = found.rows[0];
    if (!row) return res.status(404).json({ error: "Inquiry not found" });
    if (req.user!.role !== "admin" && row.agent_id !== req.user!.id)
      return res.status(403).json({ error: "Not your listing" });

    const { rows } = await pool.query(
      `update inquiries set status = $1, reply = coalesce($2, reply)
     where id = $3 returning *`,
      [parsed.data.status, parsed.data.reply ?? null, req.params.id],
    );
    res.json({ inquiry: rows[0] });
  },
);

// Buyer: delete own inquiry (admin can delete any)
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  if (!idSchema.safeParse(req.params.id).success)
    return res.status(404).json({ error: "Inquiry not found" });
  const isAdmin = req.user!.role === "admin";
  const { rowCount } = await pool.query(
    `delete from inquiries where id = $1 ${isAdmin ? "" : "and user_id = $2"}`,
    isAdmin ? [req.params.id] : [req.params.id, req.user!.id],
  );
  if (!rowCount) return res.status(404).json({ error: "Inquiry not found" });
  res.status(204).end();
});

export default router;
