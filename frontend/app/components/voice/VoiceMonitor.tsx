"use client";

import { useVoiceActivity } from "@/app/hooks";
import { Button, StatusIndicator, AudioLevelBar } from "@/app/components/ui";
import { SpeechLog } from "./SpeechLog";

type VADStatus = "idle" | "listening" | "speaking" | "loading" | "error";

function getVADStatus(vad: {
  loading: boolean;
  errored: string | false;
  listening: boolean;
  userSpeaking: boolean;
}): VADStatus {
  if (vad.loading) return "loading";
  if (vad.errored) return "error";
  if (!vad.listening) return "idle";
  if (vad.userSpeaking) return "speaking";
  return "listening";
}

export function VoiceMonitor() {
  const vad = useVoiceActivity({ autoPlayback: true });
  const status = getVADStatus(vad);

  return (
    <div className="flex flex-col items-center gap-6 p-8 w-full max-w-md">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Silero VAD + RNNoise
      </h2>

      <StatusIndicator status={status} />

      <AudioLevelBar level={vad.audioLevel} />

      <div className="flex gap-4">
        <Button
          variant="primary"
          onClick={() => vad.start()}
          disabled={vad.listening || vad.loading}
        >
          시작
        </Button>
        <Button
          variant="danger"
          onClick={() => vad.pause()}
          disabled={!vad.listening}
        >
          중지
        </Button>
      </div>

      {vad.errored && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg w-full text-sm">
          {vad.errored.toString()}
        </div>
      )}

      <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center space-y-1">
        <p>마이크 권한을 허용하면 Silero VAD가 음성을 감지합니다.</p>
        <p>RNNoise + DSP 자동 적용</p>
      </div>

      <SpeechLog entries={vad.speechLog} />
    </div>
  );
}
