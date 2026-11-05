/* 처음 한 번만 넣어 주는 기본 데이터 (이미 넣었으면 다시 넣지 않아요). */

export const SEED_VERSION = "dajungdo:seeded:v1";

export const SEED_EVENTS = [
  {
    emoji: "🏠",
    title: "땡콩 굿바이 홈파티",
    date: "2026-11-27",
    time: "14:00",
    place: "",
    menu: "보쌈 or 삼겹짜파게티",
    with: "뚜니",
    memo: "",
  },
  {
    emoji: "🎄",
    title: "크리스마스 파티",
    date: "2026-12-25",
    time: "",
    place: "",
    menu: "",
    with: "",
    memo: "",
  },
];

export const SEED_TRIPS = [
  { emoji: "🌸", name: "춘천", status: "wish", when: "봄", memo: "" },
  { emoji: "🎏", name: "일본", status: "wish", when: "", memo: "", proposedName: "시소" },
  { emoji: "🌊", name: "아산 너머 서해안", status: "wish", when: "", memo: "게국지도 먹고 싶음", proposedName: "도아" },
  { emoji: "♨️", name: "온천 스파", status: "wish", when: "", memo: "이천 쪽에 많음", proposedName: "도아" },
  { emoji: "🛍", name: "같이 옷쇼핑 가기", status: "wish", when: "", memo: "", proposedName: "여백" },
  { emoji: "🏯", name: "전주 여행", status: "wish", when: "", memo: "한복 입고 돌아다니고 싶음 >.<", proposedName: "여백" },
];
