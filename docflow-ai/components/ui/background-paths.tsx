"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function LightFloatingPaths({ position }: { position: number }) {
    const paths = Array.from({ length: 36 }, (_, i) => ({
        id: i,
        d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position
            } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position
            } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position
            } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
        width: 0.8 + i * 0.03,
    }));

    return (
        <div className="absolute inset-0 pointer-events-none" style={{ 
            maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)'
        }}>
            <svg
                className="w-full h-full overflow-visible"
                viewBox="0 0 696 316"
                fill="none"
            >
                <title>Background Paths Light</title>
                {paths.map((path) => (
                    <motion.path
                        key={path.id}
                        d={path.d}
                        stroke="#000000"
                        strokeWidth={path.width}
                        strokeOpacity={0.08 + (path.id / 36) * 0.17}
                        fill="none"
                        initial={{ pathLength: 0.3 }}
                        animate={{
                            pathLength: 1,
                            pathOffset: [0, 1, 0],
                        }}
                        transition={{
                            duration: 20 + (path.id % 10),
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                        }}
                    />
                ))}
            </svg>
        </div>
    );
}

function DarkFloatingPaths({ position }: { position: number }) {
    const paths = Array.from({ length: 36 }, (_, i) => ({
        id: i,
        d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position
            } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position
            } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position
            } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
        width: 0.8 + i * 0.03,
    }));

    return (
        <div className="absolute inset-0 pointer-events-none" style={{ 
            maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)'
        }}>
            <svg
                className="w-full h-full overflow-visible"
                viewBox="0 0 696 316"
                fill="none"
            >
                <title>Background Paths Dark</title>
                {paths.map((path) => (
                    <motion.path
                        key={path.id}
                        d={path.d}
                        stroke="rgba(255,255,255,0.7)"
                        strokeWidth={path.width}
                        strokeOpacity={0.1 + (path.id / 36) * 0.4}
                        fill="none"
                        initial={{ pathLength: 0.3 }}
                        animate={{
                            pathLength: 1,
                            pathOffset: [0, 1, 0],
                        }}
                        transition={{
                            duration: 20 + (path.id % 10),
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                        }}
                    />
                ))}
            </svg>
        </div>
    );
}

export function BackgroundPaths({
    title = "Background Paths",
    children,
    className
}: {
    title?: string;
    children?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("relative w-full flex items-center justify-center overflow-hidden bg-background min-h-screen", className)}>
            {/* Light mode background lines — hidden in dark mode */}
            <div className="absolute inset-0 dark:hidden">
                <LightFloatingPaths position={1} />
                <LightFloatingPaths position={-1} />
            </div>
            {/* Dark mode background lines — hidden in light mode */}
            <div className="absolute inset-0 hidden dark:block">
                <DarkFloatingPaths position={1} />
                <DarkFloatingPaths position={-1} />
            </div>

            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
}
