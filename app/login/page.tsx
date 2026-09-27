import SignInButton from "./SignInButton";

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const next = typeof searchParams.next === "string" ? searchParams.next : undefined;
  const authError = searchParams.error === "auth_failed";

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-gray-500">
          Sign in with Google to continue.
        </p>
        {authError && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            Something went wrong signing you in. Please try again.
          </p>
        )}
        <SignInButton next={next} />
      </div>
    </main>
  );
}
