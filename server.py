#!/usr/bin/env python3
import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
from datetime import datetime, timedelta
from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "angelic_massage.db"
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
SESSION_SECRET = os.environ.get("SESSION_SECRET", "local-dev-session-secret")

BUSINESS = {
    "name": "Angelic Massage",
    "address": "5227 Trepanier Bench Road, Peachland, British Columbia, Canada, V0H 1X2",
    "phone": "+1-778-363-9832",
    "email": "avrearain@gmail.com",
}

BUSINESS_HOURS = {
    0: (6, 19),
    1: (6, 19),
    2: (6, 19),
    3: (6, 19),
    4: (6, 19),
    5: (10, 18),
}

SERVICES = [
    {
        "id": "soft-touch",
        "name": "Soft Touch",
        "category": "Relaxation Massage",
        "description": "Gentle relaxation massage.",
        "popular": False,
        "prices": [
            {"duration": "30 minutes", "price": 80},
            {"duration": "1 hour", "price": 120},
            {"duration": "90 minutes", "price": 160},
            {"duration": "2 hours", "price": 220},
        ],
    },
    {
        "id": "deep-tissue",
        "name": "Deep Tissue",
        "category": "Therapeutic Massage",
        "description": "Focused pressure for tight muscles.",
        "popular": False,
        "prices": [
            {"duration": "30 minutes", "price": 80},
            {"duration": "1 hour", "price": 120},
            {"duration": "90 minutes", "price": 160},
            {"duration": "2 hours", "price": 220},
        ],
    },
    {
        "id": "blend",
        "name": "Blend",
        "category": "Relaxation Massage with Deep Tissue",
        "description": "Relaxation massage with deeper pressure where needed.",
        "popular": True,
        "prices": [
            {"duration": "30 minutes", "price": 80},
            {"duration": "1 hour", "price": 120},
            {"duration": "90 minutes", "price": 160},
            {"duration": "2 hours", "price": 220},
        ],
    },
    {
        "id": "hot-stone",
        "name": "Hot Stone Therapy",
        "category": "Stone Therapy",
        "description": "Warm stone massage.",
        "popular": False,
        "prices": [
            {"duration": "1 hour", "price": 150},
            {"duration": "90 minutes", "price": 190},
            {"duration": "2 hours", "price": 250},
        ],
    },
]


def db():
    DATA_DIR.mkdir(exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with db() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS appointments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT NOT NULL,
                service_id TEXT NOT NULL,
                service_name TEXT NOT NULL,
                duration TEXT NOT NULL,
                location TEXT NOT NULL,
                appointment_at TEXT NOT NULL,
                notes TEXT DEFAULT '',
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_at)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(email, phone)"
        )


def sign(value):
    digest = hmac.new(SESSION_SECRET.encode(), value.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).decode().rstrip("=")


def make_session():
    value = secrets.token_urlsafe(24)
    return f"{value}.{sign(value)}"


def valid_session(token):
    if not token or "." not in token:
        return False
    value, signature = token.rsplit(".", 1)
    return hmac.compare_digest(signature, sign(value))


def appointment_to_dict(row):
    item = dict(row)
    item["created_at_display"] = display_datetime(item["created_at"])
    item["appointment_display"] = display_datetime(item["appointment_at"])
    return item


def display_datetime(value):
    try:
        return datetime.fromisoformat(value).strftime("%b %-d, %Y at %-I:%M %p")
    except ValueError:
        return value


def find_service(service_id):
    for service in SERVICES:
        if service["id"] == service_id:
            return service
    return None


def duration_to_minutes(duration):
    normalized = duration.lower()
    if "30" in normalized:
        return 30
    if "90" in normalized:
        return 90
    if "2 hour" in normalized:
        return 120
    if "1 hour" in normalized:
        return 60
    return 0


def format_time(value):
    return value.strftime("%-I:%M %p")


def day_bounds(day):
    hours = BUSINESS_HOURS.get(day.weekday())
    if not hours:
        return None
    open_hour, close_hour = hours
    return day.replace(hour=open_hour, minute=0), day.replace(hour=close_hour, minute=0)


def is_within_business_hours(start, duration_minutes):
    bounds = day_bounds(start)
    if not bounds:
        return False
    open_at, close_at = bounds
    end = start + timedelta(minutes=duration_minutes)
    return open_at <= start and end <= close_at


