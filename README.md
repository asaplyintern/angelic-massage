# Angelic Massage

A database-backed massage booking website for Angelic Massage.

## Pages

- Home: `/`
- Services: `/services`
- About: `/about`
- Booking: `/booking` (linked from Home and Services only)
- Admin dashboard: `/admin`

## Run Locally

```bash
python3 server.py
```

Then open `http://127.0.0.1:8000`.

## Admin Login

Set an admin password before running:

```bash
export ADMIN_PASSWORD="choose-a-secure-password"
python3 server.py
```

If `ADMIN_PASSWORD` is not set, the demo password is `admin123`. Change it before using the site publicly.

## Database

The app uses SQLite and creates `data/angelic_massage.db` automatically on first run.

Admin users can:

- View today's and upcoming appointments
- Cancel bookings
- Reschedule bookings
- Mark appointments complete
- See customer history by email or phone

