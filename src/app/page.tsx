import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";
import { getUser } from "@/lib/auth/get-user";

export const metadata: Metadata = {
  title: "QueryBot — Smart Query Bot for Your Documents",
  description:
    "AI document Q&A for PDF, Word, and text files. Upload your knowledge base and get instant, cited answers.",
};

export default async function HomePage() {
  const user = await getUser();
  return <LandingPage user={user} />;
}
