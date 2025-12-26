import type { SpeechLogEntry } from "@/app/types";

interface SpeechLogProps {
  entries: SpeechLogEntry[];
}

const typeIcons: Record<SpeechLogEntry["type"], string> = {
  start: "🎤",
  end: "🔊",
  error: "❌",
  info: "ℹ️",
};

export function SpeechLog({ entries }: SpeechLogProps) {
  if (entries.length === 0) return null;

  return (
    <div className="w-full p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
        활동 로그
      </h3>
      <div className="space-y-1 text-xs font-mono text-zinc-600 dark:text-zinc-400">
        {entries.map((entry) => (
          <div key={entry.id}>
            [{entry.timestamp}] {typeIcons[entry.type]} {entry.message}
          </div>
        ))}
      </div>
    </div>
  );
}
