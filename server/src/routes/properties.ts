import { Router, Request, Response } from "express";
import { z } from "zod";
import { pool } from "../db";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
const idSchema = z.string().uuid();

const propertySchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(5000),
  price: z.coerce.number().int().positive(),
  type: z.enum(["apartment", "house", "studio"]),
  listing_type: z.enum(["sale", "rent"]),
  bedrooms: z.coerce.number().int().min(0).max(20),
  bathrooms: z.coerce.number().int().min(0).max(20),
  city: z.string().trim().min(2).max(80),
  status: z.enum(["available", "sold", "rented"]).default("available"),
  images: z.array(z.string().url()).max(10).default([]),
});
const updateSchema = propertySchema.partial();

const querySchema = z.object({
  city: z.string().trim().optional(),
  type: z.enum(["apartment", "house", "studio"]).optional(),
  listing_type: z.enum(["sale", "rent"]).optional(),
  min_price: z.coerce.number().int().min(0).optional(),
  max_price: z.coerce.number().int().min(0).optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

function validationError(res: Response, error: z.ZodError) {
  return res
    .status(400)
    .json({ error: "Validation failed", fields: error.flatten().fieldErrors });
}

// Public: search + filters + pagination (only available listings)
router.get("/", async (req: Request, res: Response) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, parsed.error);
  const q = parsed.data;

  const where: string[] = ["p.status = 'available'"];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    where.push(sql.replace("?", `$${params.length}`));
  };

  if (q.city) add("p.city ilike ?", `%${q.city}%`);
  if (q.type) add("p.type = ?", q.type);
  if (q.listing_type) add("p.listing_type = ?", q.listing_type);
  if (q.min_price !== undefined) add("p.price >= ?", q.min_price);
  if (q.max_price !== undefined) add("p.price <= ?", q.max_price);
  if (q.bedrooms !== undefined) add("p.bedrooms >= ?", q.bedrooms);

  const whereSql = where.join(" and ");
  const offset = (q.page - 1) * q.limit;

  const [list, count] = await Promise.all([
    pool.query(
      `select p.*, u.name as agent_name
       from properties p join users u on u.id = p.agent_id
       where ${whereSql}
       order by p.created_at desc
       limit ${q.limit} offset ${offset}`,
      params,
    ),
    pool.query(
      `select count(*)::int as total from properties p where ${whereSql}`,
      params,
    ),
  ]);

  res.json({
    items: list.rows,
    total: count.rows[0].total,
    page: q.page,
    pages: Math.ceil(count.rows[0].total / q.limit),
  });
});

// Agent: own listings (all statuses). Must come before "/:id"
router.get(
  "/mine/list",
  requireAuth,
  requireRole("agent", "admin"),
  async (req, res) => {
    const { rows } = await pool.query(
      "select * from properties where agent_id = $1 order by created_at desc",
      [req.user!.id],
    );
    res.json({ items: rows });
  },
);

// Public: single property
router.get("/:id", async (req, res) => {
  if (!idSchema.safeParse(req.params.id).success)
    return res.status(404).json({ error: "Property not found" });
  const { rows } = await pool.query(
    `select p.*, u.name as agent_name
     from properties p join users u on u.id = p.agent_id
     where p.id = $1`,
    [req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: "Property not found" });
  res.json({ property: rows[0] });
});

// Agent/admin: create
router.post(
  "/",
  requireAuth,
  requireRole("agent", "admin"),
  async (req, res) => {
    const parsed = propertySchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);
    const d = parsed.data;

    const { rows } = await pool.query(
      `insert into properties
      (agent_id, title, description, price, type, listing_type, bedrooms, bathrooms, city, status, images)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *`,
      [
        req.user!.id,
        d.title,
        d.description,
        d.price,
        d.type,
        d.listing_type,
        d.bedrooms,
        d.bathrooms,
        d.city,
        d.status,
        d.images,
      ],
    );
    res.status(201).json({ property: rows[0] });
  },
);

// Owner or admin: ownership check helper
async function loadOwned(req: Request, res: Response) {
  if (!idSchema.safeParse(req.params.id).success) {
    res.status(404).json({ error: "Property not found" });
    return null;
  }
  const { rows } = await pool.query("select * from properties where id = $1", [
    req.params.id,
  ]);
  const property = rows[0];
  if (!property) {
    res.status(404).json({ error: "Property not found" });
    return null;
  }
  if (req.user!.role !== "admin" && property.agent_id !== req.user!.id) {
    res.status(403).json({ error: "You can only modify your own listings" });
    return null;
  }
  return property;
}

// Owner or admin: update
router.put(
  "/:id",
  requireAuth,
  requireRole("agent", "admin"),
  async (req, res) => {
    const property = await loadOwned(req, res);
    if (!property) return;

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return validationError(res, parsed.error);
    const entries = Object.entries(parsed.data).filter(
      ([, v]) => v !== undefined,
    );
    if (!entries.length)
      return res.status(400).json({ error: "Nothing to update" });

    // keys come from the zod schema, never from raw user input
    const sets = entries.map(([k], i) => `${k} = $${i + 1}`).join(", ");
    const values = entries.map(([, v]) => v);
    const { rows } = await pool.query(
      `update properties set ${sets} where id = $${entries.length + 1} returning *`,
      [...values, property.id],
    );
    res.json({ property: rows[0] });
  },
);

// Owner or admin: delete
router.delete(
  "/:id",
  requireAuth,
  requireRole("agent", "admin"),
  async (req, res) => {
    const property = await loadOwned(req, res);
    if (!property) return;
    await pool.query("delete from properties where id = $1", [property.id]);
    res.status(204).end();
  },
);

export default router;
