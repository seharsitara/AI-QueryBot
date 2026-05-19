"use client";

// ------------------------------------------------------------
// Submit button that reflects the enclosing <form>'s pending
// state via useFormStatus(). Must be rendered inside the form
// whose server action it submits.
// ------------------------------------------------------------

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Please wait…
        </span>
      ) : (
        children
      )}
    </Button>
  );
}
