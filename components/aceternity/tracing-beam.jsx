"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export const TracingBeam = ({ children, className }) => {
  const ref = useRef(null);
  const contentRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const [svgHeight, setSvgHeight] = useState(0);
  useEffect(() => {
    if (contentRef.current) setSvgHeight(contentRef.current.offsetHeight);
  }, []);
  const y1 = useSpring(useTransform(scrollYProgress, [0, 0.8], [50, svgHeight]), { stiffness: 500, damping: 90 });
  const y2 = useSpring(useTransform(scrollYProgress, [0, 1], [50, svgHeight - 200]), { stiffness: 500, damping: 90 });
  return (
    <motion.div ref={ref} className={cn("relative w-full max-w-4xl mx-auto", className)}>
      <div className="absolute -left-4 md:-left-20 top-3">
        <motion.div className="ml-[27px] h-4 w-4 rounded-full border border-neutral-700 shadow-sm flex items-center justify-center">
          <motion.div className="h-2 w-2 rounded-full border border-neutral-500 bg-purple-500" />
        </motion.div>
        <svg viewBox={`0 0 20 ${svgHeight}`} width="20" height={svgHeight} className="ml-4 block" aria-hidden>
          <motion.path d={`M 1 0V -36 l 18 24 V ${svgHeight * 0.8} l -18 24V ${svgHeight}`} fill="none" stroke="#9091A0" strokeOpacity="0.16" transition={{ duration: 10 }} />
          <motion.path d={`M 1 0V -36 l 18 24 V ${svgHeight * 0.8} l -18 24V ${svgHeight}`} fill="none" stroke="url(#g)" strokeWidth="1.25" className="motion-reduce:hidden" />
          <defs>
            <motion.linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={y1} y2={y2}>
              <stop stopColor="#18CCFC" stopOpacity="0" />
              <stop stopColor="#18CCFC" />
              <stop offset="0.325" stopColor="#6344F5" />
              <stop offset="1" stopColor="#AE48FF" stopOpacity="0" />
            </motion.linearGradient>
          </defs>
        </svg>
      </div>
      <div ref={contentRef}>{children}</div>
    </motion.div>
  );
};
