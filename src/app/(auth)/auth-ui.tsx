import { cn } from "@/lib/utils";

export const navy = "text-[#0f2d52]";
export const navyBg = "bg-[#0f2d52] hover:bg-[#0c2442]";

export const authInputClass =
  "flex h-11 w-full rounded-lg border border-transparent bg-[#f1f5f9] px-3 text-sm text-[#0f2d52] placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2d52]/20 disabled:cursor-not-allowed disabled:opacity-50";

export function AuthLabel({
  htmlFor,
  children,
  className,
}: {
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("text-sm font-semibold text-[#0f2d52]", className)}
    >
      {children}
    </label>
  );
}
