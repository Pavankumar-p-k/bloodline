const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 5000;

app.use(cors({ origin: "http://localhost:3000", credentials: true, allowedHeaders: "*" }));
app.use(express.json());

const users = {};
const profiles = {};
const emergencyRequests = [];
const hospitals = [];
const bloodInventory = [];
const userLocations = {};

let nextId = 1;

function makeToken(userId) {
  return `dev-token-${userId}-${Date.now()}`;
}

function findUserByToken(token) {
  for (const [email, u] of Object.entries(users)) {
    if (u.tokens && u.tokens.includes(token)) return u;
  }
  return null;
}

// --- Supabase-compatible auth endpoints ---

app.post("/auth/v1/token", (req, res) => {
  const { email, password } = req.body;
  const grantType = req.query.grant_type || "password";
  if (grantType !== "password") return res.status(400).json({ error: "unsupported_grant_type" });

  const user = Object.values(users).find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid login credentials" });

  const token = makeToken(user.id);
  if (!user.tokens) user.tokens = [];
  user.tokens.push(token);

  res.json({
    access_token: token,
    token_type: "bearer",
    expires_in: 3600,
    user: { id: user.id, email: user.email, role: "authenticated" },
  });
});

app.post("/auth/v1/signup", (req, res) => {
  const { email, password } = req.body;
  if (users[email]) return res.status(400).json({ error: "User already exists" });

  const id = String(nextId++);
  users[email] = { id, email, password, tokens: [] };
  const role = req.body.data?.role || "donor";
  profiles[id] = { id, email, role, created_at: new Date().toISOString() };

  const token = makeToken(id);
  users[email].tokens.push(token);
  profiles[id].email = email;

  res.json({
    access_token: token,
    token_type: "bearer",
    expires_in: 3600,
    user: { id, email, role: "authenticated" },
  });
});

app.get("/auth/v1/user", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const user = findUserByToken(token);
  if (!user) return res.status(401).json({ error: "Invalid token" });
  res.json({ id: user.id, email: user.email, role: "authenticated" });
});

app.post("/auth/v1/logout", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  for (const u of Object.values(users)) {
    if (u.tokens) u.tokens = u.tokens.filter((t) => t !== token);
  }
  res.json({});
});

// --- Supabase-compatible REST endpoints ---

function getUserFromAuth(req) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return null;
  const user = findUserByToken(token);
  if (user) return user;
  // Also accept Bearer tokens directly from sessions
  for (const [email, u] of Object.entries(users)) {
    if (u.tokens && u.tokens.includes(token)) return u;
  }
  return null;
}

app.get("/rest/v1/profiles", (req, res) => {
  const user = getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const query = req.query;
  const id = query.id;
  const role = query.role;
  const order = query.order;

  let result = Object.values(profiles);

  if (typeof id === "string" && id.startsWith("eq.")) {
    const val = id.slice(3);
    result = result.filter((p) => p.id === val);
  }
  if (typeof id === "string") {
    result = result.filter((p) => p.id === id);
  }
  if (typeof role === "string" && role.startsWith("eq.")) {
    const val = role.slice(3);
    result = result.filter((p) => p.role === val);
  }
  if (query.select === "id" && query.count === "exact" && query.head === "true") {
    return res.json([{ count: result.length }]);
  }

  if (order?.startsWith("created_at.desc")) {
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  if (req.method === "HEAD" || query.head === "true") {
    res.set("content-range", `0-${result.length - 1}/${result.length}`);
    return res.json(result);
  }

  res.json(result);
});

app.get("/rest/v1/profiles", (req, res) => {
  const user = getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  res.json(Object.values(profiles));
});

app.post("/rest/v1/profiles", (req, res) => {
  const user = getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const body = Array.isArray(req.body) ? req.body[0] : req.body;
  const id = body.id || user.id;
  profiles[id] = { ...(profiles[id] || {}), ...body, id };
  res.json([profiles[id]]);
});

app.patch("/rest/v1/profiles", (req, res) => {
  const user = getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const id = user.id;
  profiles[id] = { ...(profiles[id] || {}), ...req.body, id };
  res.json([profiles[id]]);
});

// Generic table endpoints
const tables = {
  profiles,
  hospitals,
  emergency_requests: emergencyRequests,
  blood_inventory: bloodInventory,
  user_locations: userLocations,
  requests: {},
  responses: {},
};

app.get("/rest/v1/:table", (req, res) => {
  const user = getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const tableName = req.params.table;
  let data = Object.values(tables[tableName] || {});
  if (tableName === "hospitals" && hospitals.length === 0) {
    data = [
      { id: "h1", name: "City Hospital", address: "123 Main St", city: "New York", contact_phone: "555-0100", license_number: "LIC-001", created_at: new Date().toISOString() },
      { id: "h2", name: "General Medical Center", address: "456 Oak Ave", city: "New York", contact_phone: "555-0101", license_number: "LIC-002", created_at: new Date().toISOString() },
      { id: "h3", name: "St. Mary's Hospital", address: "789 Pine Rd", city: "Boston", contact_phone: "555-0102", license_number: "LIC-003", created_at: new Date().toISOString() },
    ];
    data.forEach((h) => { tables.hospitals[h.id] = h; });
  }
  res.json(data);
});

app.post("/rest/v1/:table", (req, res) => {
  const user = getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const tableName = req.params.table;
  const body = Array.isArray(req.body) ? req.body[0] : req.body;
  const id = body.id || String(nextId++);
  tables[tableName][id] = { ...body, id };
  res.json([tables[tableName][id]]);
});

app.patch("/rest/v1/:table", (req, res) => {
  const user = getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const tableName = req.params.table;
  const query = req.query;
  let id;
  if (typeof query.id === "string" && query.id.startsWith("eq.")) {
    id = query.id.slice(3);
  }
  if (typeof query.user_id === "string" && query.user_id.startsWith("eq.")) {
    id = query.user_id.slice(3);
    tables[tableName][id] = { ...(tables[tableName][id] || {}), ...req.body };
    return res.json([tables[tableName][id]]);
  }
  if (id && tables[tableName][id]) {
    tables[tableName][id] = { ...tables[tableName][id], ...req.body };
    res.json([tables[tableName][id]]);
  } else {
    res.json([]);
  }
});

app.delete("/rest/v1/:table", (req, res) => {
  const user = getUserFromAuth(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const tableName = req.params.table;
  const query = req.query;
  if (typeof query.user_id === "string" && query.user_id.startsWith("eq.")) {
    const userId = query.user_id.slice(3);
    delete tables[tableName][userId];
  }
  res.json([]);
});

// --- Backend API endpoints ---

app.post("/api/donor/register", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const user = findUserByToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const { name, phone, blood_group, city, age } = req.body;
  profiles[user.id] = { ...(profiles[user.id] || {}), name, phone, blood_group, city, age };
  res.json({ message: "Registered as donor" });
});

app.get("/api/donor/profile", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const user = findUserByToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  res.json(profiles[user.id] || {});
});

