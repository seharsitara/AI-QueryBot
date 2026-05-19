import Link from "next/link";
import { Suspense } from "react";
import { AuthToasts } from "../auth-toasts";
import { SubmitButton } from "../submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signUp } from "../actions";

// Server-rendered signup page. Same pattern as /login — errors
// arrive via search params from the server action's `redirect()`.
type SearchParams = Promise<{ error?: string }>;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;

  return (
    <Card className="w-full max-w-sm">
      <Suspense fallback={null}>
        <AuthToasts />
      </Suspense>
      <CardHeader>
        <CardTitle className="text-2xl">Create account</CardTitle>
        <CardDescription>
          Sign up with email + password. No verification step in local dev.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
            />
            <p className="text-xs text-muted-foreground">
              At least 6 characters.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <SubmitButton>Create account</SubmitButton>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Already have an account?&nbsp;
        <Link href="/login" className="font-medium text-foreground underline">
          Sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
