import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Study Tool — Exam Prep Generator | DocFlow AI",
  description: "Upload your study material and generate comprehensive notes, summaries, and exam prep questions instantly using AI. Tailored for university, competitive, and self-learning exams. Free, no signup.",
  keywords: "ai study tool, exam prep generator, ai notes generator, study material pdf, exam questions generator, free ai study helper, no signup",
  alternates: {
    canonical: "/study-tool",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
