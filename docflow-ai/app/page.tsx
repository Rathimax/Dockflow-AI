import ToolCard from "@/components/ToolCard";
import Link from "next/link";
import { BackgroundPaths } from "@/components/ui/background-paths";

const toolCategories = [
  {
    name: "Convert & Create",
    tools: [
      {
        title: "PDF to Word",
        description: "Convert PDFs to editable Microsoft Word files.",
        href: "/pdf-to-word",
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18h.01"/><path d="M10 13c1 0 2 1 2 2v2"/><path d="M14 13c-1 0-2 1-2 2v2"/></svg>,
        color: "bg-blue-50"
      },
      {
        title: "Word to PDF",
        description: "Create professional PDF files from Word documents.",
        href: "/word-to-pdf",
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-600"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>,
        color: "bg-sky-50"
      },
      {
        title: "Image to PDF",
        description: "Convert JPG, PNG, and TIFF images to PDF documents.",
        href: "/image-to-pdf",
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
        color: "bg-purple-50"
      },
      {
        title: "Edit PDF",
        description: "Add text, draw, highlight, and visually edit your PDF.",
        href: "/edit-pdf",
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 22v-6"/><path d="M9 19h6"/></svg>,
        color: "bg-emerald-50"
      }
    ]
  },
  {
    name: "Edit & Optimize",
    tools: [
      {
        title: "Compress PDF",
        description: "Reduce file size without losing quality.",
        href: "/compress-pdf",
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 12v6"/><path d="M9 15l3-3 3 3"/></svg>,
        color: "bg-green-50"
      },
      {
        title: "Merge PDF",
        description: "Combine multiple PDF files into one.",
        href: "/merge-pdf",
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6"/><path d="M12 12v6"/></svg>,
        color: "bg-orange-50"
      },
      {
        title: "PDF to Image",
        description: "Export high-quality images from your PDF pages.",
        href: "/pdf-to-image",
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-600"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><circle cx="10" cy="13" r="2"/><path d="m20 17-1.086-1.086a2 2 0 0 0-2.828 0L12 20"/></svg>,
        color: "bg-rose-50"
      }
    ]
  },
  {
    name: "AI-Powered Intelligence",
    tools: [
      {
        title: "AI Summarize",
        description: "Get key insights from any document with AI.",
        href: "/ai-summarize",
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600"><path d="M21 15V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"/><path d="M7 8h10"/><path d="M7 12h10"/><path d="M7 16h6"/><path d="M15 19l2 2 4-4"/></svg>,
        color: "bg-yellow-50"
      },
      {
        title: "Chat with PDF",
        description: "Ask questions and chat with your PDF documents.",
        href: "/chat-with-pdf",
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-600"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 7v5"/><path d="M12 16h.01"/></svg>,
        color: "bg-cyan-50"
      },
      {
        title: "Translate PDF",
        description: "Instantly translate documents into over 10 languages.",
        href: "/translate-pdf",
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
        color: "bg-emerald-50"
      }
    ]
  }
];

const features = [
  {
    title: "No Rate Limits",
    description: "Convert as many documents as you want without any restrictions.",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="m17 7-5-5-5 5"/><path d="m17 17-5 5-5-5"/></svg>
  },
  {
    title: "No Signup Required",
    description: "Start using all tools immediately without creating an account.",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="16" x2="22" y1="11" y2="11"/></svg>
  },
  {
    title: "Files Deleted in 60s",
    description: "Your privacy is our priority. All files are permanently deleted within 1 minute.",
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  }
];

