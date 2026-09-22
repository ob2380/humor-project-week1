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
