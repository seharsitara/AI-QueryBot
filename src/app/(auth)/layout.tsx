import { AuthNav } from "./auth-nav";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AuthNav />
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
        {children}
      </main>
    </div>
  );
}
