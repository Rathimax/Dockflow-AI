"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
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
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-xl"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-card border border-divider shadow-2xl rounded-3xl p-8 pointer-events-auto overflow-hidden"
            >
              {/* Premium Background Decoration */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-black text-xl shadow-lg shadow-primary/20">
                      D
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-foreground">
                      About <span className="text-primary">DocFlow AI</span>
                    </h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-muted rounded-xl transition-colors text-foreground/50 hover:text-foreground"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4 text-foreground/80 leading-relaxed">
                  <p className="font-medium text-lg text-foreground">
                    This is an independent website built by <span className="text-primary font-bold">Abhay Raj Rathi</span>.
                  </p>
                  <p>
                    It is an independent project that tries to provide you with a free alternative to Sejda and I Love PDF.
                  </p>
                  <div className="p-4 bg-muted/50 rounded-2xl border border-divider italic text-sm">
                    "As I'm a student and using all free libraries, the results may not be as accurate or 100% consistent with those paid sites, but I tried my best to make them usable and efficient."
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-divider">
                  <button
                    onClick={onClose}
                    className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Got it, thanks!
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
