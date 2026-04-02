import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat with PDF — Free, No Limit | DocFlow AI",
  description: "Ask questions and chat with your PDF documents using AI. Instantly get answers. 100% free, no limits, no signup. Fast and secure chat with PDF.",
  keywords: "chat with pdf, ai pdf chat, free chat with pdf, no limit, no signup, talk to pdf, ask pdf questions",
  alternates: {
    canonical: "/chat-with-pdf",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
