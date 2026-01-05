"use client";

import { forwardRef, useRef, useEffect } from "react";
import { SpeakerType, StreamChunk } from "../../types";
import { getSpeakerInfo } from "../../data";
import { SoundBar } from "../ui";

interface SpeechToSpeechSectionProps {
  activeSpeaker: SpeakerType;
  activeChunkIndex: number;
  translatedChunkIndex: number;
  currentStreamData: StreamChunk[];
}

export const SpeechToSpeechSection = forwardRef<HTMLElement, SpeechToSpeechSectionProps>(
  function SpeechToSpeechSection(
    { activeSpeaker, activeChunkIndex, translatedChunkIndex, currentStreamData },
    ref
  ) {
    const speakerInfo = getSpeakerInfo(activeSpeaker);

    const koreanVideoRef = useRef<HTMLVideoElement>(null);
    const chineseVideoRef = useRef<HTMLVideoElement>(null);
    const japaneseVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
      const videos = {
        korean: koreanVideoRef.current,
        chinese: chineseVideoRef.current,
        japanese: japaneseVideoRef.current,
      };

      Object.entries(videos).forEach(([speaker, video]) => {
        if (!video) return;

        if (speaker === activeSpeaker) {
          video.currentTime = 0;
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    }, [activeSpeaker]);

    return (
      <section
        ref={ref}
        className="min-h-screen snap-start snap-always flex flex-col items-center justify-center bg-white"
      >
        {/* Conference Grid */}
        <div className="w-full max-w-[1400px] px-12 h-[58vh] relative flex items-center justify-center">
          {/* Kenji (Japanese) */}
          <div
            className={`absolute rounded-2xl overflow-hidden bg-gray-100 will-change-transform ${
              activeSpeaker === "japanese"
                ? "ring-4 ring-purple-500 shadow-2xl z-20"
                : "border border-gray-200 shadow-md z-10"
            }`}
            style={{
              width: activeSpeaker === "japanese" ? "55%" : "22%",
              height: activeSpeaker === "japanese" ? "70%" : "50%",
              transform:
                activeSpeaker === "japanese"
                  ? "translateX(0%)"
                  : "translateX(-170%)",
              transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <video
              ref={japaneseVideoRef}
              className="w-full h-full object-cover"
              src="/people-japanse.mp4"
              loop
              muted
              playsInline
            />
            {/* Dark overlay for inactive speaker */}
            <div
              className={`absolute inset-0 bg-black transition-opacity duration-500 ${
                activeSpeaker === "japanese" ? "opacity-0" : "opacity-40"
              }`}
            />
            <div
              className={`absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-sm rounded-md flex items-center gap-1.5 transition-all ${
                activeSpeaker === "japanese" ? "px-3 py-1.5" : "px-2.5 py-1"
              }`}
            >
              <span
                className={`text-white font-medium ${
                  activeSpeaker === "japanese" ? "text-sm" : "text-xs"
                }`}
              >
                Yuuri
              </span>
              {activeSpeaker === "japanese" && activeChunkIndex >= 0 && (
                <SoundBar color="purple" />
              )}
            </div>
          </div>

          {/* 보건 (Korean) */}
          <div
            className={`absolute rounded-2xl overflow-hidden bg-gray-100 will-change-transform ${
              activeSpeaker === "korean"
                ? "ring-4 ring-blue-500 shadow-2xl z-20"
                : "border border-gray-200 shadow-md z-10"
            }`}
            style={{
              width: activeSpeaker === "korean" ? "55%" : "22%",
              height: activeSpeaker === "korean" ? "70%" : "50%",
              transform:
                activeSpeaker === "korean"
                  ? "translateX(0%)"
                  : activeSpeaker === "chinese"
                  ? "translateX(170%)"
                  : "translateX(170%)",
              transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <video
              ref={koreanVideoRef}
              className="w-full h-full object-cover"
              src="/people-korean.mp4"
              loop
              muted
              playsInline
            />
            {/* Dark overlay for inactive speaker */}
            <div
              className={`absolute inset-0 bg-black transition-opacity duration-500 ${
                activeSpeaker === "korean" ? "opacity-0" : "opacity-40"
              }`}
            />
            <div
              className={`absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-sm rounded-md flex items-center gap-1.5 transition-all ${
                activeSpeaker === "korean" ? "px-3 py-1.5" : "px-2.5 py-1"
              }`}
            >
              <span
                className={`text-white font-medium ${
                  activeSpeaker === "korean" ? "text-sm" : "text-xs"
                }`}
              >
                김민지
              </span>
              {activeSpeaker === "korean" && activeChunkIndex >= 0 && (
                <SoundBar color="blue" />
              )}
            </div>
          </div>

          {/* Wei (Chinese) */}
          <div
            className={`absolute rounded-2xl overflow-hidden bg-gray-100 will-change-transform ${
              activeSpeaker === "chinese"
                ? "ring-4 ring-red-500 shadow-2xl z-20"
                : "border border-gray-200 shadow-md z-10"
            }`}
            style={{
              width: activeSpeaker === "chinese" ? "55%" : "22%",
              height: activeSpeaker === "chinese" ? "70%" : "50%",
              transform:
                activeSpeaker === "chinese"
                  ? "translateX(0%)"
                  : "translateX(170%)",
              transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <video
              ref={chineseVideoRef}
              className="w-full h-full object-cover"
              src="/people-chinese.mp4"
              loop
              muted
              playsInline
            />
            {/* Dark overlay for inactive speaker */}
            <div
              className={`absolute inset-0 bg-black transition-opacity duration-500 ${
                activeSpeaker === "chinese" ? "opacity-0" : "opacity-40"
              }`}
            />
            <div
              className={`absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-sm rounded-md flex items-center gap-1.5 transition-all ${
                activeSpeaker === "chinese" ? "px-3 py-1.5" : "px-2.5 py-1"
              }`}
            >
              <span
                className={`text-white font-medium ${
                  activeSpeaker === "chinese" ? "text-sm" : "text-xs"
                }`}
              >
                Wei
              </span>
              {activeSpeaker === "chinese" && activeChunkIndex >= 0 && (
                <SoundBar color="red" />
              )}
            </div>
          </div>
        </div>

        {/* Real-time Caption */}
        <div
          className={`w-full max-w-3xl mx-auto px-8 mt-4 transition-all duration-500 ${
            activeChunkIndex >= 0
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <div className="bg-gray-900/95 backdrop-blur-md rounded-xl px-6 py-4 shadow-xl">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    activeSpeaker === "korean"
                      ? "bg-blue-500"
                      : activeSpeaker === "chinese"
                      ? "bg-red-500"
                      : "bg-purple-500"
                  }`}
                >
                  <span className="text-white text-[10px] font-bold">
                    {speakerInfo.nameShort}
                  </span>
                </div>
                <span
                  className={`text-sm font-medium ${
                    activeSpeaker === "korean"
                      ? "text-blue-400"
                      : activeSpeaker === "chinese"
                      ? "text-red-400"
                      : "text-purple-400"
                  }`}
                >
                  {speakerInfo.lang}
                </span>
              </div>
              <p className="text-white text-lg leading-relaxed flex-1">
                {currentStreamData
                  .slice(0, activeChunkIndex + 1)
                  .map((chunk, idx) => (
                    <span
                      key={idx}
                      className={`inline transition-opacity duration-200 ${
                        idx === activeChunkIndex ? "text-white" : "text-white/80"
                      }`}
                    >
                      {chunk.original}
                      {idx <= activeChunkIndex &&
                      idx < currentStreamData.length - 1
                        ? " "
                        : ""}
                    </span>
                  ))}
                {activeChunkIndex >= 0 &&
                  activeChunkIndex < currentStreamData.length - 1 && (
                    <span className="inline-block w-0.5 h-4 bg-white/60 ml-0.5 animate-pulse align-middle"></span>
                  )}
              </p>
            </div>

            <div
              className={`flex items-start gap-3 transition-all duration-300 ${
                translatedChunkIndex >= 0 ? "opacity-100" : "opacity-0"
              }`}
            >
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                    />
                  </svg>
                </div>
                <span className="text-green-400 text-sm font-medium">EN</span>
              </div>
              <p className="text-green-300 text-lg leading-relaxed flex-1">
                {currentStreamData
                  .slice(0, translatedChunkIndex + 1)
                  .map((chunk, idx) => (
                    <span
                      key={idx}
                      className={`inline transition-opacity duration-200 ${
                        idx === translatedChunkIndex
                          ? "text-green-300"
                          : "text-green-300/70"
                      }`}
                    >
                      {chunk.en}
                      {idx <= translatedChunkIndex &&
                      idx < currentStreamData.length - 1
                        ? " "
                        : ""}
                    </span>
                  ))}
                {translatedChunkIndex >= 0 &&
                  translatedChunkIndex < currentStreamData.length - 1 && (
                    <span className="inline-block w-0.5 h-4 bg-green-400/60 ml-0.5 animate-pulse align-middle"></span>
                  )}
              </p>
            </div>
          </div>

          <div className="flex justify-center mt-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <img
                src="/eum_black.png"
                className="w-4 h-4 object-contain opacity-50"
                alt="Eum"
              />
              <span>Powered by Eum Real-time STS</span>
            </div>
          </div>
        </div>
      </section>
    );
  }
);
