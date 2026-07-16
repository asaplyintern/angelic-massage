function env(name) {
  return String(process.env[name] || "").trim();
}

function appointmentLine(appointment) {
  return `${appointment.service_name} (${appointment.duration}) on ${appointment.appointment_start.replace("T", " at ")}`;
}

async function sendEmail({ to, subject, text }) {
  const apiKey = env("RESEND_API_KEY");
  const from = env("EMAIL_FROM");
  if (!apiKey || !from || !to) return { skipped: true, reason: "Email is not configured" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Email failed: ${body}`);
  }
  return { sent: true };
}

async function sendSms({ to, body }) {
  const accountSid = env("TWILIO_ACCOUNT_SID");
  const authToken = env("TWILIO_AUTH_TOKEN");
  const from = env("TWILIO_FROM_NUMBER");
  if (!accountSid || !authToken || !from || !to) return { skipped: true, reason: "SMS is not configured" };

  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SMS failed: ${body}`);
  }
  return { sent: true };
}

async function sendBookingConfirmation(appointment) {
  const line = appointmentLine(appointment);
  const text = `Angelic Massage received your appointment request for ${line}. We will contact you to confirm.`;
  const [email, sms] = await Promise.allSettled([
    sendEmail({
      to: appointment.email,
      subject: "Angelic Massage appointment request received",
      text,
    }),
    sendSms({ to: appointment.phone, body: text }),
  ]);
  return { email, sms };
}

async function sendAppointmentReminder(appointment) {
  const line = appointmentLine(appointment);
  const text = `Reminder from Angelic Massage: your appointment is tomorrow, ${line}.`;
  const [email, sms] = await Promise.allSettled([
    sendEmail({
      to: appointment.email,
      subject: "Angelic Massage appointment reminder",
      text,
    }),
    sendSms({ to: appointment.phone, body: text }),
  ]);
  return { email, sms };
}

module.exports = {
  sendAppointmentReminder,
  sendBookingConfirmation,
};
