"use client";

import { forwardRef } from "react";

export const ArchitectureSection = forwardRef<HTMLElement>(
  function ArchitectureSection(_, ref) {
    return (
      <section
        ref={ref}
        className="min-h-screen snap-start snap-always flex flex-col bg-[#f8f9fa]"
      >
        <div className="h-16 px-8 flex items-center bg-white border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#f1f3f4] flex items-center justify-center">
              <svg className="w-5 h-5 text-[#5f6368]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-medium text-gray-800">시스템 아키텍처</h1>
              <p className="text-xs text-gray-500">Eum Platform Infrastructure</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          <div className="flex-1 p-6 flex items-center justify-center">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm w-full h-full flex items-center justify-center p-8">
              <img src="/architexture.png" alt="Eum Architecture Diagram" className="max-w-full max-h-full object-contain" />
            </div>
          </div>

          <div className="w-[340px] bg-white border-l border-gray-200 flex flex-col">
            <div className="h-14 px-5 flex items-center border-b border-gray-200">
              <span className="text-sm font-medium text-gray-800">기술 스택</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <TechStackGroup
                color="#1a73e8"
                label="Client"
                techs={["Next.js", "Pixi.js", "WebGPU", "LiveKit Client"]}
                bgColor="#e8f0fe"
              />
              <TechStackGroup
                color="#34a853"
                label="Backend"
                techs={["Go Fiber", "Socket.io", "Redis"]}
                bgColor="#e6f4ea"
                textColor="#137333"
              />
              <TechStackGroup
                color="#9334e6"
                label="Media"
                techs={["LiveKit SFU", "Egress", "Ingress"]}
                bgColor="#f3e8fd"
                textColor="#7627bb"
              />
              <TechStackGroup
                color="#ea4335"
                label="AI & Data"
                techs={["SageMaker", "Seamless AI", "RDS", "S3"]}
                bgColor="#fce8e6"
                textColor="#c5221f"
              />
              <TechStackGroup
                color="#5f6368"
                label="Infrastructure"
                techs={["AWS ALB", "CloudFront", "Nginx"]}
                bgColor="#f1f3f4"
              />
            </div>

            <div className="px-5 py-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <img src="/eum_black.png" className="w-4 h-4 opacity-40" alt="Eum" />
                <span>Eum Architecture v1.0</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }
);

interface TechStackGroupProps {
  color: string;
  label: string;
  techs: string[];
  bgColor: string;
  textColor?: string;
}

function TechStackGroup({ color, label, techs, bgColor, textColor }: TechStackGroupProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {techs.map((tech) => (
          <span
            key={tech}
            className="px-3 py-1.5 rounded-full text-sm font-medium"
            style={{ backgroundColor: bgColor, color: textColor || color }}
          >
            {tech}
          </span>
        ))}
      </div>
    </div>
  );
}