export default function Home() {
  return (
    <div className="font-sans transition-colors duration-300 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <BackgroundPaths title="">
          <div className="pt-16 pb-24 md:pt-24 md:pb-40 relative z-10 container mx-auto px-6 md:px-4 max-w-6xl text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 text-primary dark:text-primary text-[10px] md:text-sm font-black mb-6 md:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              ✨ Your Supercharged AI Document Workspace
            </div>
            <h1 className="text-[2.25rem] sm:text-6xl md:text-8xl font-black mb-6 md:mb-8 tracking-tighter leading-[0.95] text-foreground dark:text-white animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              Document Intelligence <br className="hidden md:block" />
              <span className="text-primary tracking-tight">Evolved.</span>
            </h1>
            <p className="text-base md:text-2xl text-foreground/40 dark:text-foreground/60 font-bold mb-8 md:mb-12 max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-12 duration-700 delay-200">
              The most powerful suite for PDF and document tools. <br className="hidden md:block" />
              No signups, no limits, and absolute privacy.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-16 duration-700 delay-300">
                <Link 
                href="#tools"
                className="w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 bg-primary text-white rounded-xl md:rounded-2xl font-black text-base md:text-lg transition-all hover:scale-105 hover:shadow-2xl hover:shadow-primary/30 active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-primary/20"
              >
                Browse All Tools
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </Link>
              <Link 
                href="/about"
                className="w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 bg-muted text-foreground border border-divider rounded-xl md:rounded-2xl font-black text-base md:text-lg transition-all hover:bg-card hover:border-primary/20 hover:scale-105 active:scale-95 flex items-center justify-center"
              >
                Learn More
              </Link>
            </div>
          </div>
        </BackgroundPaths>
      </section>

      {/* Tools Section */}
      <section id="tools" className="py-20 md:py-32 bg-background/50 dark:bg-muted/30 border-y border-divider relative">
        <div className="container mx-auto px-6 md:px-4 max-w-6xl">
          {toolCategories.map((category, catIndex) => (
            <div key={catIndex} className={catIndex > 0 ? "mt-20 md:mt-32" : ""}>
              <div className="mb-10 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl md:text-4xl font-black tracking-tight text-foreground dark:text-white animate-in fade-in slide-in-from-bottom-4 duration-700">{category.name}</h2>
                  <div className="h-1 w-12 bg-primary mt-3 rounded-full animate-in fade-in delay-200"></div>
                </div>
                <p className="text-foreground/40 dark:text-foreground/60 font-bold uppercase tracking-widest text-[10px] md:text-sm">
                  {category.tools.length} TOOLS AVAILABLE
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                {category.tools.map((tool, index) => (
                  <ToolCard 
                    key={index}
                    title={tool.title}
                    description={tool.description}
                    href={tool.href}
                    icon={tool.icon}
                    color={tool.color}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why DocFlow AI? Section */}
      <section className="py-20 md:py-32 bg-background relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10"></div>
        <div className="container mx-auto px-6 md:px-4 max-w-6xl">
          <div className="mb-16 md:mb-20 text-center">
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight text-foreground animate-in fade-in slide-in-from-bottom-4 duration-1000">Why DocFlow AI?</h2>
            <p className="text-foreground/40 font-bold text-sm md:text-xl uppercase tracking-widest animate-in fade-in delay-300">The world's first truly free document suite.</p>
          </div>
          
          <div className="flex flex-col md:grid md:grid-cols-3 gap-4 md:gap-12">
            {features.map((feature, i) => (
              <div key={i} className="flex flex-row md:flex-col items-start md:items-center text-left md:text-center p-5 md:p-12 bg-card border border-divider rounded-2xl md:rounded-[3rem] transition-all hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-2 hover:border-primary/20 group gap-5 md:gap-0 animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${(i + 1) * 150}ms` }}>
                <div className="h-14 w-14 md:h-20 md:w-20 shrink-0 flex items-center justify-center bg-muted border-2 border-divider rounded-2xl md:rounded-[1.5rem] text-primary md:mb-8 shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-6">
                  <div className="scale-75 md:scale-100">{feature.icon}</div>
                </div>
                <div>
                  <h3 className="text-lg md:text-2xl font-black mb-1 md:mb-4 tracking-tight text-foreground">{feature.title}</h3>
                  <p className="text-foreground/60 leading-tight md:leading-relaxed font-bold text-xs md:text-lg">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 md:py-32 bg-background border-y border-divider text-foreground overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--color-primary),_transparent_70%)] opacity-20 dark:opacity-10"></div>
        <div className="container mx-auto px-6 md:px-4 max-w-4xl text-center relative z-10">
          <h2 className="text-2xl md:text-6xl font-black mb-6 md:mb-10 leading-tight tracking-tighter animate-in fade-in slide-in-from-bottom-4 duration-500">
            Ready to supercharge <br /> your documents?
          </h2>
          <Link 
            href="#tools"
            className="inline-flex items-center gap-3 px-8 md:px-12 py-4 md:py-6 bg-primary text-white rounded-2xl font-black text-base md:text-xl transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-primary/20 animate-in fade-in slide-in-from-bottom-8 duration-500 delay-150"
          >
            Get Started Now
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="md:w-6 md:h-6"><path d="m9 18 6-6-6-6"/></svg>
          </Link>
        </div>
      </section>

    </div>
  );
}
