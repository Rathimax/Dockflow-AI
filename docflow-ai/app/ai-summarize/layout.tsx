import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Summarize — Free, No Limit | DocFlow AI",
  description: "Extract key points from PDFs or DOCX files instantly using AI. 100% free, no limits, no signup. Secure AI document summarization tools.",
  keywords: "ai summarize pdf, summarize docx, free ai pdf summarizer, no limit, no signup, extract points from pdf",
  alternates: {
    canonical: "/ai-summarize",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
