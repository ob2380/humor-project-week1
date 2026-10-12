import SignInButton from "./SignInButton";

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const next = typeof searchParams.next === "string" ? searchParams.next : undefined;
  const authError = searchParams.error === "auth_failed";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-6 py-10">
      <section className="window w-full">
        <h1 className="window-title bg-orange">Join the game</h1>
        <div className="flex flex-col gap-4 p-6 text-center">
          <p className="text-3xl" aria-hidden="true">
            🎮
          </p>
          <p className="text-sm font-bold text-ink/75">
            Sign in to vote on captions, earn XP and coins, level up, and make your own memes.
          </p>
          {authError && (
            <p role="alert" className="rounded-[10px] border-[3px] border-ink bg-[#FFD6D6] p-3 text-sm font-bold">
              Something went wrong signing you in. Please try again.
            </p>
          )}
          <SignInButton next={next} />
        </div>
      </section>
    </main>
  );
}
