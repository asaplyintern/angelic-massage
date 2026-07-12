const business = {
  address: "5227 Trepanier Bench Road, Peachland, British Columbia, Canada, V0H 1X2",
  phone: "+1-778-363-9832",
  email: "avrearain@gmail.com",
};

const services = [
  {
    id: "soft-touch",
    name: "Soft Touch",
    category: "Relaxation Massage",
    description: "A calm, gentle massage designed for rest, stress relief, and a lighter therapeutic touch.",
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
    description: "Focused pressure for tight muscles, built-up tension, and areas that need deeper bodywork.",
    popular: false,
    prices: [
      ["30 minutes", 80],
      ["1 hour", 120],
      ["90 minutes", 160],
      ["2 hours", 220],
    ],
  },
  {
    id: "blend",
    name: "Blend",
    category: "Relaxation Massage with Deep Tissue",
    description: "The most popular treatment: relaxing flow with deeper work where your body needs it most.",
    popular: true,
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
    description: "A warming stone treatment for deep relaxation, comfort, and eased muscle tension.",
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
  target.innerHTML = services
    .slice(0, limit || services.length)
    .map(
      (service) => `
        <article class="service-card">
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
        </article>
      `
    )
    .join("");
}

function setupBookingForm() {
  const form = document.getElementById("booking-form");
  if (!form) return;

  const serviceSelect = document.getElementById("serviceId");
  const durationSelect = document.getElementById("duration");
  const back = document.getElementById("booking-back");
  const params = new URLSearchParams(window.location.search);
  const from = params.get("from") === "services" ? "/services" : "/";
  back.href = from;

  serviceSelect.innerHTML = services
    .map((service) => `<option value="${service.id}">${service.name} - ${service.category}</option>`)
    .join("");

  function updateDurations() {
    const service = services.find((item) => item.id === serviceSelect.value);
    durationSelect.innerHTML = service.prices
      .map(([duration, price]) => `<option value="${duration}">${duration} - $${price} CAD</option>`)
      .join("");
  }

  serviceSelect.addEventListener("change", updateDurations);
  updateDurations();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const notice = document.getElementById("booking-notice");
    notice.className = "notice";
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
      updateDurations();
      notice.textContent = "Your appointment request has been saved. Angelic Massage will contact you to confirm.";
      notice.className = "notice success show";
    } catch (error) {
      notice.textContent = error.message;
      notice.className = "notice error show";
    }
  });
}

fillFooter();
renderServices("services-preview", 3);
renderServices("all-services");
setupBookingForm();

