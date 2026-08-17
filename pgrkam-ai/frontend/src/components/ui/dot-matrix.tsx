"use client";

import { useEffect, useState } from "react";

export function Led({
  on = false,
  active = false,
  busy = false,
  size = 6,
  className = "",
}: {
  on?: boolean;
  active?: boolean;
  busy?: boolean;
  size?: number;
  className?: string;
}) {
  const state = active ? "led-active" : on ? "led-on" : "";
  return (
    <span
      className={`led ${state} ${busy ? "led-busy" : ""} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export function DotMatrix({
  rows = 2,
  cols = 8,
  activeIndex,
  className = "",
}: {
  rows?: number;
  cols?: number;
  activeIndex?: number;
  className?: string;
}) {
  const total = rows * cols;
  return (
    <div
      className={`grid gap-[5px] ${className}`}
      style={{ gridTemplateColumns: `repeat(${cols}, 6px)` }}
      aria-hidden="true"
    >
      {Array.from({ length: total }, (_, index) => (
        <Led
          key={index}
          on={index % 4 !== 3}
          active={activeIndex != null && index === activeIndex}
        />
      ))}
    </div>
  );
}

export function DotLoader({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-mute">
      <span className="inline-flex gap-[5px]" aria-hidden="true">
        <Led busy />
        <Led busy className="[animation-delay:120ms]" />
        <Led busy className="[animation-delay:240ms]" />
      </span>
      {label}
    </span>
  );
}

const RAIL_DOTS = 28;

export function GlyphRail() {
  const [lit, setLit] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max <= 0 ? 0 : Math.min(1, window.scrollY / max);
      setLit(Math.round(progress * (RAIL_DOTS - 1)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="glyph-rail" aria-hidden="true">
      {Array.from({ length: RAIL_DOTS }, (_, index) => (
        <Led key={index} on={index < lit} active={index === lit} size={5} />
      ))}
    </div>
  );
}
