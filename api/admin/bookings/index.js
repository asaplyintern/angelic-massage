const { appointmentToDict } = require("../../_lib/appointments");
const { methodNotAllowed, requireAdmin, sendJson } = require("../../_lib/http");
const { getSupabase } = require("../../_lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(res);
    return;
  }
  if (!requireAdmin(req, res)) return;

  const { day = "", status = "" } = req.query;
  let query = getSupabase().from("appointments").select("*");

  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (day === "today") {
    const today = new Date().toISOString().slice(0, 10);
    query = query.gte("appointment_start", `${today}T00:00`).lte("appointment_start", `${today}T23:59`);
  } else if (day === "upcoming") {
    query = query.gte("appointment_start", new Date().toISOString().slice(0, 16));
  }

  const { data, error } = await query.order("appointment_start", { ascending: true });
  if (error) {
    sendJson(res, 500, { error: error.message });
    return;
  }
  sendJson(res, 200, { appointments: (data || []).map(appointmentToDict) });
};
