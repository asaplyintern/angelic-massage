const crypto = require("crypto");

const BUSINESS = {
  name: "Angelic Massage",
  address: "5227 Trepanier Bench Road, Peachland, British Columbia, Canada, V0H 1X2",
  phone: "+1-778-363-9832",
  email: "avrearain@gmail.com",
};

const BUSINESS_HOURS = {
  1: [6, 19],
  2: [6, 19],
  3: [6, 19],
  4: [6, 19],
  5: [6, 19],
  6: [10, 18],
};

const SERVICES = [
  {
    id: "blend",
    name: "Blend",
    category: "Relaxation Massage with Deep Tissue",
    description: "Relaxation massage with deeper pressure where needed.",
    popular: true,
    prices: [
      { duration: "30 minutes", price: 80 },
      { duration: "1 hour", price: 120 },
      { duration: "90 minutes", price: 160 },
      { duration: "2 hours", price: 220 },
    ],
  },
  {
    id: "soft-touch",
    name: "Soft Touch",
    category: "Relaxation Massage",
    description: "Gentle relaxation massage.",
    popular: false,
    prices: [
      { duration: "30 minutes", price: 80 },
      { duration: "1 hour", price: 120 },
      { duration: "90 minutes", price: 160 },
      { duration: "2 hours", price: 220 },
    ],
  },
  {
    id: "deep-tissue",
    name: "Deep Tissue",
    category: "Therapeutic Massage",
    description: "Focused pressure for tight muscles.",
    popular: false,
    prices: [
      { duration: "30 minutes", price: 80 },
      { duration: "1 hour", price: 120 },
      { duration: "90 minutes", price: 160 },
      { duration: "2 hours", price: 220 },
    ],
  },
  {
    id: "hot-stone",
    name: "Hot Stone Therapy",
    category: "Stone Therapy",
    description: "Warm stone massage.",
    popular: false,
    prices: [
      { duration: "1 hour", price: 150 },
      { duration: "90 minutes", price: 190 },
      { duration: "2 hours", price: 250 },
    ],
  },
];

function findService(serviceId) {
  return SERVICES.find((service) => service.id === serviceId);
}

function durationToMinutes(duration) {
  const normalized = String(duration || "").toLowerCase();
  if (normalized.includes("30")) return 30;
  if (normalized.includes("90")) return 90;
  if (normalized.includes("2 hour")) return 120;
  if (normalized.includes("1 hour")) return 60;
  return 0;
}

function dayBounds(date) {
  const hours = BUSINESS_HOURS[date.getDay()];
  if (!hours) return null;
  const [openHour, closeHour] = hours;
  const openAt = new Date(date);
  openAt.setHours(openHour, 0, 0, 0);
  const closeAt = new Date(date);
  closeAt.setHours(closeHour, 0, 0, 0);
  return { openAt, closeAt };
}

function isWithinBusinessHours(start, durationMinutes) {
  const bounds = dayBounds(start);
  if (!bounds) return false;
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return start >= bounds.openAt && end <= bounds.closeAt;
}

function addMinutesToLocalValue(value, minutesToAdd) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(String(value || ""));
  if (!match) return "";

  const [, day, hours, minutes] = match;
  const totalMinutes = Number(hours) * 60 + Number(minutes) + minutesToAdd;
  const dayOffset = Math.floor(totalMinutes / 1440);
  const minutesInDay = ((totalMinutes % 1440) + 1440) % 1440;
  const resultDay = new Date(`${day}T00:00:00`);
  resultDay.setDate(resultDay.getDate() + dayOffset);

  const year = resultDay.getFullYear();
  const month = String(resultDay.getMonth() + 1).padStart(2, "0");
  const date = String(resultDay.getDate()).padStart(2, "0");
  const resultHours = String(Math.floor(minutesInDay / 60)).padStart(2, "0");
  const resultMinutes = String(minutesInDay % 60).padStart(2, "0");
  return `${year}-${month}-${date}T${resultHours}:${resultMinutes}`;
}

function formatTime(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function formatDisplayDate(value) {
  const date = new Date(value);
  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
  return `${month} ${date.getDate()}, ${date.getFullYear()} at ${formatTime(date)}`;
}

function sign(value) {
  const secret = process.env.SESSION_SECRET || "local-dev-session-secret";
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function makeSession() {
  const value = crypto.randomBytes(24).toString("base64url");
  return `${value}.${sign(value)}`;
}

function validSession(token) {
  if (!token || !token.includes(".")) return false;
  const [value, signature] = token.split(".");
  const expected = sign(value);
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

module.exports = {
  BUSINESS,
  BUSINESS_HOURS,
  SERVICES,
  addMinutesToLocalValue,
  dayBounds,
  durationToMinutes,
  findService,
  formatDisplayDate,
  formatTime,
  isWithinBusinessHours,
  makeSession,
  validSession,
};
