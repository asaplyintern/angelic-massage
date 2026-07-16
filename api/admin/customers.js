const { appointmentToDict } = require("../_lib/appointments");
const { methodNotAllowed, requireAdmin, sendJson } = require("../_lib/http");
const { getFirestore } = require("../_lib/firebase");

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

  const term = search.toLowerCase();
  try {
    const snapshot = await getFirestore()
      .collection("appointments")
      .orderBy("appointment_start", "desc")
      .get();
    const appointments = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((appointment) => {
        const haystack = `${appointment.email || ""} ${appointment.phone || ""} ${appointment.customer_name || ""}`.toLowerCase();
        return haystack.includes(term);
      });
    sendJson(res, 200, { appointments: appointments.map(appointmentToDict) });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
};
