"use client";

import { forwardRef } from "react";

export const PassiveMeetingSection = forwardRef<HTMLElement>(
  function PassiveMeetingSection(_, ref) {
    return (
      <section
        ref={ref}
        className="min-h-screen snap-start snap-always flex items-center bg-white"
      >
        <div className="w-full px-16 pr-24">
          <div className="max-w-3xl">
            <h1 className="text-6xl font-black tracking-tight text-black mb-8 leading-tight whitespace-pre-wrap break-keep">
              회의인가,{"\n"}시청인가
            </h1>
            <p className="text-xl font-medium text-gray-700 leading-relaxed mb-8 whitespace-pre-wrap">
              팀원들이 문제 해결에 뛰어드는 {"\n"}대신, 모니터 너머의 화면을 {"\n"}그저 바라만 보고 있는{"\n"}상황이 발생합니다.
            </p>
            <p className="text-lg text-gray-500 leading-relaxed whitespace-pre-wrap">
              참여자가 논의 대상에{"\n"}직접 개입할 수 없는 환경은{"\n"}집단 지성을 통한 문제 해결{"\n"}과정을 가로막습니다.
            </p>
          </div>
        </div>
      </section>
    );
  }
);
