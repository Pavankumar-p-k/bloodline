// Backend server for BloodLine (signup flow)
// Express + Supabase (service role)
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const supabase = require('./config/supabase');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for the frontend at http://localhost:3000
app.use(
  cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

// Parse JSON bodies
app.use(express.json());

// Validate environment - warn if a publishable key is used (fallback to client signup)
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
if (SUPABASE_SERVICE_KEY.startsWith('sb_publishable')) {
  console.warn('\nWARNING: `SUPABASE_SERVICE_KEY` appears to be a publishable/anon key.');
  console.warn('Admin operations (createUser) will not be available.');
  console.warn('For full signup functionality set the Supabase Service Role key in backend/.env.\n');
}

// Basic health check
app.get('/', (req, res) => res.json({ ok: true, message: 'BloodLine backend running' }));

// Debug endpoint - shows Supabase env info (safe for local development only)
app.get('/api/debug', (req, res) => {
  const url = process.env.SUPABASE_URL || null;
  const key = process.env.SUPABASE_SERVICE_KEY || null;
  return res.json({
    env: process.env.NODE_ENV || 'development',
    SUPABASE_URL: !!url,
    SUPABASE_SERVICE_KEY_present: !!key,
    SUPABASE_SERVICE_KEY_looks_publishable: !!(key && String(key).startsWith('sb_publishable')),
  });
});

// Mount auth routes under /api/auth
app.use("/api/auth", authRoutes);
// If you have other route files, mount them here (optional)
// app.use('/api/donors', require('./routes/donorRoutes'));
// app.use('/api/hospitals', require('./routes/hospitalRoutes'));
// app.use('/api/emergency', require('./routes/emergencyRoutes'));

// Generic error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function seedDefaultUsers() {
  try {
    const defaults = [
      { email: 'admin@bloodline.local', password: 'AdminPass123!', role: 'admin', name: 'Administrator' },
      { email: 'donor@bloodline.local', password: 'DonorPass123!', role: 'donor', name: 'Default Donor' },
      { email: 'hospital@bloodline.local', password: 'HospitalPass123!', role: 'hospital', name: 'Default Hospital' },
    ];

    for (const u of defaults) {
      // Skip if profile already exists
      const { data: existingProfiles, error: selectErr } = await supabase.from('profiles').select('*').eq('email', u.email).limit(1);
      if (selectErr) {
        console.warn('profiles.select error', selectErr);
      }
      if (existingProfiles && existingProfiles.length) {
        console.log('Default user already exists, skipping:', u.email);
        continue;
      }

      const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
      if (serviceKey && !serviceKey.startsWith('sb_publishable')) {
        // Use admin.createUser to create auth user
        const { data: createData, error: createError } = await supabase.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
        });
        if (createError) {
          console.warn('admin.createUser failed for', u.email, createError.message || createError);
          // If createUser failed because the user already exists, try to find
          // the existing user in the auth.users table and use that id to
          // create the profile. This avoids inserting a profile that
          // references a non-existent auth user (FK violation).
          try {
            const { data: existingUsers, error: userSelectErr } = await supabase.from('users').select('id').eq('email', u.email).limit(1);
            if (!userSelectErr && existingUsers && existingUsers.length) {
              const existingId = existingUsers[0].id;
              const { error: insertErrExisting } = await supabase.from('profiles').insert([{ id: existingId, email: u.email, role: u.role, name: u.name }]);
              if (insertErrExisting) console.warn('profiles.insert error (existing user)', insertErrExisting);
              else console.log('Seeded default user (existing auth user):', u.email);
              continue;
            }
          } catch (e) {
            console.warn('Error while attempting to resolve existing auth user for', u.email, e);
          }
        }
        const userId = createData?.user?.id;
        if (userId) {
          const { error: insertErr } = await supabase.from('profiles').insert([{ id: userId, email: u.email, role: u.role, name: u.name }]);
          if (insertErr) console.warn('profiles.insert error', insertErr);
          else console.log('Seeded default user:', u.email);
          continue;
        }
      }

      // Fallback: use client signUp (may require email confirmation)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: u.email, password: u.password });
      if (signUpError) {
        console.warn('signUp fallback failed for', u.email, signUpError.message || signUpError);
        continue;
      }
      const fallbackId = signUpData?.user?.id || null;
      if (fallbackId) {
        const { error: insertErr2 } = await supabase.from('profiles').insert([{ id: fallbackId, email: u.email, role: u.role, name: u.name }]);
        if (insertErr2) console.warn('profiles.insert error (fallback)', insertErr2);
      }
      console.log('Seeded (fallback) default user:', u.email);
    }
  } catch (err) {
    console.error('seedDefaultUsers error', err);
  }
}

app.listen(PORT, async () => {
  console.log(`BloodLine backend listening on http://localhost:${PORT}`);
  if (process.env.SEED_DEFAULT_USERS === "true") {
    await seedDefaultUsers();
  }
});
