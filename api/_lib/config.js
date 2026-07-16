const crypto = require("crypto");
const { DEFAULT_BUSINESS, DEFAULT_SERVICES } = require("./siteContent");

const BUSINESS = DEFAULT_BUSINESS;

const BUSINESS_HOURS = {
  1: [6, 19],
  2: [6, 19],
  3: [6, 19],
  4: [6, 19],
  5: [6, 19],
  6: [10, 18],
};

const SERVICES = DEFAULT_SERVICES.map((service) => ({
  ...service,
  prices: service.prices.map(([duration, price]) => ({ duration, price })),
}));

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

function normalizeNorthAmericaPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return "";
}

function isValidNorthAmericaPhone(value) {
  return Boolean(normalizeNorthAmericaPhone(value));
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
  isValidNorthAmericaPhone,
  normalizeNorthAmericaPhone,
  validSession,
};
