import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Code2,
  FileText,
  GraduationCap,
  MessageSquare,
  Microscope,
  Scale,
  Search,
  Shield,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { LandingHeader } from "./landing-header";
import { HeroVisual } from "./hero-visual";
import { WorkflowVisual } from "./workflow-visual";

const navy = "text-[#0f2d52]";
const navyBtn =
  "inline-flex items-center justify-center rounded-lg bg-[#0f2d52] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[#0f2d52]/20 transition-colors hover:bg-[#0c2442]";

const features = [
  {
    icon: FileText,
    title: "Document Intelligence",
    description:
      "Extract structured insights from PDFs, Word docs, and plain text with high fidelity.",
    link: "See extraction quality",
  },
  {
    icon: Search,
    title: "Smart Search (RAG)",
    description:
      "Semantic retrieval finds the most relevant passages, not just keyword matches.",
    link: "Explore RAG pipeline",
  },
  {
    icon: MessageSquare,
    title: "Chat with Documents",
    description:
      "Ask questions in natural language and get answers backed by source citations.",
    link: "Try the chat interface",
  },
  {
    icon: Shield,
    title: "Fast and Secure AI",
    description:
      "Enterprise-grade security with encrypted storage and fast response times.",
    link: "View security details",
  },
];

const steps = [
  {
    n: 1,
    title: "Upload",
    description: "Drag and drop PDFs, Docs, or text files securely.",
  },
  {
    n: 2,
    title: "Chunking and Embeddings",
    description:
      "AI parses content at paragraph level for semantic retrieval.",
  },
  {
    n: 3,
    title: "AI Answer",
    description:
      "Ask naturally and get instant answers backed by sources.",
  },
];

export function LandingPage({ user }: { user: User | null }) {
  const dashboardHref = user ? "/docs" : "/login";

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <LandingHeader user={user} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-50/50 via-transparent to-transparent" />
        <div className="relative mx-auto grid max-w-[90rem] items-center gap-12 px-3 py-16 sm:px-4 lg:px-5 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-[#0f2d52]">
              Powered by GPT-4 and Claude 3
            </span>
            <h1
              className={`mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl ${navy}`}
            >
              Smart Query Bot for Your Documents
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600">
              AI document Q and A for PDF, Word, and text files. Upload your
              knowledge base and start getting instant, cited answers.
            </p>
            <Link href={dashboardHref} className={`mt-8 ${navyBtn}`}>
              Open Dashboard
            </Link>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-[90rem] px-3 py-20 sm:px-4 lg:px-5">
        <div className="text-center">
          <h2 className={`text-3xl font-bold tracking-tight sm:text-4xl ${navy}`}>
            Precision Intelligence
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-500">
            Everything you need to turn static files into a searchable knowledge
            base.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description, link }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <Icon className="h-5 w-5 text-[#0f2d52]" />
              </div>
              <h3 className={`mt-4 font-semibold ${navy}`}>{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#1e4a7a]">
                {link}
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section className="mx-auto max-w-[90rem] px-3 py-20 sm:px-4 lg:px-5">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className={`text-3xl font-bold tracking-tight sm:text-4xl ${navy}`}>
              Simplify Your Knowledge Flow
            </h2>
            <div className="mt-10 space-y-4">
              {steps.map(({ n, title, description }) => (
                <div
                  key={n}
                  className="flex gap-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0f2d52] text-sm font-bold text-white">
                    {n}
                  </div>
                  <div>
                    <h3 className={`font-semibold ${navy}`}>{title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <WorkflowVisual />
        </div>
      </section>

      {/* Audience */}
      <section className="mx-auto max-w-[90rem] px-3 py-20 sm:px-4 lg:px-5">
        <div className="text-center">
          <h2 className={`text-3xl font-bold tracking-tight sm:text-4xl ${navy}`}>
            Tailored for Every Workflow
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-500">
            From legal teams to students, QueryBot adapts to how you work.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f2d52] to-[#1a3d6b] p-8 text-white shadow-xl">
            <span className="inline-block rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide">
              Most Popular
            </span>
            <Briefcase className="mt-6 h-8 w-8 text-white/90" />
            <h3 className="mt-4 text-xl font-bold">Business Professionals</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-blue-100">
              Analyze contracts, reports, and internal docs in seconds instead of
              hours.
            </p>
            <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-white">
              Learn More
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="rounded-2xl bg-[#0a1628] p-8 text-white shadow-xl">
            <Scale className="h-8 w-8 text-white/90" />
            <h3 className="mt-4 text-xl font-bold">Legal Teams</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-300">
              Review case files and precedents with cited, traceable AI answers.
            </p>
            <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-white">
              Case Studies
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Microscope,
              title: "Researchers",
              description:
                "Synthesize papers and datasets with source-backed summaries.",
            },
            {
              icon: GraduationCap,
              title: "Students",
              description:
                "Study faster by chatting with textbooks and lecture notes.",
            },
            {
              icon: Code2,
              title: "Developers",
              description:
                "Query technical docs and API references without context switching.",
            },
          ].map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
            >
              <Icon className="h-6 w-6 text-[#0f2d52]" />
              <h3 className={`mt-4 font-semibold ${navy}`}>{title}</h3>
              <p className="mt-2 text-sm text-slate-500">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[90rem] px-3 pb-20 sm:px-4 lg:px-5">
        <div className="rounded-3xl bg-gradient-to-br from-[#0f2d52] to-[#1a3d6b] px-8 py-16 text-center shadow-xl shadow-[#0f2d52]/25 sm:px-16">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Start using AI to explore your documents
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-blue-100">
            Join thousands of professionals saving hours of reading time every
            week.
          </p>
          <Link
            href={dashboardHref}
            className="mt-8 inline-flex items-center justify-center rounded-lg bg-white px-8 py-3 text-sm font-semibold text-[#0f2d52] shadow-md transition-colors hover:bg-slate-50"
          >
            Go to Dashboard
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-[90rem] gap-10 px-3 py-14 sm:grid-cols-2 sm:px-4 lg:grid-cols-4 lg:px-5">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f2d52]">
                <Search className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-[#0f2d52]">QueryBot</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              AI-powered document intelligence for teams who need answers fast.
            </p>
          </div>

          {[
            {
              title: "Company",
              links: ["About Us", "Careers", "Press"],
            },
            {
              title: "Product",
              links: ["Pricing", "API", "Security"],
            },
            {
              title: "Legal",
              links: ["Privacy Policy", "Terms of Service", "Cookie Settings"],
            },
          ].map(({ title, links }) => (
            <div key={title}>
              <h4 className={`text-sm font-semibold ${navy}`}>{title}</h4>
              <ul className="mt-4 space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <span className="text-sm text-slate-500">{link}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-200 py-6 text-center text-sm text-slate-400">
          © 2024 QueryBot AI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
