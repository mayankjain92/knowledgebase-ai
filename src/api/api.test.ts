import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "./server.js";

describe("API Server Endpoints", () => {
  it("GET /api/health should return ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });

  it("POST /api/chat should validate query input", async () => {
    const res = await request(app).post("/api/chat").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Query is required");
  });

  it("POST /api/chat/stream should validate query input", async () => {
    const res = await request(app).post("/api/chat/stream").send({ query: "   " });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Query is required");
  });

  it("GET /api/documents should return document list", async () => {
    const res = await request(app).get("/api/documents");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.documents)).toBe(true);
  });
});
