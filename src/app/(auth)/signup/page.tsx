import Link from "next/link";
import { Suspense } from "react";
import { AuthToasts } from "../auth-toasts";
import { SubmitButton } from "../submit-button";
import { AuthLabel, authInputClass } from "../auth-ui";
import { PasswordInput } from "../password-input";
import { signUp } from "../actions";

type SearchParams = Promise<{ error?: string }>;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 shadow-lg shadow-slate-200/50 sm:p-10">
      <Suspense fallback={null}>
        <AuthToasts />
      </Suspense>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[#0f2d52]">
          Create Account
        </h1>
        <p className="mt-2 text-sm text-slate-500">Start your free trial.</p>
      </div>

      <form action={signUp} className="space-y-5">
        <div className="space-y-2">
          <AuthLabel htmlFor="email">Email Address</AuthLabel>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="john@example.com"
            required
            className={authInputClass}
          />
        </div>

        <div className="space-y-2">
          <AuthLabel htmlFor="password">Password</AuthLabel>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            minLength={6}
            required
          />
          <p className="text-xs text-slate-500">At least 6 characters.</p>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <SubmitButton className="h-11 rounded-lg bg-[#0f2d52] text-base font-semibold text-white shadow-md shadow-[#0f2d52]/25 hover:bg-[#0c2442]">
          Create My Account
        </SubmitButton>
      </form>

      <p className="mt-8 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-[#1e4a7a] hover:underline"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
}
