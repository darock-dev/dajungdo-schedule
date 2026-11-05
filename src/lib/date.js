export const WD = ["일", "월", "화", "수", "목", "금", "토"];

export const pad = n => String(n).padStart(2, "0");

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseD(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** 오늘 기준 며칠 뒤인지 (지났으면 음수). 날짜가 없으면 null */
export function dday(s) {
  const d = parseD(s);
  if (!d) return null;
  const t = parseD(todayStr());
  return Math.round((d - t) / 86400000);
}

export function fmtDate(s) {
  const d = parseD(s);
  if (!d) return "날짜 미정";
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`;
}

export function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ap = h < 12 ? "오전" : "오후";
  const hh = h % 12 || 12;
  return `${ap} ${hh}시${m ? ` ${m}분` : ""}`;
}

export const isPast = e => !!e.date && e.date < todayStr();
