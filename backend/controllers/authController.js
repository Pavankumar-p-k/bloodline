const supabase = require("../config/supabase");

// SIGNUP
exports.signup = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: "Email, password, role required" });
    }

    // Create user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const userId = data.user.id;

    // Insert profile
    const { error: profileError } = await supabase
      .from("profiles")
      .insert([{ id: userId, role }]);

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    return res.json({
      success: true,
      user_id: userId,
      email,
      role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
};
