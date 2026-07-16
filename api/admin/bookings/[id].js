const {
  addMinutesToLocalValue,
  durationToMinutes,
  isWithinBusinessHours,
} = require("../../_lib/config");
const { methodNotAllowed, readBody, requireAdmin, sendJson } = require("../../_lib/http");
const { getFirestore } = require("../../_lib/firebase");

function overlaps(startValue, endValue, bookings, ignoreId) {
  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();
  return bookings.some((booking) => {
    if (booking.id === ignoreId || booking.status === "cancelled") return false;
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
  if (!requireAdmin(req, res)) return;

  let payload;
  try {
    payload = await readBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  const id = String(req.query.id || "").trim();
  if (!id) {
    sendJson(res, 400, { error: "Invalid booking id" });
    return;
  }

  const db = getFirestore();
  const ref = db.collection("appointments").doc(id);
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
    const existingDoc = await ref.get();
    if (!existingDoc.exists) {
      sendJson(res, 404, { error: "Booking not found" });
      return;
    }
    const existing = existingDoc.data();

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

    const appointmentDate = payload.appointmentAt.slice(0, 10);
    const appointmentEnd = addMinutesToLocalValue(payload.appointmentAt, durationMinutes);
    const snapshot = await db.collection("appointments").where("appointment_date", "==", appointmentDate).get();
    const bookings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (overlaps(payload.appointmentAt, appointmentEnd, bookings, id)) {
      sendJson(res, 409, { error: "That appointment time is no longer available" });
      return;
    }

    updates.appointment_date = appointmentDate;
    updates.appointment_start = payload.appointmentAt;
    updates.appointment_end = appointmentEnd;
  }

  if (!Object.keys(updates).length) {
    sendJson(res, 400, { error: "No updates supplied" });
    return;
  }

  updates.updated_at = new Date().toISOString();
  try {
    await ref.update(updates);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
    return;
  }

  sendJson(res, 200, { ok: true });
};
