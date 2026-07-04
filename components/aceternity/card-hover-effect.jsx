"use client";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const HoverEffect = ({ items, className }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 py-4 gap-2", className)}>
      {items.map((item, idx) => (
        <Link href={item.link || "#"} key={item.title + idx} className="relative group block p-2 h-full w-full"
          onMouseEnter={() => setHoveredIndex(idx)} onMouseLeave={() => setHoveredIndex(null)}>
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span className="absolute inset-0 h-full w-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 block rounded-3xl"
                layoutId="hoverBg" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.15 } }}
                exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }} />
            )}
          </AnimatePresence>
          <div className="rounded-2xl h-full w-full p-6 overflow-hidden bg-black/60 border border-white/[0.1] group-hover:border-purple-500/40 relative z-20 backdrop-blur-sm">
            <div className="relative z-50">
              <div className="flex items-center gap-3 mb-4">
                {item.icon}
                <h4 className="text-zinc-100 font-bold tracking-wide">{item.title}</h4>
              </div>
              <p className="text-zinc-400 tracking-wide leading-relaxed text-sm">{item.description}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};
