# Prompt Chain — Week 2: Connecting the Database

AI tool used: Claude (Sonnet 5), via Cowork with a live link to my Mac (device bridge) and browser automation.

## Prompts, in order

1. **"This is my assignment for this week. Please help me go through it and do what's needed. remember that as part of my submission I need to submit the prompt chain as well."**
   (Attached: screenshot of Week 2 assignment instructions.)
   → Claude located the existing repo (`humor-project-week1`) on my Mac via the device bridge, read the assignment requirements, and asked what the table topic should be and whether I had a Supabase project.

2. **"lets start over- what's happening here? I need you to work according to the screenshot I sent you above"**
   → Claude gave a plain-language recap of the assignment steps and what it still needed (a Supabase project, and a table topic).

3. **"I have a supabase and Vercel account- lets connect the project to them"**
   → Claude opened Supabase in the browser pane and asked me to sign in.

4. **"did we connect this Humor project to GITHUB or Supabase yet?"**
   → Claude confirmed GitHub was already connected (from Assignment #1); Supabase was still pending my sign-in.

5. **"ok cool so now you need me to open supabase for you?"**
   → Claude checked the browser pane state (mid Google sign-in) and asked me to complete it.

6. **"ok we are in- what now?"**
   → Claude created a Supabase organization ("The Humor Project") and a new project (`humor-project-week1`), then created a `captions` table via the SQL editor, seeded it with 5 rows, and enabled RLS with a public-read policy.

7. **(mid-turn) "why do you need to delte these files?"**
   → Claude explained it only needed to delete the stale `.next` build-cache folder (gitignored, regenerated automatically), not any source files.

8. **"this is what I got- is it ok?"** (screenshot of a VS Code terminal running `git push origin main`)
   → Claude confirmed the push succeeded and moved on to Vercel.

9. **"should I have claude code push and commit? I have it open in VS Code"**
   → Claude clarified only a push was needed (commit was already made), and gave the exact command.

10. **"i fear you made a mistake and worked on in the wrong folder when all i have already done sits in /Users/omribitan/Documents/humor-project-week1 — that's the project root (a git repo on main)."**
    → Claude verified via `git remote -v` / `git log` that the bridge path and the real Mac path were the same repo, and showed the matching commit/branch/remote.

11. **"so what should i do next?"**
    → Claude restated the two remaining steps: push, then Vercel setup.

## What Claude did (implementation summary)

- Added `@supabase/supabase-js` and a `lib/supabaseClient.ts` client (env-based config, no hardcoded keys).
- Rewrote `app/page.tsx` as an async Server Component that fetches from the `captions` table and renders it as a list, sorted by votes.
- Verified the build/type-check/lint in an isolated sandbox (the device bridge's own network couldn't reach Google Fonts or Supabase directly, so full builds were validated there instead).
- Committed and pushed to `github.com/ob2380/humor-project-week1` (commit `28cd003`).
- Created a new Vercel project's env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) on the existing Vercel project (imported from GitHub in Assignment #1) and triggered a redeploy.
- Confirmed deployment protection was already off, and verified the live deployment renders the captions correctly.

---

# Prompt Chain — Week 3: Auth, Profiles, and a Protected Route

AI tool used: Claude (Sonnet 5), via Cowork with a live link to my Mac (device bridge).

## Prompts, in order

1. **(pasted the Week 3 assignment text: profiles table + auth.users trigger, Google OAuth, gated route, Profile section, avatar upload)** — "well this is the assignment for this week so lets work on that while making sure we follow the security requirment. save those security requirments to your brain because I want to be able to do them in Dadoo and Toto as well."
   → Claude saved the reusable security practices (`/auth/callback` redirect convention, `@supabase/ssr` wiring, profile-creation trigger, never storing binary image data in the DB, protected-route pattern) to memory for reuse on Dadoo and Toto, then built out the assignment.

## What Claude did (implementation summary)

- Installed `@supabase/ssr` alongside the existing `@supabase/supabase-js`.
- Checked `node_modules/next/dist/docs` first (per this repo's `AGENTS.md`) and found Next 16 renamed `middleware.js` to `proxy.js` — built the session-refresh/route-protection logic as `proxy.ts` + `lib/supabase/proxy.ts` accordingly, rather than the (now-deprecated) `middleware.ts` pattern most tutorials show.
- Added `lib/supabase/server.ts` (Server Component/Action client) and `lib/supabase/client.ts` (browser client).
- Added `lib/auth.ts`, a small Data Access Layer with a request-cached `getCurrentUser()`/`getCurrentProfile()`, so every protected page and Server Action re-checks auth itself instead of relying on `proxy.ts` alone (Next's own docs warn Proxy matcher changes can silently stop covering a Server Action).
- Added Google sign-in: `app/login/page.tsx` + `SignInButton.tsx` calling `supabase.auth.signInWithOAuth({ provider: "google" })`, redirecting to `/auth/callback` (no other path, per the assignment's tip).
- Added `app/auth/callback/route.ts` — exchanges the OAuth `code` for a session, then redirects to `next` (defaults to `/dashboard`).
- Wrote `supabase/migrations/0002_profiles.sql`: a `profiles` table (`first_name`, `last_name`, `avatar_url`, all nullable), a `handle_new_user()` trigger on `auth.users` that inserts a blank profile row on first sign-in, RLS left off per the assignment's note, and a public `avatars` Storage bucket with per-user-folder policies.
- Added `/dashboard` as the protected route: prompts the user to complete their profile if `first_name`/`last_name` are missing, otherwise shows a welcome message. Gated both by `proxy.ts` (redirect before render) and by an explicit `getCurrentUser()` check in the page itself.
- Added `/profile`: a form (first name, last name, photo upload) using a Server Action (`updateProfile`) built with `useActionState`. The photo is uploaded to the `avatars` Storage bucket and only its public URL is written to `profiles.avatar_url` — binary image data is never stored in Postgres directly, per the assignment's explicit instruction.
- Added `components/NavBar.tsx` (sign in / dashboard / profile / sign out links depending on auth state) and wired it into `app/layout.tsx`.
- Verified with `npx next build` and `npx eslint .`: both sandboxes available to Claude (the device bridge and an isolated container) block outbound requests to `fonts.googleapis.com`, so Google Fonts fails during `next build` in both — confirmed this is pre-existing (the unmodified Week 2 code fails the same way) and unrelated to this week's changes, then re-ran the build with the font import temporarily stripped in a disposable copy only, confirming a clean TypeScript compile, successful static generation, and zero ESLint errors. The real `app/layout.tsx` still imports the fonts normally; Vercel's build environment has normal internet access.
- Committed and pushed to `github.com/ob2380/humor-project-week1`.

## Still needed (manual steps, need Omri's own logins)

- Create a Google OAuth client (Google Cloud Console) and enable the Google provider in the Supabase Auth dashboard with those credentials.
- Run `supabase/migrations/0002_profiles.sql` in the Supabase SQL editor (creates the `profiles` table, trigger, and `avatars` bucket/policies).
- Confirm Vercel deployment protection is off and grab the commit-specific deployment URL for submission.
