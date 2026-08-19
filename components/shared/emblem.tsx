"use client";

import { useEffect, useState } from "react";

export type EmblemVariant = "hero" | "compact" | "static" | "loading";

const sizes: Record<EmblemVariant, { width: number; height: number }> = {
  hero: { width: 168, height: 168 },
  compact: { width: 112, height: 112 },
  static: { width: 42, height: 42 },
  loading: { width: 72, height: 72 },
};

export function Emblem({ variant = "static" }: { variant?: EmblemVariant }) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const size = sizes[variant];
  const animated = variant === "hero" || variant === "compact";

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const shouldAnimate = animated && !reducedMotion;
  const label = variant === "loading" ? "Loading" : "LÉVANCE";

  return (
    <span
      className={`levance-emblem relevance-emblem--${variant}${shouldAnimate ? " relevance-emblem--arrival" : ""}`}
      role={variant === "loading" ? "status" : "img"}
      aria-label={label}
      style={{ width: size.width, height: size.height }}
    >
      <svg
        viewBox="0 0 168 168"
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        focusable="false"
        aria-hidden="true"
      >
        <circle className="levance-emblem__outer" cx="84" cy="84" r="72" />
        <circle className="levance-emblem__middle" cx="84" cy="84" r="56" />
        <circle className="levance-emblem__inner" cx="84" cy="84" r="40" />
        <path className="levance-emblem__mark" d="M84 45V123M45 84H123" />
        <circle className="levance-emblem__core" cx="84" cy="84" r="6" />
      </svg>
    </span>
  );
}
