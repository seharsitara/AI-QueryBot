import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// `cn` merges Tailwind class lists and resolves conflicts (last-write-wins).
// Standard shadcn helper — used by every UI primitive we add later.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
