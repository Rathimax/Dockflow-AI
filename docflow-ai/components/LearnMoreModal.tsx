"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Shield, Zap, Cpu, Infinity } from "lucide-react";

interface LearnMoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LearnMoreModal({ isOpen, onClose }: LearnMoreModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted) return null;

  const points = [
    {
      icon: <Zap className="text-amber-500" size={20} />,
      title: "Advanced PDF Suite",
      description: "A complete set of tools to merge, compress, rotate, and reorder your PDF pages with professional-grade precision."
    },
    {
      icon: <Cpu className="text-blue-500" size={20} />,
      title: "AI-Powered Intelligence",
      description: "Chat directly with your documents, generate instant summaries, and translate content across 10+ languages using advanced AI."
    },
    {
      icon: <Shield className="text-emerald-500" size={20} />,
      title: "Privacy First Architecture",
      description: "Your files never linger. We use an automated cleanup system that permanently deletes all processed data within 60 seconds."
    },
    {
      icon: <Infinity className="text-primary" size={20} />,
      title: "Zero Restrictions",
      description: "No signups, no email required, and absolutely no rate limits. Enjoy premium document tools without the premium price tag."
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-card border border-divider shadow-2xl rounded-[2.5rem] p-6 md:p-10 pointer-events-auto overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {/* Premium Decoration */}
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white font-black text-2xl shadow-xl shadow-primary/20">
                      D
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-foreground leading-none">
                        Welcome to <span className="text-primary">DocFlow AI</span>
                      </h2>
                      <p className="text-sm font-bold text-foreground/40 uppercase tracking-widest mt-1">Version 1.0 • Global Suite</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-3 hover:bg-muted rounded-2xl transition-all text-foreground/50 hover:text-foreground hover:scale-110 active:scale-90"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-primary/5 border border-primary/10 rounded-3xl">
                    <p className="text-foreground/80 font-bold leading-relaxed text-sm md:text-base">
                      DocFlow AI is an all-in-one document workspace designed to replace expensive subscriptions with a seamless, private, and AI-driven alternative.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    {points.map((point, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex gap-4 p-4 rounded-2xl border border-divider bg-card/50 hover:border-primary/20 transition-colors"
                      >
                        <div className="shrink-0 mt-1">{point.icon}</div>
                        <div>
                          <h4 className="font-black text-foreground tracking-tight mb-1">{point.title}</h4>
                          <p className="text-xs md:text-sm text-foreground/60 leading-snug font-medium">{point.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="mt-10 pt-8 border-t border-divider">
                  <button
                    onClick={onClose}
                    className="w-full py-5 bg-primary text-white font-black text-lg rounded-2xl shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    Start Using DocFlow
                    <CheckCircle2 size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
