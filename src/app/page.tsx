import { redirect } from "next/navigation";

// The dashboard is the real entry point. Anything hitting `/` is bounced
// to /chat (the middleware will then bounce unauthenticated users to /login).
export default function RootPage() {
  redirect("/chat");
}
