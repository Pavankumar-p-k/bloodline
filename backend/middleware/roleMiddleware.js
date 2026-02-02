const supabase = require("../config/supabase");

// Ensure the authenticated user has one of the allowed roles
const authorize = (allowed = []) => async (req, res, next) => {
  try {
    // fetch profile from `profiles` table using user id
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { data, error } = await supabase
      .from("profiles")
      .select("role,verified")
      .eq("id", userId)
      .single();

    if (error || !data) return res.status(403).json({ message: "Profile not found" });

    req.profile = data;

    if (allowed.length && !allowed.includes(data.role)) {
      return res.status(403).json({ message: "Insufficient role" });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authorize };
