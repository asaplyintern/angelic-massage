const {
  addMinutesToLocalValue,
  dayBounds,
  durationToMinutes,
  formatTime,
} = require("./_lib/config");
const { methodNotAllowed, sendJson } = require("./_lib/http");
const { getFirestore } = require("./_lib/firebase");

function datePart(value) {
  return String(value || "").slice(0, 10);
}

function timeValue(date, minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function displayLabel(minutes) {
  const date = new Date(`2026-01-01T${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function overlaps(startValue, endValue, bookings) {
  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();
  return bookings.some((booking) => {
    const bookedStart = new Date(booking.appointment_start).getTime();
    const bookedEnd = new Date(booking.appointment_end).getTime();
    return start < bookedEnd && end > bookedStart;
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(res);
    return;
  }

  const selectedDate = datePart(req.query.date);
  const durationMinutes = durationToMinutes(req.query.duration);
  const day = new Date(`${selectedDate}T00:00:00`);
  const bounds = dayBounds(day);

  if (!selectedDate || Number.isNaN(day.getTime())) {
    sendJson(res, 400, { error: "Invalid date" });
    return;
  }

  if (!bounds) {
    sendJson(res, 200, { open: false, hours: "Closed", slots: [] });
    return;
  }

  if (!durationMinutes) {
    sendJson(res, 200, { open: true, hours: `${formatTime(bounds.openAt)} - ${formatTime(bounds.closeAt)}`, slots: [] });
    return;
  }

  const openMinutes = bounds.openAt.getHours() * 60;
  const closeMinutes = bounds.closeAt.getHours() * 60;
  let bookings = [];
  try {
    const snapshot = await getFirestore()
      .collection("appointments")
      .where("appointment_date", "==", selectedDate)
      .get();
    bookings = snapshot.docs.map((doc) => doc.data()).filter((booking) => booking.status !== "cancelled");
  } catch (error) {
    sendJson(res, 500, { error: error.message });
    return;
  }

  const now = new Date();
  const slots = [];
  for (let minutes = openMinutes; minutes + durationMinutes <= closeMinutes; minutes += 30) {
    const value = timeValue(selectedDate, minutes);
    const endValue = addMinutesToLocalValue(value, durationMinutes);
    slots.push({
      value,
      time: value.slice(11),
      label: displayLabel(minutes),
      available: new Date(value) >= now && !overlaps(value, endValue, bookings),
    });
  }

  sendJson(res, 200, {
    open: true,
    hours: `${formatTime(bounds.openAt)} - ${formatTime(bounds.closeAt)}`,
    slots,
  });
};
