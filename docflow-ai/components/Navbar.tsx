"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import ThemeToggle from "./ThemeToggle";
import AboutModal from "./AboutModal";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const { theme } = useTheme();

  return (
    <>
      <nav className={cn(
        "sticky top-0 z-50 w-full border-b transition-all duration-300",
      isOpen 
        ? "bg-background border-divider" 
        : "bg-background/80 backdrop-blur-md border-divider"
    )}>
      <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-black text-xl shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
            D
          </div>
          <span className="text-2xl font-black tracking-tighter text-foreground leading-none">
            DocFlow <span className="text-primary">AI</span>
          </span>
        </Link>
        
        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400">
          <Link href="/" className="px-4 py-2 rounded-xl hover:bg-muted transition-all text-foreground/70 dark:text-gray-400 hover:text-primary">Home</Link>
          <Link href="/#tools" className="px-4 py-2 rounded-xl hover:bg-muted transition-all text-foreground/70 dark:text-gray-400 hover:text-primary">All Tools</Link>
          
          <div className="relative group">
            <button className="flex items-center gap-1 px-4 py-2 rounded-xl hover:bg-muted transition-all text-foreground/70 dark:text-gray-400 hover:text-primary cursor-pointer">
              AI Features
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div className="absolute top-full left-0 w-56 bg-card border border-divider shadow-2xl rounded-2xl py-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all translate-y-4 group-hover:translate-y-1">
              <Link onClick={() => setIsOpen(false)} href="/ai-summarize" className="block px-6 py-2.5 text-sm font-bold text-foreground hover:bg-muted transition-colors">AI Summarizer</Link>
              <Link onClick={() => setIsOpen(false)} href="/chat-with-pdf" className="block px-6 py-2.5 text-sm font-bold text-foreground hover:bg-muted transition-colors">Chat with PDF</Link>
              <Link onClick={() => setIsOpen(false)} href="/translate-pdf" className="block px-6 py-2.5 text-sm font-bold text-foreground hover:bg-muted transition-colors">Translate PDF</Link>
            </div>
          </div>
          
          <button 
            onClick={() => setIsAboutOpen(true)} 
            className="px-4 py-2 rounded-xl hover:bg-muted transition-all text-foreground/70 dark:text-gray-400 hover:text-primary cursor-pointer"
          >
            About
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <Link 
            href="/#tools"
            className="hidden sm:inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-black text-white shadow-xl shadow-primary/20 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all"
          >
            Get Started
          </Link>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="p-3 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-muted rounded-2xl transition-all"
              aria-label="Toggle menu"
            >
              {isOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={cn(
        "fixed inset-0 top-20 z-40 bg-background lg:hidden transition-all duration-300 ease-in-out border-t border-divider",
        isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
      )}>

        <div className="flex flex-col p-8 gap-8">
          <div className="flex flex-col gap-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Navigation</p>
            <Link onClick={() => setIsOpen(false)} href="/" className="text-3xl font-black text-foreground hover:text-primary transition-colors tracking-tighter">Home</Link>
            <Link onClick={() => setIsOpen(false)} href="/#tools" className="text-3xl font-black text-foreground hover:text-primary transition-colors tracking-tighter">All Tools</Link>
            <button 
              onClick={() => {
                setIsOpen(false);
                setIsAboutOpen(true);
              }} 
              className="text-3xl font-black text-left text-foreground hover:text-primary transition-colors tracking-tighter"
            >
              About
            </button>
          </div>
          
          <div className="flex flex-col gap-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">AI Powered Features</p>
            <Link onClick={() => setIsOpen(false)} href="/ai-summarize" className="text-xl font-bold text-gray-600 dark:text-gray-400 hover:text-primary transition-colors tracking-tight">AI Summarizer</Link>
            <Link onClick={() => setIsOpen(false)} href="/chat-with-pdf" className="text-xl font-bold text-gray-600 dark:text-gray-400 hover:text-primary transition-colors tracking-tight">Chat with PDF</Link>
            <Link onClick={() => setIsOpen(false)} href="/translate-pdf" className="text-xl font-bold text-gray-600 dark:text-gray-400 hover:text-primary transition-colors tracking-tight">Translate PDF</Link>
          </div>

          <div className="pt-8 border-t border-gray-100 dark:border-divider">
            <Link 
              href="/#tools"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center justify-center rounded-[2rem] bg-primary py-6 text-xl font-black text-white shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Try DocFlow Now
            </Link>
          </div>
        </div>
      </div>
      </nav>
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </>
  );
}

