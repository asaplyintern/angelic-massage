const business = {
  address: "5227 Trepanier Bench Road, Peachland, British Columbia, Canada, V0H 1X2",
  phone: "+1-778-363-9832",
  email: "avrearain@gmail.com",
};

const services = [
  {
    id: "blend",
    name: "Blend",
    category: "Relaxation Massage with Deep Tissue",
    description: "Relaxation massage with deeper pressure where needed.",
    image: "/assets/blend-massage.jpg",
    popular: true,
    prices: [
      ["30 minutes", 80],
      ["1 hour", 120],
      ["90 minutes", 160],
      ["2 hours", 220],
    ],
  },
  {
    id: "soft-touch",
    name: "Soft Touch",
    category: "Relaxation Massage",
    description: "Gentle relaxation massage.",
    image: "/assets/soft-touch-neck.jpg",
    popular: false,
    prices: [
      ["30 minutes", 80],
      ["1 hour", 120],
      ["90 minutes", 160],
      ["2 hours", 220],
    ],
  },
  {
    id: "deep-tissue",
    name: "Deep Tissue",
    category: "Therapeutic Massage",
    description: "Focused pressure for tight muscles.",
    image: "/assets/deep-tissue-back.jpg",
    popular: false,
    prices: [
      ["30 minutes", 80],
      ["1 hour", 120],
      ["90 minutes", 160],
      ["2 hours", 220],
    ],
  },
  {
    id: "hot-stone",
    name: "Hot Stone Therapy",
    category: "Stone Therapy",
    description: "Warm stone massage.",
    image: "/assets/hot-stones-back.jpg",
    popular: false,
    prices: [
      ["1 hour", 150],
      ["90 minutes", 190],
      ["2 hours", 250],
    ],
  },
];

function fillFooter() {
  document.querySelectorAll("[data-address]").forEach((el) => {
    el.textContent = business.address;
  });
  document.querySelectorAll("[data-phone]").forEach((el) => {
    el.textContent = business.phone;
    if (el.tagName === "A") el.href = `tel:${business.phone.replaceAll("-", "")}`;
  });
  document.querySelectorAll("[data-email]").forEach((el) => {
    el.textContent = business.email;
    if (el.tagName === "A") el.href = `mailto:${business.email}`;
  });
}

function renderServices(targetId, limit) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const source = window.location.pathname === "/services" ? "services" : "home";
  const visibleServices = targetId === "all-services"
    ? services.filter((service) => service.id !== "hot-stone")
    : services;
  target.innerHTML = visibleServices
    .slice(0, limit || visibleServices.length)
    .map(
      (service) => `
        <a class="service-card reveal" href="/booking?from=${source}&service=${service.id}">
          <img class="service-image" src="${service.image}" alt="${service.name} treatment">
          ${service.popular ? '<span class="badge">Most Popular</span>' : ""}
          <div>
            <h3>${service.name}</h3>
            <p><strong>${service.category}</strong></p>
            <p>${service.description}</p>
          </div>
          <ul class="price-list">
            ${service.prices
              .map(([duration, price]) => `<li><span>${duration}</span><span>$${price} CAD</span></li>`)
              .join("")}
          </ul>
        </a>
      `
    )
    .join("");
}

