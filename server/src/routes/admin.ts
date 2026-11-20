import { Router } from "express";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireRole("admin"));

const idSchema = z.string().uuid();
const roleSchema = z.object({ role: z.enum(["buyer", "agent", "admin"]) });

router.get("/stats", async (_req, res) => {
  const { rows } = await pool.query(`
    select
      (select count(*)::int from users) as users,
      (select count(*)::int from users where role = 'agent') as agents,
      (select count(*)::int from properties) as properties,
      (select count(*)::int from properties where status = 'available') as available,
      (select count(*)::int from inquiries) as inquiries,
      (select count(*)::int from inquiries where status = 'new') as new_inquiries
  `);
  res.json({ stats: rows[0] });
});

router.get("/users", async (_req, res) => {
  const { rows } = await pool.query(`
    select u.id, u.name, u.email, u.role, u.created_at,
      (select count(*)::int from properties p where p.agent_id = u.id) as listings,
      (select count(*)::int from inquiries i where i.user_id = u.id) as inquiries
    from users u
    order by u.created_at desc
  `);
  res.json({ items: rows });
});

router.patch("/users/:id/role", async (req, res) => {
  if (!idSchema.safeParse(req.params.id).success)
    return res.status(404).json({ error: "User not found" });
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid role" });
  if (req.params.id === req.user!.id)
    return res.status(400).json({ error: "You can't change your own role" });

  const { rows } = await pool.query(
    "update users set role = $1 where id = $2 returning id, name, email, role, created_at",
    [parsed.data.role, req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "User not found" });
  res.json({ user: rows[0] });
});

router.delete("/users/:id", async (req, res) => {
  if (!idSchema.safeParse(req.params.id).success)
    return res.status(404).json({ error: "User not found" });
  if (req.params.id === req.user!.id)
    return res.status(400).json({ error: "You can't delete your own account" });

  // listings and inquiries are removed too (on delete cascade)
  const { rowCount } = await pool.query("delete from users where id = $1", [
    req.params.id,
  ]);
  if (!rowCount) return res.status(404).json({ error: "User not found" });
  res.status(204).end();
});

// all listings, every status. Edit/delete reuse /api/properties/:id (admins are allowed)
router.get("/properties", async (_req, res) => {
  const { rows } = await pool.query(`
    select p.*, u.name as agent_name
    from properties p join users u on u.id = p.agent_id
    order by p.created_at desc
  `);
  res.json({ items: rows });
});

export default router;
