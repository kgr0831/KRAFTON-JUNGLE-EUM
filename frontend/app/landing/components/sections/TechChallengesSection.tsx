"use client";

import { forwardRef } from "react";

interface TechChallengesSectionProps {
  challengeStep: number;
}

export const TechChallengesSection = forwardRef<HTMLElement, TechChallengesSectionProps>(
  function TechChallengesSection({ challengeStep }, ref) {
    return (
      <section
        ref={ref}
        className="min-h-screen snap-start snap-always flex flex-col bg-[#f8f9fa]"
      >
        <div className="h-16 px-8 flex items-center bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#f1f3f4] flex items-center justify-center">
              <svg className="w-5 h-5 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-medium text-gray-800">기술적 챌린지</h1>
              <p className="text-xs text-gray-500">Technical Challenges & Solutions</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-8 flex gap-6 overflow-hidden">
          {/* Challenge 1: S2S Latency */}
          <div className={`flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col transition-all duration-500 ${challengeStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#e8f0fe] flex items-center justify-center">
                  <span className="text-lg font-bold text-[#1a73e8]">1</span>
                </div>
                <div>
                  <h2 className="text-lg font-medium text-gray-900">S2S Latency</h2>
                  <p className="text-sm text-gray-500">실시간 음성 번역 지연 최소화</p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 flex flex-col">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ea4335]"></div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Problem</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  문장이 끝날 때까지 기다리는 기존 방식은 <span className="text-[#ea4335] font-semibold">5초 이상의 지연</span>을 초래
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#34a853]"></div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Solution</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  <span className="px-2 py-0.5 bg-[#e8f0fe] text-[#1a73e8] rounded font-medium">스트리밍 파이프라인</span> 구축 - 음성을 청크 단위로 분할하여 병렬 처리
                </p>
              </div>

              <div className="flex-1 bg-[#f8f9fa] rounded-lg p-4">
                <div className="flex items-center justify-between h-full">
                  <PipelineNode icon="mic" label="Audio" color="#1a73e8" isActive={challengeStep >= 2} />

                  <div className="flex items-center gap-1">
                    <div className={`flex gap-1 transition-all duration-500 ${challengeStep >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="w-3 h-3 rounded-sm bg-[#1a73e8]" style={{ animationDelay: `${i * 150}ms`, animation: challengeStep >= 2 ? 'pulse 1s ease-in-out infinite' : 'none' }}></div>
                      ))}
                    </div>
                    <ArrowIcon />
                  </div>

                  <PipelineStep label="STT" sublabel="음성→텍스트" color="#1a73e8" bgColor="#e8f0fe" isActive={challengeStep >= 2} delay={100} />
                  <ArrowIcon />
                  <PipelineStep label="LLM" sublabel="번역" color="#f9ab00" bgColor="#fef7e0" isActive={challengeStep >= 2} delay={200} />
                  <ArrowIcon />
                  <PipelineStep label="TTS" sublabel="텍스트→음성" color="#34a853" bgColor="#e6f4ea" isActive={challengeStep >= 2} delay={300} />
                  <ArrowIcon />
                  <PipelineNode icon="speaker" label="Output" color="#34a853" isActive={challengeStep >= 2} delay={400} />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Before:</span>
                    <span className="px-2 py-1 bg-[#fce8e6] text-[#c5221f] rounded text-sm font-semibold">5초+</span>
                  </div>
                  <ArrowIcon />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">After:</span>
                    <span className="px-2 py-1 bg-[#e6f4ea] text-[#137333] rounded text-sm font-semibold">&lt; 1초</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[#34a853]">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" />
                  </svg>
                  <span className="text-sm font-medium">80% 개선</span>
                </div>
              </div>
            </div>
          </div>

          {/* Challenge 2: CRDT Consistency */}
          <div className={`flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col transition-all duration-500 ${challengeStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#f3e8fd] flex items-center justify-center">
                  <span className="text-lg font-bold text-[#9334e6]">2</span>
                </div>
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Whiteboard Consistency</h2>
                  <p className="text-sm text-gray-500">캔버스 동시성 제어</p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 flex flex-col">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ea4335]"></div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Problem</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  다수 사용자가 동시에 작업할 때 발생하는 <span className="text-[#ea4335] font-semibold">데이터 충돌(Conflict)</span> 문제
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#34a853]"></div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Solution</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  <span className="px-2 py-0.5 bg-[#f3e8fd] text-[#9334e6] rounded font-medium">CRDT 알고리즘</span> 도입 - 수학적으로 동일한 최종 상태 보장
                </p>
              </div>

              <div className="flex-1 bg-[#f8f9fa] rounded-lg p-4">
                <div className="h-full flex items-center justify-center gap-8">
                  <ClientNode label="A" color="#1a73e8" bgColor="#e8f0fe" isActive={challengeStep >= 4} position="top-left" />

                  <div className="flex flex-col items-center gap-2">
                    <div className={`flex items-center gap-1 transition-all duration-500 ${challengeStep >= 4 ? 'opacity-100' : 'opacity-30'}`}>
                      <div className="w-8 h-0.5 bg-[#34a853]"></div>
                      <svg className="w-4 h-4 text-[#34a853]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                      </svg>
                    </div>
                    <div className="px-3 py-1.5 bg-[#e6f4ea] rounded-full">
                      <span className="text-xs font-medium text-[#137333]">CRDT Merge</span>
                    </div>
                    <div className={`flex items-center gap-1 transition-all duration-500 ${challengeStep >= 4 ? 'opacity-100' : 'opacity-30'}`}>
                      <svg className="w-4 h-4 text-[#34a853] rotate-180" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                      </svg>
                      <div className="w-8 h-0.5 bg-[#34a853]"></div>
                    </div>
                  </div>

                  <ClientNode label="B" color="#ea4335" bgColor="#fce8e6" isActive={challengeStep >= 4} position="bottom-right" />

                  <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                  </svg>

                  <FinalStateNode isActive={challengeStep >= 4} />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge label="Lock-free" />
                  <Badge label="Conflict-free" />
                  <Badge label="Eventually Consistent" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <img src="/eum_black.png" className="w-4 h-4 opacity-40" alt="Eum" />
            <span>Eum Technical Overview</span>
          </div>
        </div>
      </section>
    );
  }
);

function ArrowIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
    </svg>
  );
}

interface PipelineNodeProps {
  icon: "mic" | "speaker";
  label: string;
  color: string;
  isActive: boolean;
  delay?: number;
}

function PipelineNode({ icon, label, color, isActive, delay = 0 }: PipelineNodeProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`w-12 h-12 rounded-lg bg-white border-2 flex items-center justify-center transition-all duration-300 ${isActive ? 'scale-100' : 'scale-90 opacity-50'}`}
        style={{ borderColor: color, transitionDelay: `${delay}ms` }}
      >
        {icon === "mic" ? (
          <svg className="w-6 h-6" style={{ color }} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        ) : (
          <svg className="w-6 h-6" style={{ color }} viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        )}
      </div>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

interface PipelineStepProps {
  label: string;
  sublabel: string;
  color: string;
  bgColor: string;
  isActive: boolean;
  delay: number;
}

function PipelineStep({ label, sublabel, color, bgColor, isActive, delay }: PipelineStepProps) {
  return (
    <div
      className={`flex flex-col items-center gap-2 transition-all duration-300 ${isActive ? 'scale-100 opacity-100' : 'scale-90 opacity-50'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="w-12 h-12 rounded-lg border flex items-center justify-center" style={{ backgroundColor: bgColor, borderColor: color }}>
        <span className="text-xs font-bold" style={{ color }}>{label}</span>
      </div>
      <span className="text-xs text-gray-500">{sublabel}</span>
    </div>
  );
}

interface ClientNodeProps {
  label: string;
  color: string;
  bgColor: string;
  isActive: boolean;
  position: "top-left" | "bottom-right";
}

function ClientNode({ label, color, bgColor, isActive, position }: ClientNodeProps) {
  return (
    <div className={`flex flex-col items-center gap-3 transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-50'}`}>
      <div className="w-14 h-14 rounded-full border-2 flex items-center justify-center" style={{ backgroundColor: bgColor, borderColor: color }}>
        <span className="text-sm font-bold" style={{ color }}>{label}</span>
      </div>
      <div className="w-20 h-16 rounded-lg bg-white border border-gray-200 flex items-center justify-center relative overflow-hidden">
        <div
          className={`absolute w-6 h-6 rounded border transition-all duration-700`}
          style={{
            backgroundColor: `${color}20`,
            borderColor: color,
            ...(position === "top-left"
              ? isActive ? { top: 8, left: 8 } : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
              : isActive ? { bottom: 8, right: 8 } : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
            ),
          }}
        ></div>
      </div>
      <span className="text-xs text-gray-500">Client {label}</span>
    </div>
  );
}

interface FinalStateNodeProps {
  isActive: boolean;
}

function FinalStateNode({ isActive }: FinalStateNodeProps) {
  return (
    <div className={`flex flex-col items-center gap-3 transition-all duration-500 ${isActive ? 'opacity-100' : 'opacity-50'}`}>
      <div className="w-14 h-14 rounded-full bg-[#e6f4ea] border-2 border-[#34a853] flex items-center justify-center">
        <svg className="w-6 h-6 text-[#34a853]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
        </svg>
      </div>
      <div className="w-20 h-16 rounded-lg bg-white border-2 border-[#34a853] flex items-center justify-center relative overflow-hidden">
        <div
          className={`absolute w-6 h-6 rounded bg-[#1a73e8]/20 border border-[#1a73e8] transition-all duration-700 ${isActive ? 'top-2 left-2' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}`}
        ></div>
        <div
          className={`absolute w-6 h-6 rounded bg-[#ea4335]/20 border border-[#ea4335] transition-all duration-700 ${isActive ? 'bottom-2 right-2' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}`}
        ></div>
      </div>
      <span className="text-xs text-[#34a853] font-medium">동일한 최종 상태</span>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f1f3f4] rounded-full">
      <svg className="w-4 h-4 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
      </svg>
      <span className="text-xs text-[#5f6368]">{label}</span>
    </div>
  );
}
