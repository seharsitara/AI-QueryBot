"use client";

// ------------------------------------------------------------
// Fires a toast based on the auth redirect search params
// (?error=… / ?signedUp=1) that the server actions set. Renders
// nothing. Wrap usages in <Suspense> — useSearchParams requires
// a boundary.
// ------------------------------------------------------------

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function AuthToasts() {
  const params = useSearchParams();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    const error = params.get("error");
    const signedUp = params.get("signedUp");

    if (error) {
      toast.error(error);
      fired.current = true;
    } else if (signedUp) {
      toast.success("Account created", {
        description:
          "If email confirmation is enabled, check your inbox before signing in.",
      });
      fired.current = true;
    }
  }, [params]);

  return null;
}
