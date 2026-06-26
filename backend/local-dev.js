const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 5000;

app.use(cors({ origin: "http://localhost:3000", credentials: true, allowedHeaders: "*" }));
app.use(express.json({ limit: '10mb' }));

// Simulated In-Memory Database
const users = {};
const profiles = {};
const donors = {};
const bloodRequests = {};
const donorResponses = {};
const donations = {};
const notifications = {};
const userLocations = {};
const bloodInventory = {};
const hospitals = {};

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

// Distance helper (Haversine formula in km)
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Blood compatibility checker
// Returns list of blood groups that can donate to the target blood group
function getCompatibleDonors(targetGroup) {
  const compatibility = {
    'A+': ['A+', 'A-', 'O+', 'O-'],
    'A-': ['A-', 'O-'],
    'B+': ['B+', 'B-', 'O+', 'O-'],
    'B-': ['B-', 'O-'],
    'AB+': ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
    'AB-': ['AB-', 'A-', 'B-', 'O-'],
    'O+': ['O+', 'O-'],
    'O-': ['O-']
  };
  return compatibility[targetGroup] || [];
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

  const profile = profiles[user.id];
  res.json({
    access_token: token,
    token_type: "bearer",
    expires_in: 3600,
    user: {
      id: user.id,
      email: user.email,
      role: "authenticated",
      user_metadata: { role: profile?.role || "donor" },
    },
  });
});

