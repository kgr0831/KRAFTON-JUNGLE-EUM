"use client";

import { forwardRef } from "react";

export const SilentExpertsSection = forwardRef<HTMLElement>(
  function SilentExpertsSection(_, ref) {
    return (
      <section
        ref={ref}
        className="min-h-screen snap-start snap-always flex items-center bg-white"
      >
        <div className="w-full px-16 pr-24">
          <div className="max-w-3xl">
            <h1 className="text-6xl font-black tracking-tight text-black mb-8 leading-tight whitespace-pre-wrap break-keep">
              침묵하는{"\n"}전문가들
            </h1>
            <p className="text-xl font-medium text-gray-700 leading-relaxed mb-8 whitespace-pre-wrap">
              글로벌 원격 근무 환경에서 많은{"\n"}개발자가 언어적 부담감 때문에{"\n"}자신의 아이디어를 적극적으로{"\n"}펼치지 못합니다.
            </p>
            <p className="text-lg text-gray-500 leading-relaxed whitespace-pre-wrap">
              실력은 충분하지만 언어 때문에{"\n"}관전자가 되어버리는 현상,{"\n"}이것이 우리가 해결해야 할 {"\n"}첫 번째 병목입니다.
            </p>
          </div>
        </div>
      </section>
    );
  }
);
