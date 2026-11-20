import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/index";
import { pool } from "../src/db";

const stamp = Date.now();
const email = (n: string) => `test_${n}_${stamp}@example.com`;
const password = "password123";

const newProperty = {
  title: "Test apartment in Testville",
  description: "A lovely test apartment used by the automated test suite.",
  price: 200000,
  type: "apartment",
  listing_type: "sale",
  bedrooms: 2,
  bathrooms: 1,
  city: "Testville",
};

type Agent = ReturnType<typeof request.agent>;

async function signup(name: string, role: "buyer" | "agent") {
  const agent = request.agent(app); // keeps the auth cookie between requests
  const res = await agent
    .post("/api/auth/register")
    .send({ name: `Test ${name}`, email: email(name), password, role });
  return { agent, res };
}

let buyer: Agent;
let agent1: Agent;
let agent2: Agent;
let propertyId: string;
let inquiryId: string;

beforeAll(async () => {
  buyer = (await signup("buyer", "buyer")).agent;
  agent1 = (await signup("agent1", "agent")).agent;
  agent2 = (await signup("agent2", "agent")).agent;
});

afterAll(async () => {
  // cascades to the properties and inquiries these users created
  await pool.query("delete from users where email like 'test%@example.com'");
  await pool.end();
});

describe("auth", () => {
  it("rejects a weak password with field errors", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Weak User", email: email("weak"), password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.fields.password).toBeDefined();
  });

  it("registers a user and sets a session cookie", async () => {
    const { res } = await signup("auth1", "buyer");
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("buyer");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("rejects a duplicate email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Dup", email: email("buyer"), password });
    expect(res.status).toBe(409);
  });

  it("rejects a wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: email("buyer"), password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("/me returns null when logged out and the user when logged in", async () => {
    const out = await request(app).get("/api/auth/me");
    expect(out.body.user).toBeNull();
    const inn = await buyer.get("/api/auth/me");
    expect(inn.body.user.email).toBe(email("buyer"));
  });
});

describe("properties", () => {
  it("forbids buyers from creating listings", async () => {
    const res = await buyer.post("/api/properties").send(newProperty);
    expect(res.status).toBe(403);
  });

  it("lets an agent create a listing", async () => {
    const res = await agent1.post("/api/properties").send(newProperty);
    expect(res.status).toBe(201);
    propertyId = res.body.property.id;
  });

  it("rejects an invalid listing", async () => {
    const res = await agent1
      .post("/api/properties")
      .send({ ...newProperty, price: -5 });
    expect(res.status).toBe(400);
    expect(res.body.fields.price).toBeDefined();
  });

  it("finds the listing through the public city filter", async () => {
    const res = await request(app).get("/api/properties?city=Testville");
    expect(res.status).toBe(200);
    expect(
      res.body.items.some((p: { id: string }) => p.id === propertyId),
    ).toBe(true);
  });

  it("forbids another agent from editing or deleting it", async () => {
    const put = await agent2
      .put(`/api/properties/${propertyId}`)
      .send({ price: 1 });
    expect(put.status).toBe(403);
    const del = await agent2.delete(`/api/properties/${propertyId}`);
    expect(del.status).toBe(403);
  });

  it("lets the owner update it", async () => {
    const res = await agent1
      .put(`/api/properties/${propertyId}`)
      .send({ price: 210000 });
    expect(res.status).toBe(200);
    expect(res.body.property.price).toBe(210000);
  });
});

describe("inquiries", () => {
  it("forbids agents from sending inquiries", async () => {
    const res = await agent1.post("/api/inquiries").send({
      property_id: propertyId,
      message: "Agents should not be able to do this",
    });
    expect(res.status).toBe(403);
  });

  it("rejects a too-short message", async () => {
    const res = await buyer
      .post("/api/inquiries")
      .send({ property_id: propertyId, message: "hi" });
    expect(res.status).toBe(400);
  });

  it("lets a buyer send an inquiry", async () => {
    const res = await buyer.post("/api/inquiries").send({
      property_id: propertyId,
      message: "Is it still available for a viewing?",
    });
    expect(res.status).toBe(201);
    inquiryId = res.body.inquiry.id;
  });

  it("only lets the listing's agent reply", async () => {
    const other = await agent2
      .patch(`/api/inquiries/${inquiryId}/reply`)
      .send({ status: "replied", reply: "Not my listing" });
    expect(other.status).toBe(403);

    const owner = await agent1
      .patch(`/api/inquiries/${inquiryId}/reply`)
      .send({ status: "replied", reply: "Yes, come on Saturday." });
    expect(owner.status).toBe(200);
    expect(owner.body.inquiry.status).toBe("replied");
  });
});

describe("admin", () => {
  it("blocks non-admins and anonymous users", async () => {
    expect((await buyer.get("/api/admin/users")).status).toBe(403);
    expect((await request(app).get("/api/admin/users")).status).toBe(401);
  });
});