app.post("/auth/v1/signup", (req, res) => {
  const { email, password } = req.body;
  if (users[email]) return res.status(400).json({ error: "User already exists" });

  const id = "user-" + (nextId++);
  users[email] = { id, email, password, tokens: [] };
  const role = req.body.data?.role || "donor";
  profiles[id] = { id, email, role, name: req.body.data?.name || email.split('@')[0], created_at: new Date().toISOString() };

  const token = makeToken(id);
  users[email].tokens.push(token);

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

// Mock SMS OTP Endpoint
app.post("/auth/v1/otp", (req, res) => {
  const { phone } = req.body;
  console.log(`[SMS OTP] Code sent to ${phone}: 123456`);
  res.json({ message: "OTP sent successfully", code: "123456" });
});

app.post("/auth/v1/verify-otp", (req, res) => {
  const { phone, code } = req.body;
  if (code === "123456") {
    res.json({ success: true, message: "Phone verified" });
  } else {
    res.status(400).json({ error: "Invalid OTP code" });
  }
});

// --- Table Mapping & Resolver ---
const tables = {
  profiles,
  donors,
  blood_requests: bloodRequests,
  donor_responses: donorResponses,
  donations,
  notifications,
  user_locations: userLocations,
  blood_inventory: bloodInventory,
  hospitals,
};

function getUserFromAuth(req) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return null;
  const user = findUserByToken(token);
  if (user) return user;
  
  // Accept standard seeded or default headers/tokens for local convenience
  if (token.startsWith("dev-token-")) {
    const id = token.split("-")[2];
    const u = Object.values(users).find(x => x.id === id);
    if (u) return u;
  }
  
  // Fallback to test users directly
  if (token === "admin-token") return { id: "u-admin", email: "admin@test.com" };
  if (token === "donor-token") return { id: "u-donor", email: "donor@test.com" };
  if (token === "hospital-token") return { id: "u-hospital", email: "hospital@test.com" };
  
  return null;
}

// POSTGREST GET endpoint
app.get("/rest/v1/:table", (req, res) => {
  const tableName = req.params.table;
  if (!tables[tableName]) return res.status(404).json({ error: `Table ${tableName} not found` });

  let result = Object.values(tables[tableName]);

  // Apply filters
  for (const [key, value] of Object.entries(req.query)) {
    if (['select', 'order', 'limit', 'offset', 'count', 'head'].includes(key)) continue;

    if (typeof value === 'string') {
      const parts = value.split('.');
      const operator = parts[0];
      const val = decodeURIComponent(parts.slice(1).join('.'));

      if (operator === 'eq') {
        result = result.filter(item => String(item[key]) === val);
      } else if (operator === 'neq') {
        result = result.filter(item => String(item[key]) !== val);
      } else if (operator === 'gt') {
        result = result.filter(item => Number(item[key]) > Number(val));
      } else if (operator === 'gte') {
        result = result.filter(item => Number(item[key]) >= Number(val));
      } else if (operator === 'lt') {
        result = result.filter(item => Number(item[key]) < Number(val));
      } else if (operator === 'lte') {
        result = result.filter(item => Number(item[key]) <= Number(val));
      } else if (operator === 'is') {
        if (val === 'null') {
          result = result.filter(item => item[key] === null || item[key] === undefined);
        }
      } else if (operator === 'or') {
        // Simple OR evaluation for custom needs (e.g. requester_id.eq.X,accepted_hospital_id.eq.X)
        const orParts = val.replace(/\(|\)/g, '').split(',');
        result = result.filter(item => {
          return orParts.some(p => {
            const [k, op, v] = p.split('.');
            if (op === 'eq') return String(item[k]) === v;
            return false;
          });
        });
      }
    }
  }

  // Handle Ordering (e.g. order=created_at.desc)
  if (req.query.order) {
    const [field, dir] = req.query.order.split('.');
    result.sort((a, b) => {
      let valA = a[field];
      let valB = b[field];
      if (typeof valA === 'string') {
        return dir === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
      }
      return dir === 'desc' ? (valB - valA) : (valA - valB);
    });
  }

  // Handle limit
  if (req.query.limit) {
    result = result.slice(0, parseInt(req.query.limit));
  }

  if (req.query.count === 'exact' && req.query.head === 'true') {
    res.set("content-range", `0-${result.length - 1}/${result.length}`);
    return res.status(200).json([{ count: result.length }]);
  }

  res.json(result);
});

// POSTGREST POST
app.post("/rest/v1/:table", (req, res) => {
  const tableName = req.params.table;
  if (!tables[tableName]) return res.status(404).json({ error: `Table ${tableName} not found` });

  const body = Array.isArray(req.body) ? req.body : [req.body];
  const inserted = [];

  for (const item of body) {
    const id = item.id || (tableName === 'donors' || tableName === 'profiles' ? item.user_id : `rec-${nextId++}`);
    const record = { ...item, id, created_at: item.created_at || new Date().toISOString() };
    tables[tableName][id] = record;
    inserted.push(record);
  }

  // Respond with the inserted items
  res.status(201).json(inserted);
});

// POSTGREST PATCH
app.patch("/rest/v1/:table", (req, res) => {
  const tableName = req.params.table;
  if (!tables[tableName]) return res.status(404).json({ error: `Table ${tableName} not found` });

  const query = req.query;
  let id = null;

  // Find record id from query (usually id=eq.X or user_id=eq.X)
  for (const [key, value] of Object.entries(query)) {
    if (value.startsWith('eq.')) {
      const val = value.slice(3);
      if (key === 'id') id = val;
      else if (key === 'user_id') id = val;
      else {
        // Find by key
        const found = Object.values(tables[tableName]).find(item => String(item[key]) === val);
        if (found) id = found.id;
      }
    }
  }

  if (id && tables[tableName][id]) {
    tables[tableName][id] = { ...tables[tableName][id], ...req.body };
    res.json([tables[tableName][id]]);
  } else {
    // If no direct key found, search and update all matching
    const updated = [];
    for (const [rid, record] of Object.entries(tables[tableName])) {
      let matches = true;
      for (const [key, value] of Object.entries(query)) {
        if (['select', 'order', 'limit'].includes(key)) continue;
        if (value.startsWith('eq.')) {
          if (String(record[key]) !== value.slice(3)) matches = false;
        }
      }
      if (matches) {
        tables[tableName][rid] = { ...record, ...req.body };
        updated.push(tables[tableName][rid]);
      }
    }
    res.json(updated);
  }
});

// POSTGREST DELETE
app.delete("/rest/v1/:table", (req, res) => {
  const tableName = req.params.table;
  if (!tables[tableName]) return res.status(404).json({ error: `Table ${tableName} not found` });

  const query = req.query;
  for (const [rid, record] of Object.entries(tables[tableName])) {
    let matches = true;
    for (const [key, value] of Object.entries(query)) {
      if (value.startsWith('eq.')) {
        if (String(record[key]) !== value.slice(3)) matches = false;
      }
    }
    if (matches) {
      delete tables[tableName][rid];
    }
  }
  res.status(200).json([]);
});

// --- Upload Endpoint ---
app.post("/api/upload", (req, res) => {
  // Return placeholder image
  res.json({ url: "https://images.unsplash.com/photo-584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=60" });
});

// --- Matching Algorithm Endpoint ---
app.post("/api/emergency/match", (req, res) => {
  const { blood_group, lat, lng, urgency_level } = req.body;
  if (!blood_group || !lat || !lng) {
    return res.status(400).json({ error: "Missing blood_group, lat, or lng" });
  }

  const compatibleTypes = getCompatibleDonors(blood_group);
  const activeDonors = Object.values(donors).filter(d => {
    // Availability filters
    if (!d.is_available) return false;
    if (d.is_suspended) return false;
    if (d.last_donation_date) {
      const daysSince = (Date.now() - new Date(d.last_donation_date).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 90) return false; // Not eligible
    }
    // Check blood compatibility
    return compatibleTypes.includes(d.blood_group);
  });

  // Score and Sort Donors
  const scoredDonors = activeDonors.map(d => {
    const dist = calculateDistance(lat, lng, d.lat, d.lng);
    
    // Recency bonus: if last donation is > 120 days ago, or never donated
    let recencyBonus = 1.0;
    if (!d.last_donation_date) {
      recencyBonus = 1.3;
    } else {
      const days = (Date.now() - new Date(d.last_donation_date).getTime()) / (1000 * 60 * 60 * 24);
      if (days > 120) recencyBonus = 1.2;
    }

    // Response rate bonus (simulated)
    const responseRateBonus = d.is_verified ? 1.2 : 1.0;

    // Avoid division by zero
    const distanceFactor = dist > 0.1 ? dist : 0.1;
    const score = (1 / distanceFactor) * recencyBonus * responseRateBonus;

    return {
      donor: d,
      distance: dist,
      score: score
    };
  });

  // Filter within donor max travel distance (or default 25km if slider is 'Any')
  const matched = scoredDonors.filter(sd => {
    const maxDist = sd.donor.max_travel_km || 25;
    return sd.distance <= maxDist;
  });

  // Sort by score descending (highest priority first)
  matched.sort((a, b) => b.score - a.score);

  // Batch notifications based on urgency
  let batchCount = 5;
  if (urgency_level === 'CRITICAL') batchCount = 20;
  else if (urgency_level === 'URGENT') batchCount = 10;

  const targetBatch = matched.slice(0, batchCount);

  res.json({
    totalMatched: matched.length,
    notifiedCount: targetBatch.length,
    matches: targetBatch.map(m => ({
      donor_id: m.donor.id,
      full_name: m.donor.full_name,
      blood_group: m.donor.blood_group,
      distance: Math.round(m.distance * 10) / 10,
      score: Math.round(m.score * 100) / 100
    }))
  });
});

// Seed default structures
function seedDatabase() {
  console.log("Seeding local database...");
  
  // Seed Users
  const seeds = [
    { email: "admin@test.com", password: "admin123", role: "admin", name: "Super Administrator" },
    { email: "donor@test.com", password: "donor123", role: "donor", name: "Rahul Sharma" },
    { email: "hospital@test.com", password: "hospital123", role: "hospital", name: "Max Super Speciality Hospital" },
  ];

  seeds.forEach((s) => {
    const id = "u-" + s.role;
    users[s.email] = { id, email: s.email, password: s.password, tokens: [`dev-token-${id}-123`] };
    profiles[id] = { id, email: s.email, role: s.role, name: s.name, created_at: new Date().toISOString(), is_suspended: false };
  });

  // Seed Donors ( Rahul Sharma + 5 extra donors around Bangalore/Delhi )
  const mockDonors = [
    { id: "u-donor", full_name: "Rahul Sharma", age: 28, gender: "Male", phone: "9876543210", blood_group: "O-", city: "Bangalore", area: "Indiranagar", lat: 12.9716, lng: 77.5946, last_donation_date: "2026-02-15", is_available: true, max_travel_km: 15, is_verified: true },
    { id: "d-2", full_name: "Priya Patel", age: 24, gender: "Female", phone: "9123456780", blood_group: "A+", city: "Bangalore", area: "Koramangala", lat: 12.9352, lng: 77.6245, last_donation_date: "2026-03-01", is_available: true, max_travel_km: 10, is_verified: true },
    { id: "d-3", full_name: "Amit Kumar", age: 35, gender: "Male", phone: "9234567891", blood_group: "B+", city: "Bangalore", area: "Whitefield", lat: 12.9698, lng: 77.7500, last_donation_date: "2025-12-10", is_available: true, max_travel_km: 20, is_verified: false },
    { id: "d-4", full_name: "Anjali Rao", age: 31, gender: "Female", phone: "9345678902", blood_group: "O+", city: "Bangalore", area: "Jayanagar", lat: 12.9250, lng: 77.5897, last_donation_date: "2026-04-20", is_available: true, max_travel_km: 5, is_verified: true },
    { id: "d-5", full_name: "Vikram Malhotra", age: 42, gender: "Male", phone: "9456789013", blood_group: "AB+", city: "Delhi", area: "Connaught Place", lat: 28.6304, lng: 77.2177, last_donation_date: "2026-01-05", is_available: true, max_travel_km: 25, is_verified: true },
    { id: "d-6", full_name: "Karan Singh", age: 29, gender: "Male", phone: "9567890124", blood_group: "O-", city: "Bangalore", area: "HSR Layout", lat: 12.9100, lng: 77.6450, last_donation_date: null, is_available: true, max_travel_km: 15, is_verified: true }
  ];

  mockDonors.forEach(d => {
    donors[d.id] = d;
    // Map donor profiles as authenticated user records
    if (!profiles[d.id]) {
      profiles[d.id] = { id: d.id, email: `${d.full_name.toLowerCase().replace(/\s/g, "")}@example.com`, role: "donor", name: d.full_name, created_at: new Date().toISOString() };
    }
  });

  // Seed Emergency Requests
  const mockRequests = [
    {
      id: "req-1",
      requester_id: "u-hospital",
      requester_type: "Hospital",
      patient_name: "Sunita Devi",
      blood_group_needed: "O-",
      units_needed: 3,
      urgency_level: "CRITICAL",
      hospital_name: "Fortis Hospital",
      address: "Bannerghatta Road, Bangalore",
      lat: 12.8950,
      lng: 77.5980,
      contact_name: "Dr. Suresh Mohan",
      contact_phone: "9988776655",
      status: "pending",
      verification_doc_url: "https://images.unsplash.com/photo-584515979956-d9f6e5d09982?w=600",
      is_verified: true,
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "req-2",
      requester_id: "u-donor", // Patient Family
      requester_type: "Patient Family",
      patient_name: "Arjun Prasad",
      blood_group_needed: "B+",
      units_needed: 2,
      urgency_level: "URGENT",
      hospital_name: "Manipal Hospital",
      address: "HAL Airport Road, Bangalore",
      lat: 12.9592,
      lng: 77.6438,
      contact_name: "Ramesh Prasad",
      contact_phone: "9887766554",
      status: "pending",
      verification_doc_url: null,
      is_verified: false,
      created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hr ago
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  mockRequests.forEach(r => {
    bloodRequests[r.id] = r;
  });

  // Seed Donor Responses
  const mockResponses = [
    { id: "res-1", request_id: "req-1", donor_id: "u-donor", status: "confirmed", responded_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() }
  ];

  mockResponses.forEach(res => {
    donorResponses[res.id] = res;
  });

  // Seed Donations History
  const mockDonations = [
    { id: "don-1", donor_id: "u-donor", request_id: "req-1", donation_date: "2026-02-15", units_donated: 1, hospital_name: "Vikas Medical Clinic", certificate_url: "https://example.com/cert.pdf" }
  ];
  mockDonations.forEach(don => {
    donations[don.id] = don;
  });

  // Seed Notifications
  const mockNotifications = [
    { id: "not-1", donor_id: "u-donor", request_id: "req-1", type: "match_alert", message: "Critical O- blood request nearby at Fortis Hospital", is_read: false, sent_at: new Date().toISOString() }
  ];
  mockNotifications.forEach(n => {
    notifications[n.id] = n;
  });

  // Seed user locations
  userLocations["u-donor"] = { user_id: "u-donor", latitude: 12.9716, longitude: 77.5946, accuracy: 10, updated_at: new Date().toISOString() };
  userLocations["u-hospital"] = { user_id: "u-hospital", latitude: 12.8950, longitude: 77.5980, accuracy: 5, updated_at: new Date().toISOString() };
}

app.listen(PORT, () => {
  seedDatabase();
  console.log(`
╔══════════════════════════════════════════╗
║   BloodLine Mock Database Server Active ║
║   http://localhost:${PORT}                ║
╠══════════════════════════════════════════╣
║  Seeded Login Accounts:                 ║
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
