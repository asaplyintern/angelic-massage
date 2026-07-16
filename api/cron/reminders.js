const { getFirestore } = require("../_lib/firebase");
const { sendAppointmentReminder } = require("../_lib/notifications");
const { methodNotAllowed, sendJson } = require("../_lib/http");

function dateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return dateValue(date);
}

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.authorization === `Bearer ${secret}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(res);
    return;
  }
  if (!authorized(req)) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  const db = getFirestore();
  const snapshot = await db.collection("appointments").where("appointment_date", "==", tomorrow()).get();
  const appointments = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((appointment) => !["cancelled", "complete"].includes(appointment.status));

  let sent = 0;
  for (const appointment of appointments) {
    if (appointment.reminder_email_sent_at && appointment.reminder_sms_sent_at) continue;
    const results = await sendAppointmentReminder(appointment);
    const updates = {};
    if (!appointment.reminder_email_sent_at && results.email.status === "fulfilled" && results.email.value.sent) {
      updates.reminder_email_sent_at = new Date().toISOString();
    }
    if (!appointment.reminder_sms_sent_at && results.sms.status === "fulfilled" && results.sms.value.sent) {
      updates.reminder_sms_sent_at = new Date().toISOString();
    }
    if (Object.keys(updates).length) {
      await db.collection("appointments").doc(appointment.id).update(updates);
      sent += 1;
    }
  }

  sendJson(res, 200, { ok: true, checked: appointments.length, sent });
};
