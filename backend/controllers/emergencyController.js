const supabase = require("../config/supabase");

// Create emergency request
const createRequest = async (req, res, next) => {
  try {
    const { blood_group, units, city, urgency_level } = req.body;
    if (!blood_group || !units || !city || !urgency_level) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const payload = {
      requester_id: req.user.id,
      blood_group,
      units,
      city,
      urgency_level,
      status: "pending",
    };

    const { data, error } = await supabase
      .from("emergency_requests")
      .insert([payload])
      .select()
      .single();

    if (error) return res.status(400).json({ error });

    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

// Find nearby requests (hospital view)
const findNearby = async (req, res, next) => {
  try {
    const { city, blood_group, limit = 20 } = req.query;

    const { data, error } = await supabase
      .from("emergency_requests")
      .select("*")
      .eq("city", city)
      .eq("blood_group", blood_group)
      .in("status", ["pending"])
      .order("urgency_level", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(parseInt(limit));

    if (error) return res.status(400).json({ error });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// Accept a request (hospital)
const acceptRequest = async (req, res, next) => {
  try {
    const { request_id } = req.body;
    if (!request_id) return res.status(400).json({ message: "request_id is required" });

    const { data: reqData, error: rErr } = await supabase
      .from("emergency_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (rErr || !reqData) return res.status(404).json({ message: "Request not found" });
    if (reqData.status !== "pending") return res.status(400).json({ message: "Request is not pending" });

    const { data: inv, error: invErr } = await supabase
      .from("blood_inventory")
      .select("id,units,expiry_date,blood_group")
      .eq("hospital_id", req.user.id)
      .eq("blood_group", reqData.blood_group)
      .gte("units", reqData.units)
      .gt("expiry_date", new Date().toISOString())
      .limit(1);

    if (invErr) return res.status(400).json({ invErr });
    if (!inv || inv.length === 0) return res.status(400).json({ message: "Insufficient stock" });

    const { data, error } = await supabase
      .from("emergency_requests")
      .update({ status: "accepted", accepted_hospital_id: req.user.id })
      .eq("id", request_id)
      .select()
      .single();

    if (error) return res.status(400).json({ error });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

// Fulfill emergency request (atomic)
const fulfillRequest = async (req, res, next) => {
  try {
    const { request_id } = req.body;
    if (!request_id) return res.status(400).json({ message: "request_id is required" });

    const { data, error } = await supabase.rpc("fulfill_emergency_request", { request_id });

    if (error) return res.status(400).json({ error });

    const result = Array.isArray(data) ? data[0] : data;
    if (result && result.success === false) {
      return res.status(400).json({ message: result.message || "Failed to fulfill request" });
    }

    res.json({ success: true, message: "Request fulfilled successfully", data: result });
  } catch (err) {
    next(err);
  }
};

// Get requests for authenticated user
const myRequests = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("emergency_requests")
      .select("*")
      .or(`requester_id.eq.${req.user.id},accepted_hospital_id.eq.${req.user.id}`)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error });

    res.json(data);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createRequest,
  findNearby,
  acceptRequest,
  fulfillRequest,
  myRequests,
};
