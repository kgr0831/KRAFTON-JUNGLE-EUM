import { MeetingTranscriptItem, ActionItem } from "../types";

export const meetingTranscript: MeetingTranscriptItem[] = [
  {
    speaker: "김민지",
    time: "14:32",
    text: "현재 트래픽이 급증하는 구간은 여기입니다. Redis 캐싱을 적용해서 부하를 분산해야 합니다.",
    translation: null,
  },
  {
    speaker: "Wei",
    time: "14:33",
    text: "我同意这个方案，但是我们需要考虑一下数据一致性的问题。",
    translation: "이 방안에 동의합니다. 하지만 데이터 일관성 문제를 고려해야 합니다.",
  },
  {
    speaker: "Yuuri",
    time: "14:34",
    text: "そうですね、キャッシュの無効化戦略も検討しましょう。",
    translation: "그렇네요, 캐시 무효화 전략도 검토합시다.",
  },
  {
    speaker: "김민지",
    time: "14:35",
    text: "좋습니다. 그럼 다음 주 월요일에 배포하는 걸로 하죠.",
    translation: null,
  },
];

export const summaryPoints: string[] = [
  "Redis 캐싱 도입으로 트래픽 급증 구간 부하 분산",
  "데이터 일관성 유지를 위한 캐시 무효화 전략 필요",
  "팀 전원 합의 하에 구현 방향 결정",
];

export const actionItems: ActionItem[] = [
  { task: "Redis 캐싱 레이어 구현", assignee: "김민지", due: "12/27" },
  { task: "캐시 무효화 전략 문서화", assignee: "Wei", due: "12/26" },
];

export const waveformHeights = [
  12, 18, 24, 16, 28, 20, 14, 26, 18, 22, 30, 16, 20, 24, 12, 28, 18, 14, 26, 20,
  16, 30, 22, 18, 24, 14, 28, 20, 12, 26, 18, 16, 24, 22, 30, 14, 20, 28, 18, 26,
  12, 24, 16, 22, 30, 20, 14, 28, 18, 26, 16, 24, 12, 20, 30, 22, 14, 28, 18, 24,
  16, 26, 20, 12, 30, 22, 18, 28, 14, 24, 16, 20, 26, 12, 22, 30, 18, 14, 28, 24,
];
