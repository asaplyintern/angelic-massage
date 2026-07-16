const {
  addMinutesToLocalValue,
  durationToMinutes,
  findService,
  isWithinBusinessHours,
} = require("./_lib/config");
const { methodNotAllowed, readBody, sendJson } = require("./_lib/http");
const { getFirestore } = require("./_lib/firebase");

function overlaps(startValue, endValue, bookings) {
  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();
  return bookings.some((booking) => {
    if (booking.status === "cancelled") return false;
    const bookedStart = new Date(booking.appointment_start).getTime();
    const bookedEnd = new Date(booking.appointment_end).getTime();
    return start < bookedEnd && end > bookedStart;
  });
}

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
  const appointmentStart = payload.appointmentAt;
  const appointmentEnd = addMinutesToLocalValue(payload.appointmentAt, durationMinutes);
  const appointmentDate = appointmentStart.slice(0, 10);
  const db = getFirestore();
  const appointments = db.collection("appointments");
  const ref = appointments.doc();

  try {
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(appointments.where("appointment_date", "==", appointmentDate));
      const bookings = snapshot.docs.map((doc) => doc.data());
      if (overlaps(appointmentStart, appointmentEnd, bookings)) {
        const error = new Error("That appointment time is no longer available");
        error.statusCode = 409;
        throw error;
      }

      const now = new Date().toISOString();
      transaction.set(ref, {
        customer_name: payload.name.trim(),
        email: payload.email.trim(),
        phone: payload.phone.trim(),
        service_id: service.id,
        service_name: service.name,
        duration: payload.duration,
        duration_minutes: durationMinutes,
        location,
        balcony: Boolean(payload.balcony),
        appointment_date: appointmentDate,
        appointment_start: appointmentStart,
        appointment_end: appointmentEnd,
        notes: String(payload.notes || "").trim(),
        status: "pending",
        created_at: now,
        updated_at: now,
        reminder_email_sent_at: null,
        reminder_sms_sent_at: null,
      });
    });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { error: error.message });
    return;
  }

  sendJson(res, 201, { ok: true, id: ref.id });
};
