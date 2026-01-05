"use client";

interface SoundBarProps {
  color: string;
}

export function SoundBar({ color }: SoundBarProps) {
  const bgColor = color === "blue" ? "bg-blue-500" : color === "red" ? "bg-red-500" : "bg-purple-500";

  return (
    <div className={`w-4 h-4 rounded-full ${bgColor} flex items-center justify-center`}>
      <div className="flex gap-[2px] items-end h-2.5">
        <div
          className="w-[2px] bg-white rounded-full animate-[soundbar_0.4s_ease-in-out_infinite]"
          style={{ height: "40%" }}
        />
        <div
          className="w-[2px] bg-white rounded-full animate-[soundbar_0.4s_ease-in-out_infinite_0.1s]"
          style={{ height: "90%" }}
        />
        <div
          className="w-[2px] bg-white rounded-full animate-[soundbar_0.4s_ease-in-out_infinite_0.2s]"
          style={{ height: "60%" }}
        />
      </div>
    </div>
  );
}
