"use client";

// ------------------------------------------------------------
// Submit button that reflects the enclosing <form>'s pending
// state via useFormStatus(). Must be rendered inside the form
// whose server action it submits.
// ------------------------------------------------------------

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SubmitButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className={cn("w-full", className)} disabled={pending}>
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
