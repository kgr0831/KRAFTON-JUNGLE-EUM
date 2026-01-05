"use client";

import { forwardRef } from "react";
import { LogoAnimation } from "../ui";

interface IntroSectionProps {
  currentLogo: number;
}

export const IntroSection = forwardRef<HTMLElement, IntroSectionProps>(
  function IntroSection({ currentLogo }, ref) {
    return (
      <section
        ref={ref}
        className="min-h-screen snap-start snap-always flex items-center bg-white"
      >
        <div className="w-full px-16 pr-24">
          <div className="max-w-3xl">
            <div className="mb-8">
              <LogoAnimation currentLogo={currentLogo} size={160} />
            </div>
            <p className="text-xl font-medium text-gray-500 leading-relaxed whitespace-pre-wrap">
              AI 실시간 통역과 무한 캔버스를{"\n"}결합한 협업 플랫폼
            </p>
          </div>
        </div>
      </section>
    );
  }
);
