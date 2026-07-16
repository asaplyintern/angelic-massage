const loginPanel = document.getElementById("login-panel");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("login-form");
const loginNotice = document.getElementById("login-notice");
const list = document.getElementById("appointment-list");
const searchForm = document.getElementById("customer-search");
const historyList = document.getElementById("history-list");
const contentForm = document.getElementById("content-form");
const contentNotice = document.getElementById("content-notice");
const serviceEditorList = document.getElementById("service-editor-list");
let editableServices = [];

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

async function loadBookings(day = "upcoming", status = "all", options = {}) {
  try {
    const payload = await api(`/api/admin/bookings?day=${day}&status=${status}`);
    showDashboard();
    list.innerHTML = payload.appointments.length
      ? payload.appointments.map(card).join("")
      : "<p>No appointments found.</p>";
  } catch (error) {
    if (error.message === "Admin login required") {
      showLogin(options.initial ? "" : "Please log in to view appointments.");
      return;
    }
    showLogin(`Login worked, but appointments could not load: ${error.message}`);
  }
}

function lines(value) {
  return Array.isArray(value) ? value.join("\n\n") : String(value || "");
}

function paragraphs(value) {
  return String(value || "")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function priceRows(prices) {
  return (prices || [])
    .map((price) => {
      const duration = Array.isArray(price) ? price[0] : price.duration;
      const amount = Array.isArray(price) ? price[1] : price.price;
      return `${duration}: ${amount}`;
    })
    .join("\n");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parsePrices(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [duration, amount] = line.split(":");
      return [String(duration || "").trim(), Number(String(amount || "").replace(/[^\d.]/g, ""))];
    })
    .filter(([duration, amount]) => duration && Number.isFinite(amount));
}

function renderServiceEditor(services) {
  editableServices = services || [];
  serviceEditorList.innerHTML = editableServices
    .map(
      (service, index) => `
        <article class="service-editor-card">
          <div class="admin-content-grid">
            <div class="field">
              <label for="service-name-${index}">Service name</label>
              <input id="service-name-${index}" data-service="${index}" data-key="name" value="${escapeHtml(service.name)}">
            </div>
            <div class="field">
              <label for="service-category-${index}">Category</label>
              <input id="service-category-${index}" data-service="${index}" data-key="category" value="${escapeHtml(service.category)}">
            </div>
            <div class="field">
              <label for="service-image-${index}">Photo path</label>
              <input id="service-image-${index}" data-service="${index}" data-key="image" value="${escapeHtml(service.image)}">
            </div>
          </div>
          <div class="field">
            <label for="service-description-${index}">Description</label>
            <textarea id="service-description-${index}" data-service="${index}" data-key="description">${escapeHtml(service.description)}</textarea>
          </div>
          <div class="field">
            <label for="service-prices-${index}">Prices, one per line</label>
            <textarea id="service-prices-${index}" data-service="${index}" data-key="prices">${escapeHtml(priceRows(service.prices))}</textarea>
          </div>
          <label class="checkbox">
            <input type="checkbox" data-service="${index}" data-key="popular" ${service.popular ? "checked" : ""}>
            <span>Mark as most popular</span>
          </label>
          <label class="checkbox">
            <input type="checkbox" data-service="${index}" data-key="active" ${service.active !== false ? "checked" : ""}>
            <span>Show this service on the website</span>
          </label>
        </article>
      `
    )
    .join("");
}

async function loadContentEditor() {
  if (!contentForm) return;
  try {
    const content = await api("/api/admin/site-content");
    document.getElementById("content-address").value = content.business.address || "";
    document.getElementById("content-phone").value = content.business.phone || "";
    document.getElementById("content-email").value = content.business.email || "";
    document.getElementById("about-title").value = content.about.introTitle || "";
    document.getElementById("about-intro").value = lines(content.about.introParagraphs);
    document.getElementById("about-studio").value = content.about.studioParagraph || "";
    document.getElementById("about-care").value = lines(content.about.careParagraphs);
    document.getElementById("about-owner").value = lines(content.about.ownerParagraphs);
    renderServiceEditor(content.services);
  } catch (error) {
    contentNotice.textContent = `Website content could not load: ${error.message}`;
    contentNotice.className = "notice error show";
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
    await loadContentEditor();
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

if (serviceEditorList) {
  serviceEditorList.addEventListener("input", (event) => {
    const index = Number(event.target.dataset.service);
    const key = event.target.dataset.key;
    if (!Number.isInteger(index) || !key || !editableServices[index]) return;
    if (key === "prices") editableServices[index].prices = parsePrices(event.target.value);
    else if (key === "popular" || key === "active") editableServices[index][key] = event.target.checked;
    else editableServices[index][key] = event.target.value;
  });
  serviceEditorList.addEventListener("change", (event) => {
    if (!["popular", "active"].includes(event.target.dataset.key)) return;
    const index = Number(event.target.dataset.service);
    if (Number.isInteger(index) && editableServices[index]) {
      editableServices[index][event.target.dataset.key] = event.target.checked;
    }
  });
}

if (contentForm) {
  contentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    contentNotice.className = "notice";
    const payload = {
      business: {
        address: document.getElementById("content-address").value.trim(),
        phone: document.getElementById("content-phone").value.trim(),
        email: document.getElementById("content-email").value.trim(),
      },
      services: editableServices,
      about: {
        introTitle: document.getElementById("about-title").value.trim(),
        introParagraphs: paragraphs(document.getElementById("about-intro").value),
        studioParagraph: document.getElementById("about-studio").value.trim(),
        careParagraphs: paragraphs(document.getElementById("about-care").value),
        ownerParagraphs: paragraphs(document.getElementById("about-owner").value),
      },
    };
    try {
      await api("/api/admin/site-content", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      contentNotice.textContent = "Website content saved.";
      contentNotice.className = "notice success show";
    } catch (error) {
      contentNotice.textContent = error.message;
      contentNotice.className = "notice error show";
    }
  });
}

document.getElementById("logout").addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  showLogin();
});

loadBookings("upcoming", "all", { initial: true }).then(() => {
  if (dashboard.style.display !== "none") loadContentEditor();
});
