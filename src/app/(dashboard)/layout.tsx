// ------------------------------------------------------------
// Dashboard shell · wraps every signed-in route (/chat, /docs).
//
// Layout:
//   ┌────────┬─────────────────────────────┐
//   │        │                             │
//   │  side  │       page content          │
//   │  bar   │                             │
//   │        │                             │
//   └────────┴─────────────────────────────┘
//
// Sidebar is hidden on screens below `lg` to keep the small-screen
// view content-first. The middleware already gates these routes,
// requireUser() is kept as a second line of defence and to grab the
// email for the user dropdown.
// ------------------------------------------------------------

import { requireUser } from "@/lib/auth/get-user";
import { AppSidebar } from "@/components/sidebar/app-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex h-screen">
      <AppSidebar userEmail={user.email ?? ""} />
      {/* min-w-0 lets long chat content (e.g. wide code blocks) shrink
          inside the flex row instead of forcing horizontal scroll. */}
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