function setupBookingForm() {
  const form = document.getElementById("booking-form");
  if (!form) return;

  const serviceSelect = document.getElementById("serviceId");
  const durationSelect = document.getElementById("duration");
  const dateInput = document.getElementById("appointmentDate");
  const appointmentAt = document.getElementById("appointmentAt");
  const slotGrid = document.getElementById("slot-grid");
  const slotStatus = document.getElementById("slot-status");
  const back = document.getElementById("booking-back");
  const params = new URLSearchParams(window.location.search);
  const from = params.get("from") === "services" ? "/services" : "/";
  back.href = from;
  const today = new Date();
  const todayValue = toDateInputValue(today);
  dateInput.min = todayValue;
  dateInput.value = nextOpenDate(today);

  serviceSelect.innerHTML = '<option value="" selected disabled>Choose a service</option>' + services
    .map((service) => `<option value="${service.id}">${service.name} - ${service.category}</option>`)
    .join("");
  const requestedService = params.get("service");
  if (services.some((service) => service.id === requestedService)) {
    serviceSelect.value = requestedService;
  }

  function updateDurations() {
    const service = services.find((item) => item.id === serviceSelect.value);
    if (!service) {
      durationSelect.innerHTML = '<option value="" selected disabled>Choose a service first</option>';
      appointmentAt.value = "";
      renderEmptySlots("Choose a service and duration to see available times.");
      return;
    }
    durationSelect.innerHTML = '<option value="" selected disabled>Choose a duration</option>' + service.prices
      .map(([duration, price]) => `<option value="${duration}">${duration} - $${price} CAD</option>`)
      .join("");
    appointmentAt.value = "";
    renderEmptySlots("Choose a duration to see available times.");
  }

  async function updateSlots() {
    appointmentAt.value = "";
    slotGrid.innerHTML = "";
    const duration = durationSelect.value;
    if (!serviceSelect.value || !duration || !dateInput.value) {
      renderEmptySlots(!serviceSelect.value ? "Choose a service and duration to see available times." : "Choose a duration to see available times.");
      return;
    }
    slotStatus.textContent = "Checking available times...";
    try {
      const query = new URLSearchParams({ date: dateInput.value, duration });
      const response = await fetch(`/api/availability?${query.toString()}`);
      if (!response.ok) throw new Error("Availability could not be loaded");
      const payload = await response.json();
      if (!payload.open) {
        renderEmptySlots("Closed on Sundays. Please choose Monday through Saturday.");
        return;
      }
      renderSlots(payload.slots, payload.hours);
    } catch (error) {
      renderSlots(fallbackSlots(dateInput.value, duration), "Estimated working hours");
    }
  }

  function renderEmptySlots(message) {
    slotStatus.textContent = message;
    slotGrid.innerHTML = "";
  }

  function renderSlots(slots, hours) {
    const available = slots.filter((slot) => slot.available);
    if (!slots.length || !available.length) {
      slotStatus.textContent = hours === "Closed" ? "Closed on Sundays. Please choose Monday through Saturday." : "No available times for this date and duration.";
      slotGrid.innerHTML = "";
      return;
    }
    slotStatus.textContent = `${hours}. Select an available appointment time.`;
    slotGrid.innerHTML = slots
      .map((slot) => `<button class="slot-button" type="button" data-value="${slot.value}" ${slot.available ? "" : "disabled"}>${slot.label}</button>`)
      .join("");
  }

  slotGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".slot-button");
    if (!button || button.disabled) return;
    slotGrid.querySelectorAll(".slot-button").forEach((item) => item.classList.remove("selected"));
    button.classList.add("selected");
    appointmentAt.value = button.dataset.value;
  });

  serviceSelect.addEventListener("change", () => {
    updateDurations();
    updateSlots();
  });
  durationSelect.addEventListener("change", updateSlots);
  dateInput.addEventListener("change", updateSlots);
  updateDurations();
  updateSlots();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const notice = document.getElementById("booking-notice");
    notice.className = "notice";
    if (!appointmentAt.value) {
      notice.textContent = "Please choose an available appointment time.";
      notice.className = "notice error show";
      return;
    }
    const data = Object.fromEntries(new FormData(form).entries());
    data.balcony = document.getElementById("balcony").checked;
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Booking could not be saved");
      form.reset();
      dateInput.value = nextOpenDate(new Date());
      appointmentAt.value = "";
      updateDurations();
      updateSlots();
      notice.textContent = "Your appointment request has been saved. Angelic Massage will contact you to confirm.";
      notice.className = "notice success show";
    } catch (error) {
      notice.textContent = error.message;
      notice.className = "notice error show";
    }
  });
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nextOpenDate(date) {
  const next = new Date(date);
  while (next.getDay() === 0) {
    next.setDate(next.getDate() + 1);
  }
  return toDateInputValue(next);
}

function minutesForDuration(duration) {
  if (duration.includes("30")) return 30;
  if (duration.includes("90")) return 90;
  if (duration.includes("2 hour")) return 120;
  if (duration.includes("1 hour")) return 60;
  return 30;
}

function fallbackSlots(dateValue, duration) {
  const date = new Date(`${dateValue}T00:00:00`);
  const day = date.getDay();
  if (day === 0) return [];
  const openHour = day === 6 ? 10 : 6;
  const closeHour = day === 6 ? 18 : 19;
  const durationMinutes = minutesForDuration(duration);
  const slots = [];
  for (let minutes = openHour * 60; minutes + durationMinutes <= closeHour * 60; minutes += 30) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const value = `${dateValue}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    slots.push({
      value,
      label: new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      available: true,
    });
  }
  return slots;
}

function setupRevealAnimations() {
  const items = document.querySelectorAll(
    ".hero-copy, .hero-actions, .services-hero-copy, .services-hero-photo, .menu-sidebar, .schedule-picker, .feature, .service-card, .hot-stone-feature, .image-card, .about-card, .about-copy, .about-split-photo, .owner-photo, .owner-story, .about-photo, .booking-strip, .booking-panel, .admin-panel, .section-heading, .page-title"
  );
  items.forEach((item) => item.classList.add("reveal"));
  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );
  items.forEach((item) => observer.observe(item));
}

fillFooter();
renderServices("services-preview", 3);
renderServices("all-services");
setupBookingForm();
setupRevealAnimations();
