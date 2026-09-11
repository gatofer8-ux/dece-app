"use client";

import { useEffect, useState } from "react";

export default function AnimatedCounter({
  value,
  duration = 900,
}: {
  value: number | string;
  duration?: number;
}) {
  const numValue = typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, ""));
  const isNumeric = !isNaN(numValue) && isFinite(numValue) && String(value).trim().match(/^[0-9,.]+$/);

  const [displayValue, setDisplayValue] = useState<number>(() => (isNumeric ? 0 : 0));

  useEffect(() => {
    if (!isNumeric) return;

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);

      // Curva easeOutExpo para sensación ágil y precisa
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(ease * numValue);

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(numValue);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [numValue, duration, isNumeric]);

  if (!isNumeric) {
    return <span>{value}</span>;
  }

  return <span>{displayValue.toLocaleString("es-EC")}</span>;
}
