const supabase = require("../config/supabase");

// SIGNUP
exports.signup = async (req, res) => {
  try {
    const { email, password, role, name, phone, city, blood_group, age } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: "Email, password and role required" });
    }

    // Create auth user using service role
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      return res.status(400).json({ error: createError.message || createError });
    }

    const userId = createData?.user?.id;
    if (!userId) return res.status(500).json({ error: "Failed to create user" });

    // Insert into users table (mirror auth.users)
    const { error: usersInsertErr } = await supabase.from("users").insert([{ id: userId, email, role }]);
    if (usersInsertErr) {
      // if duplicate or other issue, log and continue
      console.warn("users.insert warning:", usersInsertErr);
    }

    // Insert into profiles with extra fields if provided
    const profileRow = { id: userId, role, name: name || null, phone: phone || null, city: city || null, blood_group: blood_group || null, age: age || null };
    const { error: profileError } = await supabase.from("profiles").insert([profileRow]);

    if (profileError) {
      return res.status(400).json({ error: profileError.message || profileError });
    }

    // Sign in the newly created user to obtain access token/session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      // Signup succeeded but signin failed (may require email confirmation). Return created user info without token.
      return res.json({
        success: true,
        user: { id: userId, email, role, name },
        token: null,
        message: "User created; sign-in requires email confirmation or failed",
      });
    }

    const accessToken = signInData?.session?.access_token || null;
    const userPayload = { id: userId, email, role, name };

    return res.json({ success: true, token: accessToken, user: userPayload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message || error });

    const session = data?.session || null;
    const accessToken = session?.access_token || null;

    // fetch user profile/role
    const { data: profileData, error: profileErr } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
    let role = null, name = null;
    if (!profileErr && profileData) {
      role = profileData.role;
      name = profileData.name;
    } else {
      // fallback: read from users table
      const { data: uData } = await supabase.from("users").select("role,email").eq("id", data.user.id).single();
      if (uData) role = uData.role;
    }

    const userPayload = { id: data.user.id, email: data.user.email, role, name };

    return res.json({ token: accessToken, user: userPayload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
};