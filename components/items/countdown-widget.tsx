"use client";

import { useEffect, useState } from "react";

import { countdownDayLabel } from "@/lib/item-deadlines";

export function CountdownWidget({ dueDate, title }: { dueDate: string; title: string }) {
  const days = Math.ceil((Date.parse(dueDate) - Date.now()) / 86_400_000);
  const [shown, setShown] = useState(days);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(days);
      return;
    }

    setShown(0);
    const started = performance.now();
    const duration = 700;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      setShown(Math.round(days * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [days]);

  const label = shown === days ? countdownDayLabel(days) : days > 0 ? `Faltan ${shown} días` : `Hace ${Math.abs(shown)} días`;

  return (
    <article className="countdown-widget">
      <p>{title}</p>
      <time dateTime={dueDate}>{label}</time>
    </article>
  );
}
