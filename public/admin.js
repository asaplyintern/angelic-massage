const loginPanel = document.getElementById("login-panel");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("login-form");
const loginNotice = document.getElementById("login-notice");
const list = document.getElementById("appointment-list");
const searchForm = document.getElementById("customer-search");
const historyList = document.getElementById("history-list");

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
}

function showDashboard() {
  loginPanel.style.display = "none";
  dashboard.style.display = "block";
}

function showLogin(message = "") {
  dashboard.style.display = "none";
  loginPanel.style.display = "block";
  loginNotice.textContent = message;
  loginNotice.className = message ? "notice error show" : "notice";
}

function card(booking) {
  return `
    <article class="appointment-card">
      <span class="status ${booking.status}">${booking.status}</span>
      <h3>${booking.customer_name}</h3>
      <div class="appointment-meta">
        <span>${booking.appointment_display}</span>
        <span>${booking.service_name}</span>
        <span>${booking.duration}</span>
        <span>${booking.location}</span>
      </div>
      <p><strong>Phone:</strong> ${booking.phone} &nbsp; <strong>Email:</strong> ${booking.email}</p>
      ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ""}
      <div class="admin-actions">
        <button data-action="confirmed" data-id="${booking.id}">Confirm</button>
        <button data-action="complete" data-id="${booking.id}">Complete</button>
        <button data-action="cancelled" data-id="${booking.id}">Cancel</button>
        <input type="datetime-local" data-date="${booking.id}" aria-label="New appointment time">
        <button data-reschedule="${booking.id}">Reschedule</button>
      </div>
    </article>
  `;
}

async function loadBookings(day = "upcoming", status = "all") {
  try {
    const payload = await api(`/api/admin/bookings?day=${day}&status=${status}`);
    showDashboard();
    list.innerHTML = payload.appointments.length
      ? payload.appointments.map(card).join("")
      : "<p>No appointments found.</p>";
  } catch (error) {
    showLogin("Please log in to view appointments.");
  }
}

async function updateBooking(id, body) {
  await api(`/api/admin/bookings/${id}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  await loadBookings();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(new FormData(loginForm).entries())),
    });
    loginForm.reset();
    await loadBookings();
  } catch (error) {
    showLogin(error.message);
  }
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    loadBookings(button.dataset.day || "upcoming", button.dataset.status || "all");
  });
});

list.addEventListener("click", async (event) => {
  const status = event.target.dataset.action;
  const id = event.target.dataset.id;
  const reschedule = event.target.dataset.reschedule;
  try {
    if (status && id) {
      await updateBooking(id, { status });
    }
    if (reschedule) {
      const input = document.querySelector(`[data-date="${reschedule}"]`);
      if (!input.value) throw new Error("Choose a new date and time first.");
      await updateBooking(reschedule, { appointmentAt: input.value });
    }
  } catch (error) {
    alert(error.message);
  }
});

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const q = new FormData(searchForm).get("q");
  try {
    const payload = await api(`/api/admin/customers?q=${encodeURIComponent(q)}`);
    historyList.innerHTML = payload.appointments.length
      ? payload.appointments.map(card).join("")
      : "<p>No customer history found.</p>";
  } catch (error) {
    showLogin("Please log in to search customer history.");
  }
});

document.getElementById("logout").addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  showLogin();
});

loadBookings();

