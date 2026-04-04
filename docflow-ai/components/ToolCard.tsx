import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
      className={cn(
        "group relative flex flex-col p-5 md:p-7 bg-card border border-divider rounded-2xl md:rounded-[2rem] transition-all duration-300 overflow-hidden",
        "hover:shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:hover:shadow-[0_2px_12px_rgba(255,255,255,0.03)]",
        "hover:-translate-y-1 hover:border-primary/20 animate-in fade-in slide-in-from-bottom-4 h-full"
      )}
    >
      {/* Radial dot background */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:8px_8px]" />
      </div>

      <div className={`flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-xl md:rounded-[1rem] bg-muted mb-4 md:mb-6 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm group-hover:bg-primary/10`}>
        <div className="scale-90 md:scale-95 transition-transform duration-300 group-hover:scale-110">{icon}</div>
      </div>
      
      <h3 className="text-lg md:text-xl font-black text-foreground mb-1.5 md:mb-2 group-hover:text-primary transition-colors tracking-tight relative z-10">
        {title}
      </h3>
      <p className="text-foreground/60 text-xs md:text-[13px] leading-tight md:leading-snug font-bold relative z-10">
        {description}
      </p>
      
      <div className="mt-auto pt-6 flex items-center text-primary font-black text-[10px] md:text-xs md:opacity-0 md:-translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all uppercase tracking-widest relative z-10">
        Try now 
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ml-1 md:ml-1.5 md:w-3 md:h-3"><path d="m9 18 6-6-6-6"/></svg>
      </div>

      {/* Gradient border effect */}
      <div className="absolute inset-0 -z-10 rounded-2xl md:rounded-[2rem] p-px bg-gradient-to-br from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Link>
  );
}
