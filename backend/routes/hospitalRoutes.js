const express = require("express");
const supabase = require("../config/supabase");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Register hospital profile
router.post("/register", protect, async (req, res) => {
  const { name, license_number, address, city, contact_phone } = req.body;

  const { error } = await supabase
    .from("hospitals")
    .insert([{
      id: req.user.id,
      name,
      license_number,
      address,
      city,
      contact_phone
    }]);

  if (error) return res.status(400).json({ error });

  res.json({ message: "Hospital registered successfully" });
});

// Add blood inventory
router.post("/inventory", protect, async (req, res) => {
  const { blood_group, units, expiry_date } = req.body;

  const { data, error } = await supabase
    .from("blood_inventory")
    .insert([{
      hospital_id: req.user.id,
      blood_group,
      units,
      expiry_date
    }])
    .select();

  if (error) return res.status(400).json({ error });

  res.json(data);
});

// View hospital inventory
router.get("/inventory", protect, async (req, res) => {
  const { data, error } = await supabase
    .from("blood_inventory")
    .select("*")
    .eq("hospital_id", req.user.id);

  if (error) return res.status(400).json({ error });

  res.json(data);
});

module.exports = router;
