import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Translate PDF — Free, No Limit | DocFlow AI",
  description: "Translate your PDF or DOCX files into any language instantly using AI. 100% free, no limits, no signup. Secure and fast AI PDF translator.",
  keywords: "translate pdf, free pdf translator, no limit, no signup, translate docx, ai pdf translation, translate document",
  alternates: {
    canonical: "/translate-pdf",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
