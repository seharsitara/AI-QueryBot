import Link from "next/link";
import { Suspense } from "react";
import { AuthToasts } from "../auth-toasts";
import { SubmitButton } from "../submit-button";
import { AuthLabel, authInputClass } from "../auth-ui";
import { PasswordInput } from "../password-input";
import { signIn } from "../actions";

type SearchParams = Promise<{ error?: string; signedUp?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, signedUp } = await searchParams;

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg shadow-slate-200/50 sm:p-10">
      <Suspense fallback={null}>
        <AuthToasts />
      </Suspense>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-[#0f2d52]">
          Login
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Enter your credentials to continue
        </p>
      </div>

      <form action={signIn} className="space-y-5">
        <div className="space-y-2">
          <AuthLabel htmlFor="email">Email Address</AuthLabel>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            required
            className={authInputClass}
          />
        </div>

        <div className="space-y-2">
          <AuthLabel htmlFor="password">Password</AuthLabel>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
          />
        </div>

        {signedUp && (
          <p className="text-sm text-slate-500">
            Account created. If email confirmation is enabled, check your inbox
            before signing in.
          </p>
        )}
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <SubmitButton className="h-11 rounded-lg bg-[#0f2d52] text-base font-semibold text-white shadow-md shadow-[#0f2d52]/25 hover:bg-[#0c2442]">
          Sign In
        </SubmitButton>
      </form>

      <p className="mt-8 text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-[#1e4a7a] hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
