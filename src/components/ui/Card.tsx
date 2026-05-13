import type { HTMLAttributes, ReactNode } from "react";

type CardTone = "default" | "rose" | "sage" | "stone";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  tone?: CardTone;
}

const toneClasses: Record<CardTone, string> = {
  default: "border-white/70 bg-white/65",
  rose: "border-brand-rose/40 bg-brand-blush/50",
  sage: "border-status-olive/60 bg-status-sage/55",
  stone: "border-white/70 bg-bg-stone/80",
};

export function Card({
  children,
  className = "",
  tone = "default",
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "rounded-[2rem] border p-5 shadow-soft backdrop-blur-xl sm:p-6",
        toneClasses[tone],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
