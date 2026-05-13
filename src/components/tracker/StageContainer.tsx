import { gsap } from "gsap";
import { useLayoutEffect, useRef, type ReactNode } from "react";

interface StageContainerProps {
  children: ReactNode;
  stageKey: string;
}

export function StageContainer({ children, stageKey }: StageContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { duration: 0.45, ease: "power3.out" },
      });

      timeline.fromTo(
        container,
        { autoAlpha: 0, x: 28 },
        { autoAlpha: 1, x: 0 },
      );

      const stageItems = container.querySelectorAll("[data-stage-item]");

      if (stageItems?.length) {
        timeline.fromTo(
          stageItems,
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.07, ease: "power2.out" },
          "-=0.2",
        );
      }
    }, container);

    return () => ctx.revert();
  }, [stageKey]);

  return (
    <div ref={containerRef} className="min-h-[34rem]">
      {children}
    </div>
  );
}
