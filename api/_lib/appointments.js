const { formatDisplayDate } = require("./config");

function appointmentToDict(row) {
  return {
    id: row.id,
    customer_name: row.customer_name,
    email: row.email,
    phone: row.phone,
    service_id: row.service_id,
    service_name: row.service_name,
    duration: row.duration,
    location: row.location,
    appointment_at: row.appointment_start,
    appointment_display: formatDisplayDate(row.appointment_start),
    notes: row.notes || "",
    status: row.status,
    created_at: row.created_at,
    created_at_display: formatDisplayDate(row.created_at),
  };
}

module.exports = { appointmentToDict };
