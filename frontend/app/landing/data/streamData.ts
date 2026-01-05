import { StreamChunk, SpeakerInfo, SpeakerType } from "../types";

export const streamDataKorean: StreamChunk[] = [
  { original: "현재 트래픽이", en: "Current traffic" },
  { original: "급증하는 구간은", en: "is spiking" },
  { original: "여기입니다.", en: "in this section." },
  { original: "Redis 캐싱을", en: "We need to apply" },
  { original: "적용해서", en: "Redis caching" },
  { original: "부하를 분산해야 합니다.", en: "to distribute the load." },
];

export const streamDataChinese: StreamChunk[] = [
  { original: "我同意这个方案，", en: "I agree with this approach," },
  { original: "但是我们需要", en: "but we need to" },
  { original: "考虑一下", en: "consider" },
  { original: "数据一致性", en: "data consistency" },
  { original: "的问题。", en: "issues." },
];

export const streamDataJapanese: StreamChunk[] = [
  { original: "そうですね、", en: "That's right," },
  { original: "キャッシュの", en: "the cache" },
  { original: "無効化戦略も", en: "invalidation strategy" },
  { original: "検討しましょう。", en: "should also be considered." },
];

export const getStreamData = (speaker: SpeakerType): StreamChunk[] => {
  switch (speaker) {
    case "korean":
      return streamDataKorean;
    case "chinese":
      return streamDataChinese;
    case "japanese":
      return streamDataJapanese;
  }
};

export const getSpeakerInfo = (speaker: SpeakerType): SpeakerInfo => {
  switch (speaker) {
    case "korean":
      return { name: "김민지", nameShort: "보", lang: "KO", color: "blue" };
    case "chinese":
      return { name: "Wei", nameShort: "W", lang: "ZH", color: "red" };
    case "japanese":
      return { name: "Yuuri", nameShort: "K", lang: "JA", color: "purple" };
  }
};
