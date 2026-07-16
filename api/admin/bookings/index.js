const { appointmentToDict } = require("../../_lib/appointments");
const { methodNotAllowed, requireAdmin, sendJson } = require("../../_lib/http");
const { getFirestore } = require("../../_lib/firebase");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    methodNotAllowed(res);
    return;
  }
  if (!requireAdmin(req, res)) return;

  const { day = "", status = "" } = req.query;
  let appointments;
  try {
    const snapshot = await getFirestore()
      .collection("appointments")
      .orderBy("appointment_start", "asc")
      .get();

    appointments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    sendJson(res, 500, { error: error.message });
    return;
  }

  if (status && status !== "all") {
    appointments = appointments.filter((appointment) => appointment.status === status);
  }
  if (day === "today") {
    const today = new Date().toISOString().slice(0, 10);
    appointments = appointments.filter((appointment) => appointment.appointment_start >= `${today}T00:00` && appointment.appointment_start <= `${today}T23:59`);
  } else if (day === "upcoming") {
    appointments = appointments.filter((appointment) => appointment.appointment_start >= new Date().toISOString().slice(0, 16));
  }

  sendJson(res, 200, { appointments: appointments.map(appointmentToDict) });
};
