# Angelic Massage Deployment

This site is set up for Vercel hosting with Firebase Firestore as the database.

## What Runs Where

- Public website: `public/`
- Vercel API routes: `api/`
- Firebase Firestore collection: `appointments`
- Old local Python backend: `server.py`

Vercel will use the JavaScript files in `api/`. The Python `server.py` can stay in the repo, but it is not used by the Vercel deployment.

## Firebase Setup

1. Create a Firebase project.
2. Create a Firestore database using Standard edition.
3. Open Project Settings, then Service accounts.
4. Generate a new private key and download the JSON file.
5. Keep the JSON file private. Do not commit it to GitHub.

The Firestore `appointments` collection is created automatically when the first appointment is booked.

## Vercel Setup

1. Push this repo to GitHub.
2. In Vercel, choose Add New Project.
3. Import the GitHub repo: `asaplyintern/angelic-massage`.
4. Use the default project settings. If Vercel asks for an output directory, use `public`.
5. Add these environment variables in Vercel Project Settings:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
6. Deploy.

`FIREBASE_PRIVATE_KEY` must be copied from the service account JSON. In Vercel, it is okay if the line breaks appear as `\n`.

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

Appointments are saved in Firestore. Public booking checks the selected appointment date inside a Firestore transaction before saving, so overlapping appointments are rejected.

Working hours:

- Monday to Friday: 6:00 AM to 7:00 PM
- Saturday: 10:00 AM to 6:00 PM
- Sunday: closed

## Reminders

Email or text reminders should be added with a scheduled Vercel Cron route. That route can check appointments happening tomorrow, send reminders through a provider such as Resend for email or Twilio for SMS, then mark each reminder as sent in Firestore.
