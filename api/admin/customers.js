const { appointmentToDict } = require("../_lib/appointments");
const { methodNotAllowed, requireAdmin, sendJson } = require("../_lib/http");
const { getSupabase } = require("../_lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(res);
    return;
  }
  if (!requireAdmin(req, res)) return;

  const search = String(req.query.q || "").trim();
  if (!search) {
    sendJson(res, 200, { appointments: [] });
    return;
  }

  const like = `%${search}%`;
  const { data, error } = await getSupabase()
    .from("appointments")
    .select("*")
    .or(`email.ilike.${like},phone.ilike.${like},customer_name.ilike.${like}`)
    .order("appointment_start", { ascending: false });

  if (error) {
    sendJson(res, 500, { error: error.message });
    return;
  }
  sendJson(res, 200, { appointments: (data || []).map(appointmentToDict) });
};
