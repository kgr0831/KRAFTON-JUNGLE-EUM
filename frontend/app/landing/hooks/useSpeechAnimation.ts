"use client";

import { useState, useEffect, useCallback } from "react";
import { SpeakerType, StreamChunk } from "../types";
import { getStreamData } from "../data";

interface UseSpeechAnimationProps {
  isActive: boolean;
}

interface UseSpeechAnimationReturn {
  activeSpeaker: SpeakerType;
  activeChunkIndex: number;
  translatedChunkIndex: number;
  currentStreamData: StreamChunk[];
}

export function useSpeechAnimation({
  isActive,
}: UseSpeechAnimationProps): UseSpeechAnimationReturn {
  const [activeSpeaker, setActiveSpeaker] = useState<SpeakerType>("korean");
  const [activeChunkIndex, setActiveChunkIndex] = useState(-1);
  const [translatedChunkIndex, setTranslatedChunkIndex] = useState(-1);

  const getCurrentStreamData = useCallback(() => {
    return getStreamData(activeSpeaker);
  }, [activeSpeaker]);

  // Reset when slide becomes active/inactive
  useEffect(() => {
    setActiveSpeaker("korean");
    setActiveChunkIndex(-1);
    setTranslatedChunkIndex(-1);
  }, [isActive]);

  // Main streaming animation logic
  useEffect(() => {
    if (!isActive) return;

    let currentIdx = 0;

    const startStreaming = () => {
      setActiveChunkIndex(-1);
      setTranslatedChunkIndex(-1);
      currentIdx = 0;

      const interval = setInterval(() => {
        const data = getStreamData(activeSpeaker);
        if (currentIdx < data.length) {
          setActiveChunkIndex(currentIdx);
          currentIdx++;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            setActiveSpeaker((prev) => {
              if (prev === "korean") return "chinese";
              if (prev === "chinese") return "japanese";
              return "korean";
            });
          }, 1500);
        }
      }, 800);

      return interval;
    };

    const interval = startStreaming();
    return () => clearInterval(interval);
  }, [isActive, activeSpeaker]);

  // English translation follows with a delay
  useEffect(() => {
    if (activeChunkIndex >= 0) {
      const timer = setTimeout(() => {
        setTranslatedChunkIndex(activeChunkIndex);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [activeChunkIndex]);

  return {
    activeSpeaker,
    activeChunkIndex,
    translatedChunkIndex,
    currentStreamData: getCurrentStreamData(),
  };
}
