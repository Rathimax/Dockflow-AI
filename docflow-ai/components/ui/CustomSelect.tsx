"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export default function CustomSelect({
  options,
  value,
  onChange,
  label,
  placeholder = "Select an option",
  className,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative w-full group", className, isOpen && "z-50")} ref={containerRef}>
      {label && (
        <label className="block text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-foreground/40 mb-3 ml-1 group-focus-within:text-primary transition-colors">
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between bg-muted border-2 border-transparent text-foreground rounded-2xl px-6 py-4 md:py-5 font-bold outline-none transition-all cursor-pointer shadow-sm text-left",
          isOpen ? "border-primary/20 bg-background ring-4 ring-primary/5" : "hover:bg-muted/80"
        )}
      >
        <span className={cn(!value && "text-foreground/40")}>{value || placeholder}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
        >
          <ChevronDown className="w-5 h-5 text-foreground/40" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-[100] w-full mt-3 bg-card border border-divider rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            <div className="max-h-[300px] overflow-y-auto py-2">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-6 py-3.5 text-sm md:text-base font-bold transition-all text-left",
                    value === option 
                      ? "bg-primary/10 text-primary" 
                      : "text-foreground/60 hover:bg-muted hover:text-foreground"
                  )}
                >
                  {option}
                  {value === option && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
