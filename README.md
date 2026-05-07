# Study Buddy AI

Study Buddy AI is a Next.js app-router project for AI-assisted study workflows,
including summaries, quizzes, grammar help, counseling prompts, past papers, and
resume tools.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run test
```

## Environment

Copy `.env.example` to `.env.local` for local development and set:

```bash
OPENROUTER_API_KEY=
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_SITE_NAME=Study Buddy AI
MONGODB_URI=
MONGODB_DB=study-buddy-ai
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
ADMIN_EMAILS=
```

On Vercel, add the same environment variables in Project Settings. `MONGODB_URI`
should be a MongoDB Atlas or self-hosted MongoDB connection string. Auth
sessions, user profiles, saved library items, and settings are stored in
MongoDB.

For Google login, create OAuth credentials in Google Cloud and set the callback
URL to `/api/auth/callback/google` on your deployed domain. `ADMIN_EMAILS` is a
comma-separated list of emails allowed to access `/admin`.

## Deployment

This project deploys as a Next.js app on Vercel. The repo includes
`vercel.json` so deployments use the Next.js framework preset, `npm ci`, and the
`.next` build output instead of an old Vite-style `dist` directory.
