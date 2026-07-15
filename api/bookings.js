const {
  addMinutesToLocalValue,
  durationToMinutes,
  findService,
  isWithinBusinessHours,
} = require("./_lib/config");
const { methodNotAllowed, readBody, sendJson } = require("./_lib/http");
const { getSupabase } = require("./_lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    methodNotAllowed(res);
    return;
  }

  let payload;
  try {
    payload = await readBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  const required = ["name", "email", "phone", "serviceId", "duration", "appointmentAt"];
  const missing = required.filter((field) => !String(payload[field] || "").trim());
  if (missing.length) {
    sendJson(res, 400, { error: `Missing required fields: ${missing.join(", ")}` });
    return;
  }

  const service = findService(payload.serviceId);
  if (!service) {
    sendJson(res, 400, { error: "Unknown service" });
    return;
  }

  const validDurations = new Set(service.prices.map((price) => price.duration));
  if (!validDurations.has(payload.duration)) {
    sendJson(res, 400, { error: "That duration is not available for the selected service" });
    return;
  }

  const durationMinutes = durationToMinutes(payload.duration);
  const start = new Date(payload.appointmentAt);
  if (Number.isNaN(start.getTime())) {
    sendJson(res, 400, { error: "Invalid appointment date" });
    return;
  }

  if (!isWithinBusinessHours(start, durationMinutes)) {
    sendJson(res, 400, { error: "That time is outside Angelic Massage working hours" });
    return;
  }

  const location = payload.balcony ? "Lakeview balcony (+$20)" : "Indoor treatment room";
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      customer_name: payload.name.trim(),
      email: payload.email.trim(),
      phone: payload.phone.trim(),
      service_id: service.id,
      service_name: service.name,
      duration: payload.duration,
      duration_minutes: durationMinutes,
      location,
      balcony: Boolean(payload.balcony),
      appointment_start: payload.appointmentAt,
      appointment_end: addMinutesToLocalValue(payload.appointmentAt, durationMinutes),
      notes: String(payload.notes || "").trim(),
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    const conflictCodes = new Set(["23P01", "23505"]);
    sendJson(res, conflictCodes.has(error.code) ? 409 : 500, {
      error: conflictCodes.has(error.code) ? "That appointment time is no longer available" : error.message,
    });
    return;
  }

  sendJson(res, 201, { ok: true, id: data.id });
};
