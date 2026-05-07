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
```

On Vercel, add the same environment variables in Project Settings.

## Deployment

This project deploys as a Next.js app on Vercel. The repo includes
`vercel.json` so deployments use the Next.js framework preset, `npm ci`, and the
`.next` build output instead of an old Vite-style `dist` directory.
