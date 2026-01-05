"use client";

import { forwardRef } from "react";

export const MultinationalSection = forwardRef<HTMLElement>(
  function MultinationalSection(_, ref) {
    return (
      <section
        ref={ref}
        className="min-h-screen snap-start snap-always flex flex-col items-center justify-center bg-white relative overflow-hidden px-8"
      >
        {/* Title */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold tracking-tight text-gray-900 mb-4">
            다국적 회의
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            서로 다른 언어, 하나의 대화.<br />
            실시간 통역으로 경계 없이 소통합니다.
          </p>
        </div>

        {/* Video Grid - Apple style */}
        <div className="flex items-center justify-center gap-6 max-w-6xl w-full">
          {/* Korean */}
          <div className="flex-1 group">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]">
              <video
                className="w-full h-full object-cover"
                src="/people-korean.mp4"
                autoPlay
                loop
                muted
                playsInline
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <span className="text-xl">🇰🇷</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">김민지</p>
                  <p className="text-white/70 text-sm">Seoul, Korea</p>
                </div>
              </div>
            </div>
          </div>

          {/* Chinese */}
          <div className="flex-1 group">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]">
              <video
                className="w-full h-full object-cover"
                src="/people-chinese.mp4"
                autoPlay
                loop
                muted
                playsInline
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <span className="text-xl">🇨🇳</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">Wei</p>
                  <p className="text-white/70 text-sm">Shanghai, China</p>
                </div>
              </div>
            </div>
          </div>

          {/* Japanese */}
          <div className="flex-1 group">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]">
              <video
                className="w-full h-full object-cover"
                src="/people-japanse.mp4"
                autoPlay
                loop
                muted
                playsInline
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <span className="text-xl">🇯🇵</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">Yuuri</p>
                  <p className="text-white/70 text-sm">Tokyo, Japan</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }
);
