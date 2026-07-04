"use client";
import { useState } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const FloatingNav = ({ navItems, className }) => {
  const { scrollYProgress } = useScroll();
  const [visible, setVisible] = useState(true);
  useMotionValueEvent(scrollYProgress, "change", (current) => {
    if (typeof current === "number") {
      const direction = current - (scrollYProgress.getPrevious() ?? 0);
      if (current < 0.05) setVisible(true);
      else setVisible(direction < 0);
    }
  });
  return (
    <AnimatePresence mode="wait">
      <motion.div initial={{ opacity: 1, y: -100 }} animate={{ y: visible ? 0 : -100, opacity: visible ? 1 : 0 }} transition={{ duration: 0.2 }}
        className={cn("flex max-w-fit fixed top-6 inset-x-0 mx-auto border border-white/[0.1] rounded-full bg-black/70 backdrop-blur-md shadow-lg shadow-purple-500/5 z-[5000] px-6 py-2 items-center justify-center space-x-6", className)}>
        {navItems.map((n, i) => (
          <Link key={i} href={n.link} className="relative text-neutral-300 hover:text-white text-sm flex items-center space-x-1 transition-colors">
            {n.icon}<span className="hidden sm:block">{n.name}</span>
          </Link>
        ))}
        <Link href="/dashboard" className="text-sm font-medium relative border border-white/[0.2] text-white px-4 py-1.5 rounded-full hover:border-purple-500/50 transition-colors">
          Launch app
          <span className="absolute inset-x-0 -bottom-px w-3/4 mx-auto h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
        </Link>
      </motion.div>
    </AnimatePresence>
  );
};
