"use client";

import { forwardRef, useRef, useEffect } from "react";

interface WhiteboardSectionProps {
  isActive: boolean;
}

export const WhiteboardSection = forwardRef<HTMLElement, WhiteboardSectionProps>(
  function WhiteboardSection({ isActive }, ref) {
    const penVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
      if (isActive && penVideoRef.current) {
        penVideoRef.current.currentTime = 0;
        penVideoRef.current.playbackRate = 1.7;
        penVideoRef.current.play();
      }
    }, [isActive]);

    return (
      <section
        ref={ref}
        className="min-h-screen snap-start snap-always flex flex-col items-center justify-center bg-white px-24 py-16"
      >
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black tracking-tight text-black mb-4">
            아이디어가 흐르는 캔버스
          </h1>
          <p className="text-xl text-gray-600">
            말보다 강력한 시각적 소통. 실시간 화이트보드로 복잡한 아키텍처도 직관적으로 설명합니다.
          </p>
        </div>
        <div className="w-full max-w-6xl h-[60vh] relative rounded-2xl overflow-hidden bg-black shadow-2xl">
          <video
            className="w-full h-full object-cover"
            src="/white_board.mov"
            autoPlay
            loop
            muted
            playsInline
          />
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[40%] h-[15%]">
            <video
              ref={penVideoRef}
              className="h-full object-cover mx-auto"
              src="/white_board_pen.mov"
              muted
              playsInline
            />
          </div>
        </div>
      </section>
    );
  }
);