app.get("/api/hospital/profile", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const user = findUserByToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  res.json(profiles[user.id] || {});
});

app.post("/api/emergency", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const user = findUserByToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const { blood_group, units, city, urgency_level } = req.body;
  const id = String(nextId++);
  const item = { id, requester_id: user.id, blood_group, units, city, urgency_level, status: "pending", created_at: new Date().toISOString() };
  tables.emergency_requests[id] = item;
  res.status(201).json(item);
});

app.get("/api/emergency", (req, res) => {
  res.json(Object.values(tables.emergency_requests));
});

app.get("/api/hospital/emergencies", (req, res) => {
  res.json(Object.values(tables.emergency_requests).filter((r) => r.status === "pending"));
});

app.patch("/api/emergency/fulfill", (req, res) => {
  const { requestId } = req.body;
  const reqObj = tables.emergency_requests[requestId];
  if (reqObj) reqObj.status = "fulfilled";
  res.json({ success: true });
});

app.get("/api/hospital/inventory", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const user = findUserByToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  res.json(Object.values(tables.blood_inventory).filter((i) => i.hospital_id === user.id));
});

app.post("/api/hospital/inventory", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const user = findUserByToken(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const { blood_group, units, expiry_date } = req.body;
  const id = String(nextId++);
  const item = { id, hospital_id: user.id, blood_group, units, expiry: expiry_date || "2026-12-31" };
  tables.blood_inventory[id] = item;
  res.json(item);
});

app.get("/api/debug", (req, res) => res.json({ ok: true, env: "local-dev" }));

app.listen(PORT, () => {
  const seeds = [
    { email: "admin@test.com", password: "admin123", role: "admin", name: "Test Admin" },
    { email: "donor@test.com", password: "donor123", role: "donor", name: "Test Donor" },
    { email: "hospital@test.com", password: "hospital123", role: "hospital", name: "Test Hospital" },
  ];
  seeds.forEach((s) => {
    if (!users[s.email]) {
      const id = String(nextId++);
      users[s.email] = { id, email: s.email, password: s.password, tokens: [] };
      profiles[id] = { id, email: s.email, role: s.role, name: s.name, created_at: new Date().toISOString() };
    }
  });
  console.log(`
╔══════════════════════════════════════════╗
║   BloodLine Local Dev Server Running    ║
║   http://localhost:${PORT}                ║
╠══════════════════════════════════════════╣
║  Test Accounts:                         ║
║  ┌────────────────────────────────────┐ ║
║  │ Email              │ Password      │ ║
║  ├────────────────────────────────────┤ ║
║  │ admin@test.com     │ admin123      │ ║
║  │ donor@test.com     │ donor123      │ ║
║  │ hospital@test.com  │ hospital123   │ ║
║  └────────────────────────────────────┘ ║
╚══════════════════════════════════════════╝
`);
});
