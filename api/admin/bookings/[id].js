const {
  addMinutesToLocalValue,
  durationToMinutes,
  isWithinBusinessHours,
} = require("../../_lib/config");
const { methodNotAllowed, readBody, requireAdmin, sendJson } = require("../../_lib/http");
const { getSupabase } = require("../../_lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    methodNotAllowed(res);
    return;
  }
  if (!requireAdmin(req, res)) return;

  let payload;
  try {
    payload = await readBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  const id = Number(req.query.id);
  if (!Number.isInteger(id)) {
    sendJson(res, 400, { error: "Invalid booking id" });
    return;
  }

  const supabase = getSupabase();
  const updates = {};
  const allowedStatuses = new Set(["pending", "confirmed", "cancelled", "complete"]);

  if ("status" in payload) {
    if (!allowedStatuses.has(payload.status)) {
      sendJson(res, 400, { error: "Invalid status" });
      return;
    }
    updates.status = payload.status;
  }

  if (payload.appointmentAt) {
    const { data: existing, error: loadError } = await supabase
      .from("appointments")
      .select("duration")
      .eq("id", id)
      .single();

    if (loadError || !existing) {
      sendJson(res, 404, { error: "Booking not found" });
      return;
    }

    const durationMinutes = durationToMinutes(existing.duration);
    const start = new Date(payload.appointmentAt);
    if (Number.isNaN(start.getTime())) {
      sendJson(res, 400, { error: "Invalid appointment date" });
      return;
    }
    if (!isWithinBusinessHours(start, durationMinutes)) {
      sendJson(res, 400, { error: "That time is outside Angelic Massage working hours" });
      return;
    }

    updates.appointment_start = payload.appointmentAt;
    updates.appointment_end = addMinutesToLocalValue(payload.appointmentAt, durationMinutes);
  }

  if (!Object.keys(updates).length) {
    sendJson(res, 400, { error: "No updates supplied" });
    return;
  }

  updates.updated_at = new Date().toISOString();
  const { error } = await supabase.from("appointments").update(updates).eq("id", id);

  if (error) {
    const conflictCodes = new Set(["23P01", "23505"]);
    sendJson(res, conflictCodes.has(error.code) ? 409 : 500, {
      error: conflictCodes.has(error.code) ? "That appointment time is no longer available" : error.message,
    });
    return;
  }

  sendJson(res, 200, { ok: true });
};
