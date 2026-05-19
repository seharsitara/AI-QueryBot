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
import { signIn } from "../actions";

// Server-rendered login page. Error and success notices flow
// through search params so the action can `redirect()` cleanly
// without needing client state.
type SearchParams = Promise<{ error?: string; signedUp?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, signedUp } = await searchParams;

  return (
    <Card className="w-full max-w-sm">
      <Suspense fallback={null}>
        <AuthToasts />
      </Suspense>
      <CardHeader>
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription>
          Use your email and password to access your documents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={signIn} className="space-y-4">
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
              autoComplete="current-password"
              required
            />
          </div>

          {signedUp && (
            <p className="text-sm text-muted-foreground">
              Account created. If email confirmation is enabled, check your
              inbox before signing in.
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <SubmitButton>Sign in</SubmitButton>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Don&apos;t have an account?&nbsp;
        <Link href="/signup" className="font-medium text-foreground underline">
          Create one
        </Link>
      </CardFooter>
    </Card>
  );
}
