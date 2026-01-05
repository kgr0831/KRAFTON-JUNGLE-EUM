export interface Slide {
  id: number;
  type: "logo" | "content" | "cta";
  title?: string;
  description?: string;
  subDescription?: string;
}

export interface StreamChunk {
  original: string;
  en: string;
}

export interface MeetingTranscriptItem {
  speaker: string;
  time: string;
  text: string;
  translation: string | null;
}

export interface ActionItem {
  task: string;
  assignee: string;
  due: string;
}

export interface TeamMember {
  name: string;
  role: string;
  image: string;
  color: string;
  isLeader?: boolean;
}

export type SpeakerType = "korean" | "chinese" | "japanese";

export interface SpeakerInfo {
  name: string;
  nameShort: string;
  lang: string;
  color: string;
}
