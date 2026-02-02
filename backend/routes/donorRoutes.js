const express = require("express");
const supabase = require("../config/supabase");
const router = express.Router();

// SIGN UP
router.post("/signup", async (req, res) => {
  const { email, password, role, name, phone, city } = req.body;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (error) return res.status(400).json({ error });

  // create profile
  const { error: profileError } = await supabase
    .from("profiles")
    .insert([{
      id: data.user.id,
      role,
      name,
      phone,
      city
    }]);

  if (profileError) return res.status(400).json({ profileError });

  res.json({ message: "User registered successfully" });
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) return res.status(401).json({ error });

  res.json(data);
});

module.exports = router;
