import Link from "next/link";
import { ReactNode } from "react";

interface ToolCardProps {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
  color?: string;
}

export default function ToolCard({ title, description, href, icon, color = "bg-primary/10" }: ToolCardProps) {
  return (
    <Link 
      href={href}
      className="group relative flex flex-col p-5 md:p-10 bg-card border border-divider rounded-2xl md:rounded-[2.5rem] transition-all hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-2 hover:border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-700"
    >
      <div className={`flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-xl md:rounded-[1.25rem] bg-muted mb-4 md:mb-8 transition-transform group-hover:scale-110 group-hover:rotate-3 shadow-sm`}>
        <div className="scale-90 md:scale-100">{icon}</div>
      </div>
      <h3 className="text-lg md:text-2xl font-black text-foreground mb-1.5 md:mb-3 group-hover:text-primary transition-colors tracking-tight">
        {title}
      </h3>
      <p className="text-foreground/60 text-xs md:text-sm leading-tight md:leading-relaxed font-bold">
        {description}
      </p>
      
      <div className="mt-4 md:mt-8 flex items-center text-primary font-black text-xs md:text-sm md:opacity-0 md:-translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
        Try now 
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ml-1 md:ml-2 md:w-4 md:h-4"><path d="m9 18 6-6-6-6"/></svg>
      </div>
    </Link>

  );
}
