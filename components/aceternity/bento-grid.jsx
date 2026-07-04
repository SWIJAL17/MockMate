import { cn } from "@/lib/utils";

export const BentoGrid = ({ className, children }) => (
  <div className={cn("grid md:auto-rows-[20rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto", className)}>{children}</div>
);

export const BentoGridItem = ({ className, title, description, header, icon }) => (
  <div className={cn("row-span-1 rounded-xl group/bento hover:shadow-2xl hover:shadow-purple-500/10 transition duration-300 p-4 bg-black/40 backdrop-blur-sm border border-white/[0.08] justify-between flex flex-col space-y-4", className)}>
    {header}
    <div className="group-hover/bento:translate-x-2 transition duration-300">
      {icon}
      <div className="font-sans font-bold text-neutral-200 mt-2 mb-2">{title}</div>
      <div className="font-sans font-normal text-neutral-400 text-sm">{description}</div>
    </div>
  </div>
);
