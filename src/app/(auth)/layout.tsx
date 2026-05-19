// Centered, full-bleed layout for /login and /signup pages.
// Kept deliberately minimal — the dashboard layout (sidebar etc.)
// lives under (dashboard)/ and never wraps these screens.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      {children}
    </main>
  );
}
