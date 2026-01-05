import { Slide } from "../types";

export const slides: Slide[] = [
  {
    id: 0,
    type: "logo",
  },
  {
    id: 1,
    type: "content",
    title: "침묵하는\n전문가들",
    description:
      "글로벌 원격 근무 환경에서 많은 개발자가 언어적 부담감 때문에 자신의 아이디어를 적극적으로 펼치지 못합니다.",
    subDescription:
      "실력은 충분하지만 언어 때문에 '관전자'가 되어버리는 현상, 이것이 우리가 해결해야 할 첫 번째 병목입니다.",
  },
  {
    id: 2,
    type: "content",
    title: "보는 회의의\n한계",
    description:
      "팀원들이 문제 해결에 뛰어드는 대신, 모니터 너머의 화면을 그저 바라만 보고 있는 상황이 발생합니다.",
    subDescription:
      "참여자가 논의 대상에 직접 개입할 수 없는 환경은 집단 지성을 통한 문제 해결 과정을 가로막습니다.",
  },
  {
    id: 3,
    type: "content",
    title: "아이디어가\n흐르는 캔버스",
    description: "말보다 강력한 시각적 소통. 실시간 화이트보드로 복잡한 아키텍처도 직관적으로 설명합니다.",
    subDescription: "동시 편집과 무한한 확장성으로 팀의 생각을 하나로 모으세요.",
  },
  {
    id: 4,
    type: "content",
    title: "목소리에\n담긴 의도",
    description: "AI Speech-to-Speech 기술은 단순한 번역을 넘어 발화자의 뉘앙스와 감정까지 전달합니다.",
    subDescription: "언어의 장벽 없이, 마치 같은 언어를 쓰는 것처럼 자연스러운 대화가 가능해집니다.",
  },
  {
    id: 5,
    type: "content",
    title: "회의의 마무리는\n기록입니다",
    description: "EUM의 AI 비서는 회의 중 오간 대화를 실시간으로 분석합니다.",
    subDescription: "불필요한 행정 소요를 줄이고, 개발 본연의 업무에 집중하게 합니다.",
  },
  {
    id: 6,
    type: "cta",
    title: "시작하기",
  },
];

export const slideLabels: Record<number, string> = {
  0: "Intro",
  1: "침묵하는 전문가들",
  2: "보는 회의의 한계",
  3: "화이트보드",
  4: "Speech-to-Speech",
  5: "회의 기록",
  6: "시작하기",
};
