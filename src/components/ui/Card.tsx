import type { HTMLAttributes, ReactNode } from "react";

type CardTone = "default" | "rose" | "sage" | "stone";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  tone?: CardTone;
}

const toneClasses: Record<CardTone, string> = {
  default: "border-white/75 bg-white/72",
  rose: "border-brand-rose/55 bg-brand-blush/65",
  sage: "border-status-olive/70 bg-status-sage/65",
  stone: "border-white/75 bg-bg-stone/88",
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
