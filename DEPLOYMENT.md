# Angelic Massage Deployment

This site is set up for Vercel hosting with Supabase as the database.

## What Runs Where

- Public website: `public/`
- Vercel API routes: `api/`
- Supabase database setup: `supabase/schema.sql`
- Old local Python backend: `server.py`

Vercel will use the JavaScript files in `api/`. The Python `server.py` can stay in the repo, but it is not used by the Vercel deployment.

## Supabase Setup

1. Create a Supabase project.
2. Open Supabase SQL Editor.
3. Paste and run the contents of `supabase/schema.sql`.
4. Open Project Settings, then API.
5. Copy these values:
   - Project URL
   - Secret key for server-side code
   - Legacy `service_role` key, if your Supabase dashboard uses the older API key screen

Keep the server-side key private. It belongs only in Vercel environment variables, never in frontend JavaScript.

## Vercel Setup

1. Push this repo to GitHub.
2. In Vercel, choose Add New Project.
3. Import the GitHub repo: `asaplyintern/angelic-massage`.
4. Use the default project settings. If Vercel asks for an output directory, use `public`.
5. Add these environment variables in Vercel Project Settings:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
6. Deploy.

If your Supabase dashboard only shows legacy keys, use `SUPABASE_SERVICE_ROLE_KEY` instead of `SUPABASE_SECRET_KEY`.

After deployment:

- Public website: `https://your-vercel-domain.vercel.app`
- Owner dashboard: `https://your-vercel-domain.vercel.app/admin`

## Local Testing

Create `.env.local` from `.env.example`, then run:

```bash
npm install
npm run dev
```

Open the local URL printed by Vercel.

## Booking Rules

Appointments are saved in Supabase. Double booking is blocked by the database using an overlap constraint on appointment start and end times.

Working hours:

- Monday to Friday: 6:00 AM to 7:00 PM
- Saturday: 10:00 AM to 6:00 PM
- Sunday: closed

## Reminders

Email or text reminders should be added with a scheduled Vercel Cron route. That route can check appointments happening tomorrow, send reminders through a provider such as Resend for email or Twilio for SMS, then mark each reminder as sent in Supabase.
