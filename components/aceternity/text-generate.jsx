"use client";
import { useEffect } from "react";
import { motion, stagger, useAnimate } from "framer-motion";
import { cn } from "@/lib/utils";

export const TextGenerateEffect = ({ words, className, filter = true, duration = 0.5 }) => {
  const [scope, animate] = useAnimate();
  const wordsArray = words.split(" ");
  useEffect(() => {
    animate("span", { opacity: 1, filter: filter ? "blur(0px)" : "none" }, { duration, delay: stagger(0.1) });
  }, [scope.current]);
  return (
    <div className={cn("font-normal", className)}>
      <motion.div ref={scope}>
        {wordsArray.map((word, idx) => (
          <motion.span key={word + idx} className="opacity-0" style={{ filter: filter ? "blur(10px)" : "none" }}>
            {word}{" "}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
};
