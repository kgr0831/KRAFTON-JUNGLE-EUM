"use client";

import { useState, useEffect } from "react";

interface UseLogoAnimationProps {
  intervalMs?: number;
}

interface UseLogoAnimationReturn {
  currentLogo: number;
}

export function useLogoAnimation({
  intervalMs = 10000,
}: UseLogoAnimationProps = {}): UseLogoAnimationReturn {
  const [currentLogo, setCurrentLogo] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLogo((prev) => (prev === 0 ? 1 : 0));
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return { currentLogo };
}
