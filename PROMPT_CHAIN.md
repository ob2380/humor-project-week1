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

# Prompt Chain — Week 3: Auth, Profiles, and Google Sign-In

AI tool used: Claude (Sonnet 5), via Cowork with a live link to my Mac (device bridge) and browser automation.

## Prompts, in order

1. **(Pasted the full Week 3 assignment text)** "well this is the assignment for this week so lets work on that while making sure we follow the security requirment. save those security requirments to your brain because I want to be able to do them in Dadoo and Toto as well."
   → Claude implemented the full auth stack: `@supabase/ssr` browser/server clients, `proxy.ts` (Next 16's renamed `middleware.ts`) to refresh sessions and gate `/dashboard` and `/profile`, a `profiles` table + `auth.users` trigger migration, Google OAuth sign-in via `/auth/callback`, a profile-completion check, and a Profile page for editing name + uploading an avatar to Supabase Storage (never storing binary image data in Postgres).

2. **(Screenshot of a VS Code terminal showing `git push origin main` succeeding)** "This is what i got form Claude code in VS code"
   → Claude confirmed the push succeeded (commit `06ba781`).

3. **"Tell me, why do you keep all of the project only under Week 1? ... What should I submit? we dont need to work in Claude code?"** (with a pasted OAuth/OIDC conference transcript for context)
   → Claude explained the repo is reused across weeks per the assignment, listed exactly what to submit, and confirmed this session already satisfies the Claude-CLI requirement.

4. **"ok I confirmed.. what now?"**
   → (After Claude paused to ask permission before checking Google's "I agree to the API Services User Data Policy" box during OAuth client setup) Claude proceeded to finish creating the Google OAuth client and wire it into Supabase.

5. **(Screenshot of a browser error: `localhost:3000/?code=...` and a `lightningcss.darwin-arm64.node` crash)** "I got this when I tried to log in with google"
   → Claude diagnosed two separate bugs: (a) `node_modules` on my Mac had Linux-platform native binaries because earlier `npm install` calls ran through the device-bridge shell, which executes in an isolated Linux VM rather than my actual Mac; and (b) Supabase's Redirect URLs allowlist was completely empty, so Supabase silently redirected to the Site URL (`/`) instead of `/auth/callback`. Claude gave me exact `rm -rf node_modules package-lock.json && npm install` commands to run myself in a real Mac terminal, and fixed the Supabase Redirect URLs directly via the dashboard.

6. **"ok it worked. what now?"**
   → Claude gave a checklist to verify the full flow end-to-end before submitting.

7. **(Screenshot of a new error: "Body exceeded 1 MB limit" on the Server Action)** "this is what I got now. What can I do?"
   → Claude found that Next.js caps Server Action request bodies at 1MB by default, while the profile action already validated avatars up to 5MB. Fixed by adding `experimental.serverActions.bodySizeLimit: "6mb"` to `next.config.ts`.

8. **(Screenshots showing the profile form saving successfully, and the terminal committing/pushing the fix)** "This is great- what now?"
   → Claude confirmed the push (commit `208af38`) deployed cleanly to Vercel, verified deployment protection was off, and clicked through the full Google sign-in → dashboard → profile → avatar flow live on the production URL to confirm it works end-to-end.

## What Claude did (implementation summary)

- Added `@supabase/ssr` alongside the existing `@supabase/supabase-js`, with separate browser (`lib/supabase/client.ts`) and server (`lib/supabase/server.ts`) clients.
- Added `proxy.ts` (Next 16's replacement for `middleware.ts`) calling `supabase.auth.getUser()` to refresh sessions and redirect signed-out visitors away from `/dashboard` and `/profile`.
- Added `app/auth/callback/route.ts` to exchange the OAuth `code` for a session (registered redirect URI: exactly `/auth/callback`, no extra path segments).
- Added Google sign-in (`app/login/`) via `supabase.auth.signInWithOAuth`.
- Added `lib/auth.ts`, a small Data Access Layer (`getCurrentUser`, `getCurrentProfile`) so Server Actions independently re-authenticate rather than relying on proxy/middleware coverage.
- Added `supabase/migrations/0002_profiles.sql`: a `profiles` table (nullable `first_name`/`last_name`/`avatar_url`), an `after insert on auth.users` trigger to auto-create a profile row on first sign-in, RLS left off per the assignment's own instruction, and a public `avatars` Storage bucket with per-user-folder policies.
- Added `app/profile/` (page, form, and a `updateProfile` Server Action) to edit name and upload a photo — the photo is uploaded to Supabase Storage and only its URL is written to the `profiles` row; the binary is never stored in Postgres.
- Added `app/dashboard/` as a protected route showing a profile-completion prompt when name fields are empty.
- Fixed two real-world bugs found only after deploying: a stale local Turbopack cache masking a native-binary platform mismatch (`lightningcss-darwin-arm64`), and Next's default 1MB Server Action body cap rejecting profile-photo uploads.
- Verified end-to-end on both localhost and the live Vercel production deployment: Google sign-in → `/dashboard` → `/profile` → name + avatar save, all confirmed via the Table Editor and a live browser click-through.

---

# Prompt Chain — Week 5: Get Feedback and Iterate

AI tool used: Claude (Sonnet 5), via Cowork with a live link to my Mac (device bridge) and the built-in browser pane for live testing. The meme feature itself uses Google Gemini (free tier).

## Prompts, in order

1. **"ok how do I know where we sit at this project? ... also the UI/UX is responding super slow. we need to fix that"**
   → Claude checked git/tsc/eslint status and started measuring the slowness.
2. **"switching between trending and new jokes takes forever as well as voting."** / **"non of what you said actually worked. fix the speed!"**
   → Votes and tab switching became instant: optimistic client state with rollback on failure, no page revalidation after a vote, client-side tab switching, and `auth.getClaims()` instead of a network `getUser()` call.
3. **"can we just open it in the cowork session here and you can test it yourself?"** / **"try to test shifting between trending, new, etc. and voting... then test the whole website"**
   → Claude measured the live site in the browser pane (tabs 1-5 ms, vote UI 2 ms, save ~300 ms). I had been testing an old immutable deployment URL; the fix was to use the production domain.
4. **"Lets work on the API now. should we connect it to claude? My instructor mentioned that we can give different models work on different parts of the meme origination"** → **"no, I need a free option. I know everyone is using Gemini"**
   → Chose a 3-step Gemini chain (look at the photo, write captions, judge and pick the best three) on the free tier. Prompts live in `lib/captionPrompts.ts`; the API key is a server-only env var.
5. **"start building. will deal w assignment 5 later"** / **"I have the API key. will that line of code show up in my VS studio?"**
   → Claude built the server actions and meme maker; I created the key myself and added it to `.env.local` and Vercel.
6. **"I need an option of uploading a picture or text and Gemini will help with the rest."**
   → Added "idea mode": type a situation and Gemini writes captions and picks an emoji and color theme (the free tier can't generate images).
7. **(screenshot of "The caption service is busy") "...Also, the UI is not clear. I can't tell when AI is doing everything and when I am doing the work myself. Let's separate AI Mode and 'I Feel Creative Enough'"**
   → Added automatic model fallback on quota/overload errors (the cause of the busy error) and split the page into AI Mode (Gemini writes) and "I Feel Creative Enough" (fully manual). Confirmed working live.
8. **(Week 5 assignment screenshots) "make sure you cover everything on assignment 5"**
   → Audited the rubric: confirmed public access and that deployment protection is off, restyled login, dashboard and profile to match the rest of the app, and reviewed the code paths for route protection and voting (logged-in vs logged-out).

9. **(pasted instructor feedback from the Feedback Group meeting) "move the daily quests, the weekly rankings, and the XP bar to the profile... center the voting content... also the ability to download, send to a meme page, or delete the meme once a user creates it. Please take care of this."**
   → Claude moved the XP/level/coins bar off the nav, put Daily Quests and Weekly Rankings on the dashboard and level/rewards on the profile (judgment call: the dashboard was the plainest page, so it became the game hub), and centered the feed. Added Download and Delete (with confirmation) to the meme maker. Found that the database now has RLS on and only admins can add captions or upload to the media bucket, so "send to meme page" for all users was held for approval instead of changing any policies.

10. **"2. all users" / "Do whatever we need in order for users to be able to do it - do whatever we need with the RLS."**
    → Explicitly allowed new database policies for this feature. Claude added a `community_posts` approval queue (RLS: users insert/see/withdraw only their own pending posts; only admins can approve or reject) and a `community-memes` storage bucket (users can only upload into their own folder). Existing policies were left unchanged. Approved posts are copied into `images` and `captions` by an admin action, so they show up in New, Trending/Top (as people vote) and a new Community tab. Added "Post to meme page" / "Post caption only" in the meme maker, "Your posts" on the dashboard, and an admin-only `/admin/review` page. Migration: `supabase/migrations/0004_community_posts.sql`.

## What Claude did (implementation summary)

- Performance: optimistic voting and tab switching, `getClaims()`, removed post-vote revalidation.
- Meme maker (`/create`, auth-protected): `lib/captionApi.ts` (only file that talks to Gemini), `lib/captionPrompts.ts`, `lib/captionParse.ts`, `app/create/actions.ts` (each action re-authenticates and rate-limits), `components/MemeMaker.tsx` (canvas rendering, download as PNG).
- Safety: the photo and any text in it are treated as untrusted; magic-byte checks on uploads; 4 MB cap; the API key is never sent to the browser or logged.
- UI consistency: login, dashboard and profile now use the same game-style components as the feed.
- No RLS policies or storage settings were changed.