def booked_appointments_for_day(day):
    with db() as connection:
        return connection.execute(
            """
            SELECT appointment_at, duration FROM appointments
            WHERE date(appointment_at) = ? AND status != 'cancelled'
            """,
            (day,),
        ).fetchall()


def slot_has_conflict(start, duration_minutes):
    end = start + timedelta(minutes=duration_minutes)
    for booking in booked_appointments_for_day(start.date().isoformat()):
        booked_start = datetime.fromisoformat(booking["appointment_at"])
        booked_end = booked_start + timedelta(minutes=duration_to_minutes(booking["duration"]))
        if start < booked_end and end > booked_start:
            return True
    return False


def availability_for_day(day, duration_minutes):
    bounds = day_bounds(day)
    if not bounds or duration_minutes <= 0:
        return []
    open_at, close_at = bounds
    slots = []
    current = open_at
    now = datetime.now()
    while current + timedelta(minutes=duration_minutes) <= close_at:
        value = current.isoformat(timespec="minutes")
        slots.append(
            {
                "value": value,
                "time": current.strftime("%H:%M"),
                "label": format_time(current),
                "available": current >= now and not slot_has_conflict(current, duration_minutes),
            }
        )
        current += timedelta(minutes=30)
    return slots


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        parsed = urlparse(path)
        route = parsed.path.rstrip("/") or "/"
        pages = {
            "/": "index.html",
            "/services": "services.html",
            "/about": "about.html",
            "/booking": "booking.html",
            "/admin": "admin.html",
        }
        if route in pages:
            return str(PUBLIC / pages[route])
        return str(PUBLIC / parsed.path.lstrip("/"))

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/config":
            self.json({"business": BUSINESS, "services": SERVICES})
            return
        if parsed.path == "/api/availability":
            self.availability(parsed.query)
            return
        if parsed.path == "/api/admin/bookings":
            if not self.require_admin():
                return
            self.list_bookings(parsed.query)
            return
        if parsed.path == "/api/admin/customers":
            if not self.require_admin():
                return
            self.customer_history(parsed.query)
            return
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/bookings":
            self.create_booking()
            return
        if parsed.path == "/api/admin/login":
            self.admin_login()
            return
        if parsed.path == "/api/admin/logout":
            self.send_response(204)
            self.send_header("Set-Cookie", "angelic_admin=; Path=/; Max-Age=0; SameSite=Lax")
            self.end_headers()
            return
        if parsed.path.startswith("/api/admin/bookings/"):
            if not self.require_admin():
                return
            self.update_booking(parsed.path)
            return
        self.error(404, "Not found")

    def read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode())
        except json.JSONDecodeError:
            self.error(400, "Invalid JSON")
            return None

    def json(self, payload, status=200, extra_headers=None):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        if extra_headers:
            for key, value in extra_headers.items():
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def error(self, status, message):
        self.json({"error": message}, status)

    def is_admin(self):
        cookie_header = self.headers.get("Cookie", "")
        jar = cookies.SimpleCookie(cookie_header)
        token = jar.get("angelic_admin")
        return valid_session(token.value) if token else False

    def require_admin(self):
        if self.is_admin():
            return True
        self.error(401, "Admin login required")
        return False

    def admin_login(self):
        payload = self.read_json()
        if payload is None:
            return
        if hmac.compare_digest(payload.get("password", ""), ADMIN_PASSWORD):
            self.json(
                {"ok": True},
                extra_headers={
                    "Set-Cookie": f"angelic_admin={make_session()}; Path=/; HttpOnly; SameSite=Lax"
                },
            )
            return
        self.error(403, "Incorrect password")

    def create_booking(self):
        payload = self.read_json()
        if payload is None:
            return
        required = ["name", "email", "phone", "serviceId", "duration", "appointmentAt"]
        missing = [field for field in required if not str(payload.get(field, "")).strip()]
        if missing:
            self.error(400, f"Missing required fields: {', '.join(missing)}")
            return

        service = find_service(payload["serviceId"])
        if not service:
            self.error(400, "Unknown service")
            return
        valid_durations = {price["duration"] for price in service["prices"]}
        if payload["duration"] not in valid_durations:
            self.error(400, "That duration is not available for the selected service")
            return
        try:
            appointment_at = datetime.fromisoformat(payload["appointmentAt"]).isoformat(timespec="minutes")
        except ValueError:
            self.error(400, "Invalid appointment date")
            return
        appointment_start = datetime.fromisoformat(appointment_at)
        duration_minutes = duration_to_minutes(payload["duration"])
        if not is_within_business_hours(appointment_start, duration_minutes):
            self.error(400, "That time is outside Angelic Massage working hours")
            return
        if slot_has_conflict(appointment_start, duration_minutes):
            self.error(409, "That appointment time is no longer available")
            return

        location = "Lakeview balcony (+$20)" if payload.get("balcony") else "Indoor treatment room"
        with db() as connection:
            cursor = connection.execute(
                """
                INSERT INTO appointments (
                    customer_name, email, phone, service_id, service_name, duration,
                    location, appointment_at, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload["name"].strip(),
                    payload["email"].strip(),
                    payload["phone"].strip(),
                    service["id"],
                    service["name"],
                    payload["duration"],
                    location,
                    appointment_at,
                    payload.get("notes", "").strip(),
                ),
            )
        self.json({"ok": True, "id": cursor.lastrowid}, 201)

    def availability(self, query):
        filters = parse_qs(query)
        day = filters.get("date", [""])[0]
        duration = filters.get("duration", [""])[0]
        try:
            selected_day = datetime.fromisoformat(day)
        except ValueError:
            self.error(400, "Invalid date")
            return
        duration_minutes = duration_to_minutes(duration)
        bounds = day_bounds(selected_day)
        if not bounds:
            self.json(
                {
                    "open": False,
                    "hours": "Closed",
                    "slots": [],
                }
            )
            return
        open_at, close_at = bounds
        self.json(
            {
                "open": True,
                "hours": f"{format_time(open_at)} - {format_time(close_at)}",
                "slots": availability_for_day(selected_day, duration_minutes),
            }
        )

    def list_bookings(self, query):
        filters = parse_qs(query)
        status = filters.get("status", [""])[0]
        day = filters.get("day", [""])[0]
        sql = "SELECT * FROM appointments"
        params = []
        clauses = []
        if status and status != "all":
            clauses.append("status = ?")
            params.append(status)
        if day == "today":
            clauses.append("date(appointment_at) = date('now', 'localtime')")
        elif day == "upcoming":
            clauses.append("datetime(appointment_at) >= datetime('now', 'localtime')")
        if clauses:
            sql += " WHERE " + " AND ".join(clauses)
        sql += " ORDER BY datetime(appointment_at) ASC"
        with db() as connection:
            rows = connection.execute(sql, params).fetchall()
        self.json({"appointments": [appointment_to_dict(row) for row in rows]})

    def customer_history(self, query):
        search = parse_qs(query).get("q", [""])[0].strip()
        if not search:
            self.json({"appointments": []})
            return
        like = f"%{search}%"
        with db() as connection:
            rows = connection.execute(
                """
                SELECT * FROM appointments
                WHERE email LIKE ? OR phone LIKE ? OR customer_name LIKE ?
                ORDER BY datetime(appointment_at) DESC
                """,
                (like, like, like),
            ).fetchall()
        self.json({"appointments": [appointment_to_dict(row) for row in rows]})

    def update_booking(self, path):
        try:
            booking_id = int(path.rsplit("/", 1)[1])
        except ValueError:
            self.error(400, "Invalid booking id")
            return
        payload = self.read_json()
        if payload is None:
            return

        allowed_statuses = {"pending", "confirmed", "cancelled", "complete"}
        updates = []
        params = []
        if "status" in payload:
            if payload["status"] not in allowed_statuses:
                self.error(400, "Invalid status")
                return
            updates.append("status = ?")
            params.append(payload["status"])
        if "appointmentAt" in payload and payload["appointmentAt"]:
            try:
                appointment_at = datetime.fromisoformat(payload["appointmentAt"]).isoformat(timespec="minutes")
            except ValueError:
                self.error(400, "Invalid appointment date")
                return
            updates.append("appointment_at = ?")
            params.append(appointment_at)
        if not updates:
            self.error(400, "No updates supplied")
            return
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(booking_id)
        with db() as connection:
            cursor = connection.execute(
                f"UPDATE appointments SET {', '.join(updates)} WHERE id = ?",
                params,
            )
        if cursor.rowcount == 0:
            self.error(404, "Booking not found")
            return
        self.json({"ok": True})


def main():
    init_db()
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Angelic Massage running at http://127.0.0.1:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
