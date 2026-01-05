"use client";

import { slideLabels } from "../../data";

interface DotNavigationProps {
  totalSlides: number;
  currentSlide: number;
  onNavigate: (index: number) => void;
}

export function DotNavigation({
  totalSlides,
  currentSlide,
  onNavigate,
}: DotNavigationProps) {
  return (
    <nav className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
      {Array.from({ length: totalSlides }, (_, index) => (
        <button
          key={index}
          onClick={() => onNavigate(index)}
          className={`group relative w-3 h-3 rounded-full transition-all duration-300 ${
            currentSlide === index
              ? "bg-black scale-125"
              : "bg-gray-300 hover:bg-gray-400"
          }`}
          aria-label={`Go to slide ${index + 1}`}
        >
          <span
            className={`absolute right-6 top-1/2 -translate-y-1/2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
              currentSlide === index ? "opacity-100" : ""
            }`}
          >
            {slideLabels[index]}
          </span>
        </button>
      ))}
    </nav>
  );
}
