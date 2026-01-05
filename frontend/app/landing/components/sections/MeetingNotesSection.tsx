"use client";

import { forwardRef } from "react";
import { meetingTranscript, summaryPoints, actionItems, waveformHeights } from "../../data";

interface MeetingNotesSectionProps {
  notesStep: number;
}

export const MeetingNotesSection = forwardRef<HTMLElement, MeetingNotesSectionProps>(
  function MeetingNotesSection({ notesStep }, ref) {
    return (
      <section
        ref={ref}
        className="min-h-screen snap-start snap-always flex bg-white"
      >
        {/* Left: Voice Transcript */}
        <div className="flex-1 flex flex-col">
          <div className="h-16 border-b border-gray-200 px-6 flex items-center gap-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#f1f3f4] flex items-center justify-center">
                <svg className="w-5 h-5 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-medium text-gray-800">Architecture Review Meeting</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>2024년 12월 24일</span>
                  <span>·</span>
                  <span>30분 12초</span>
                </div>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-sm text-gray-400 flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
                음성 자동 인식
              </span>
            </div>
          </div>

          <div className="h-14 border-b border-gray-100 px-6 flex items-center gap-4 bg-[#f8f9fa]">
            <button className="w-8 h-8 rounded-full bg-[#1a73e8] flex items-center justify-center hover:bg-[#1557b0] transition-colors">
              <svg className="w-4 h-4 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <div className="flex-1 flex items-center gap-2">
              <span className="text-sm text-gray-500 w-12">0:00</span>
              <div className="flex-1 h-8 flex items-center gap-[2px]">
                {waveformHeights.map((h, i) => (
                  <div key={i} className="w-1 bg-[#1a73e8] rounded-full opacity-60" style={{ height: `${h}px` }} />
                ))}
              </div>
              <span className="text-sm text-gray-500 w-12 text-right">30:12</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white">
            <div className="max-w-3xl mx-auto py-6 px-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#e8f0fe] rounded-full">
                  <div className="w-2 h-2 rounded-full bg-[#1a73e8]"></div>
                  <span className="text-sm font-medium text-[#1a73e8]">자동 생성된 녹취록</span>
                </div>
              </div>

              <div className="space-y-1">
                {meetingTranscript.map((item, idx) => (
                  <div key={idx} className={`transition-all duration-500 ${notesStep >= 1 ? 'opacity-100' : 'opacity-40'}`}>
                    <div className="flex gap-4 py-3 px-3 -mx-3 rounded-lg hover:bg-[#f8f9fa] transition-colors group">
                      <div className="w-14 shrink-0 pt-0.5">
                        <span className="text-sm text-gray-400 font-mono">{item.time}</span>
                      </div>
                      <div className="shrink-0 pt-1">
                        <div className={`w-2 h-2 rounded-full ${item.speaker === '김민지' ? 'bg-[#1a73e8]' : item.speaker === 'Wei' ? 'bg-[#ea4335]' : 'bg-[#9334e6]'}`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-semibold mr-2 ${item.speaker === '김민지' ? 'text-[#1a73e8]' : item.speaker === 'Wei' ? 'text-[#ea4335]' : 'text-[#9334e6]'}`}>
                          {item.speaker}
                        </span>
                        <span className="text-lg text-gray-800 leading-relaxed">
                          {notesStep >= 4 && item.text.includes('다음 주 월요일') ? (
                            <>좋습니다. 그럼 <mark className="bg-[#fef08a] px-1 rounded">다음 주 월요일에 배포</mark>하는 걸로 하죠.</>
                          ) : item.text}
                        </span>
                        {item.translation && (
                          <div className="mt-2 flex items-start gap-2">
                            <svg className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" />
                            </svg>
                            <span className="text-base text-gray-500">{item.translation}</span>
                          </div>
                        )}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button className="w-7 h-7 rounded-full hover:bg-gray-200 flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Side Panel */}
        <div
          className="w-[380px] border-l border-gray-200 bg-[#f8f9fa] flex flex-col transition-all duration-700 ease-out"
          style={{
            transform: notesStep >= 1 ? 'translateX(0)' : 'translateX(100%)',
            opacity: notesStep >= 1 ? 1 : 0,
          }}
        >
          <div className="h-16 px-5 flex items-center border-b border-gray-200 bg-white">
            <h2 className="text-base font-medium text-gray-800">회의 요약</h2>
            <div className="ml-auto flex items-center gap-1.5 text-sm text-gray-500">
              <div className="w-2 h-2 rounded-full bg-[#34a853] animate-pulse"></div>
              자동 생성됨
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className={`transition-all duration-500 ${notesStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-[#1a73e8]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z" />
                  </svg>
                  <span className="text-base font-medium text-gray-800">주요 논의 사항</span>
                </div>
                <ul className="space-y-2.5">
                  {summaryPoints.map((point, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-[15px] text-gray-600 leading-relaxed transition-all duration-300"
                      style={{ opacity: notesStep >= 2 ? 1 : 0, transitionDelay: `${idx * 150}ms` }}
                    >
                      <span className="text-[#1a73e8] mt-0.5">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className={`transition-all duration-500 ${notesStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-[#ea4335]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z" />
                  </svg>
                  <span className="text-base font-medium text-gray-800">할 일</span>
                </div>
                <div className="space-y-2.5">
                  {actionItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-all duration-300"
                      style={{ opacity: notesStep >= 3 ? 1 : 0, transitionDelay: `${idx * 100}ms` }}
                    >
                      <div className="w-5 h-5 rounded border-2 border-gray-300 shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] text-gray-800">{item.task}</p>
                        <p className="text-sm text-gray-500">{item.assignee} · {item.due}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`transition-all duration-500 ${notesStep >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
              <div className={`bg-white rounded-lg border-2 p-5 transition-all duration-300 ${notesStep >= 4 ? 'border-[#34a853]' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-[#34a853]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5zm2 4h10v2H7zm0 4h7v2H7z" />
                  </svg>
                  <span className="text-base font-medium text-gray-800">일정 감지됨</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-[#e8f5e9] flex flex-col items-center justify-center">
                    <span className="text-xs font-medium text-[#34a853] uppercase">Mon</span>
                    <span className="text-2xl font-bold text-[#34a853]">30</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-medium text-gray-800">Redis 캐싱 배포</p>
                    <p className="text-sm text-gray-500">2024년 12월 30일</p>
                  </div>
                  <div className={`transition-all duration-300 ${notesStep >= 5 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                    <div className="w-9 h-9 rounded-full bg-[#34a853] flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className={`mt-3 pt-3 border-t border-gray-100 transition-all duration-300 ${notesStep >= 5 ? 'opacity-100' : 'opacity-0'}`}>
                  <p className="text-sm text-[#34a853] font-medium">Google Calendar에 추가됨</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <img src="/eum_black.png" className="w-5 h-5 opacity-40" alt="Eum" />
              <span>Eum으로 자동 생성됨</span>
            </div>
          </div>
        </div>
      </section>
    );
  }
);
