"use client";

import Image from "next/image";

interface LogoAnimationProps {
  currentLogo: number;
  size?: number;
}

export function LogoAnimation({ currentLogo, size = 160 }: LogoAnimationProps) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <Image
        src="/eum_black.png"
        alt="Eum Logo"
        fill
        className={`object-contain transition-all duration-1000 ease-in-out ${
          currentLogo === 0
            ? "opacity-100 blur-0 scale-100"
            : "opacity-0 blur-xl scale-95"
        }`}
        priority
      />
      <Image
        src="/kor_eum_black.png"
        alt="Eum Logo Korean"
        fill
        className={`object-contain transition-all duration-1000 ease-in-out ${
          currentLogo === 1
            ? "opacity-100 blur-0 scale-100"
            : "opacity-0 blur-xl scale-95"
        }`}
        priority
      />
    </div>
  );
}
