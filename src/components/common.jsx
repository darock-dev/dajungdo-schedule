import { useEffect, useRef, useState } from "react";
import { useApp } from "../store/AppContext";
import { blobUrl } from "../lib/constants";
import { WD, parseD, fmtTime, isPast } from "../lib/date";
import { nickOf, colorOf } from "../lib/members";
import { LOCAL_PREFIX, localAssetUrl } from "../lib/localAssets";
import { SB_PREFIX, supabaseAssetUrl } from "../lib/supabaseDb";

/* 사진 주소: 공유 저장소면 서버 주소, 이 기기 사진이면 IndexedDB에서 만든 주소.
 * undefined = 불러오는 중, null = 없음 */
export function useAssetSrc(asset) {
  const local = !!asset && asset.startsWith(LOCAL_PREFIX);
  const [src, setSrc] = useState(() => {
    if (!asset || local) return undefined;
    return asset.startsWith(SB_PREFIX) ? supabaseAssetUrl(asset) : blobUrl(asset);
  });
  useEffect(() => {
    if (!local) return;
    let alive = true;
    localAssetUrl(asset).then(u => alive && setSrc(u));
    return () => { alive = false; };
  }, [asset, local]);
  return src;
}

export function Dot({ id, size = 28, color }) {
  const { members } = useApp();
  const name = nickOf(members, id);
  return (
    <span
      className="inline-grid flex-none place-items-center rounded-full font-bold text-white"
      style={{ background: color || colorOf(members, id), width: size, height: size, fontSize: size <= 22 ? 11 : 13 }}
    >
      {name.slice(0, 1)}
    </span>
  );
}

export function MemberChips() {
  const { members } = useApp();
  const ids = Object.keys(members);
  if (!ids.length) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {ids.map(id => (
        <span key={id} className="inline-flex items-center gap-2 rounded-full bg-card py-1 pl-1 pr-3 text-[14px] font-medium shadow-[0_1px_2px_rgba(25,31,40,.06)]">
          <Dot id={id} size={24} />
          {nickOf(members, id)}
        </span>
      ))}
    </div>
  );
}

export function SectionTitle({ children, action, onAction }) {
  return (
    <h2 className="mb-3 mt-9 flex items-center justify-between text-[19px] font-bold leading-[1.4] text-ink">
      <span>{children}</span>
      {action && (
        <button className="text-[14px] font-medium text-ink-soft" onClick={onAction}>{action} ›</button>
      )}
    </h2>
  );
}

export function Notice({ children }) {
  return <div className="my-2 rounded-2xl bg-blue-soft px-4 py-3 text-[14px] leading-[1.5] text-blue-deep">{children}</div>;
}

export function Empty({ children }) {
  return (
    <div className="rounded-[20px] bg-card px-5 py-7 text-center text-[14.5px] text-ink-soft">
      {children}
    </div>
  );
}

export function Pill({ coral, children }) {
  return (
    <span className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[12px] font-semibold ${coral ? "bg-red-soft text-red" : "bg-blue-soft text-blue-deep"}`}>
      {children}
    </span>
  );
}

export function MonthLabel({ children }) {
  return <div className="mb-2 mt-6 px-1 text-[15px] font-semibold text-ink-soft">{children}</div>;
}

export function Waves() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => {
      const w = c.clientWidth, h = c.clientHeight, r = window.devicePixelRatio || 1;
      if (!w) return;
      c.width = w * r;
      c.height = h * r;
      const g = c.getContext("2d");
      g.setTransform(r, 0, 0, r, 0, 0);
      g.fillStyle = "#fff";
      [[10, 0.035, 0], [18, 0.05, 2]].forEach(([y, f, ph]) => {
        g.beginPath();
        g.moveTo(0, h);
        for (let x = 0; x <= w; x += 4) g.lineTo(x, y + Math.sin(x * f + ph) * 5);
        g.lineTo(w, h);
        g.closePath();
        g.globalAlpha = 0.14;
        g.fill();
      });
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);
  return <canvas ref={ref} className="pointer-events-none absolute inset-x-0 bottom-0 h-[46px] w-full" />;
}

export function EventRow({ e }) {
  const { photos, openSheet } = useApp();
  const past = isPast(e);
  const d = parseD(e.date);
  const n = photos.filter(p => p.eventId === e.id).length;
  const meta = [fmtTime(e.time), e.place, e.menu ? "🍽 " + e.menu : "", e.with ? "with " + e.with : ""]
    .filter(Boolean).join(" · ");

  return (
    <button
      className="flex w-full items-center gap-4 bg-transparent px-5 py-4 text-left active:bg-page"
      onClick={() => openSheet({ type: "event", id: e.id })}
    >
      <div className={`w-11 flex-none text-center tabular-nums ${past ? "text-ink-mute" : "text-blue"}`}>
        {d ? (
          <>
            <b className="block text-[22px] font-bold leading-[1.1]">{d.getDate()}</b>
            <span className="text-[12px] font-medium">{d.getMonth() + 1}월 {WD[d.getDay()]}</span>
          </>
        ) : (
          <>
            <b className="block text-[22px] font-bold leading-[1.1] text-ink-mute">?</b>
            <span className="text-[12px] font-medium text-ink-mute">미정</span>
          </>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-[16px] font-semibold text-ink">
          <span className="[overflow-wrap:anywhere]">{e.emoji || ""} {e.title || "제목 없음"}</span>
          {past && <Pill coral>추억</Pill>}
        </div>
        {meta && <div className="mt-0.5 break-words text-[13px] text-ink-soft [overflow-wrap:anywhere]">{meta}</div>}
      </div>
      {n > 0 && <span className="flex flex-none items-center gap-1 text-[13px] text-ink-soft">📷 {n}</span>}
    </button>
  );
}

export function PhotoTile({ p }) {
  const { openLightbox } = useApp();
  const src = useAssetSrc(p.asset);
  const [broken, setBroken] = useState(false);
  const missing = broken || src === null;
  return (
    <button
      className="relative aspect-square overflow-hidden rounded-xl border-0 bg-page p-0"
      onClick={() => openLightbox(p.id)}
      aria-label="사진 크게 보기"
    >
      {missing ? (
        <span className="absolute inset-0 grid place-items-center p-1.5 text-center text-[12px] text-ink-soft">
          사진을 불러올 수 없어요
        </span>
      ) : src ? (
        <img
          className="h-full w-full object-cover"
          src={src}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : null}
    </button>
  );
}

export function PhotoGrid({ list }) {
  return <div className="grid grid-cols-3 gap-2">{list.map(p => <PhotoTile key={p.id} p={p} />)}</div>;
}

/* compact: 홈 화면처럼 보기만 하는 자리에서는 버튼을 숨겨요 */
export function TripCard({ x, compact = false }) {
  const { members, canWrite, openSheet, saveTrip } = useApp();
  const who = x.proposedBy
    ? nickOf(members, x.proposedBy) + "의 바람"
    : x.proposedName ? x.proposedName + "의 바람" : "";
  const sub = [x.when, who].filter(Boolean).join(" · ") || (x.status === "planned" ? "시기 미정" : "언젠가");

  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-card px-4 py-3.5">
      <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-page text-[22px] leading-none">
        {x.emoji || "🚅"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[16px] font-bold text-ink">{x.name}</div>
        <div className="truncate text-[13px] text-ink-soft">{sub}</div>
        {x.memo && <div className="mt-0.5 truncate text-[13px] text-ink">{x.memo}</div>}
      </div>
      {canWrite && !compact && (
        <div className="flex flex-none items-center gap-1.5">
          {x.status !== "planned" ? (
            <button
              className="rounded-full bg-blue px-2.5 py-1 text-[12.5px] font-semibold text-white"
              onClick={() => saveTrip(x.id, { status: "planned" })}
            >
              확정
            </button>
          ) : (
            <button
              className="rounded-full bg-page px-2.5 py-1 text-[12.5px] font-semibold text-ink-soft"
              onClick={() => saveTrip(x.id, { status: "wish" })}
            >
              보류
            </button>
          )}
          <button
            className="rounded-full bg-page px-2.5 py-1 text-[12.5px] font-semibold text-ink-soft"
            onClick={() => openSheet({ type: "tripForm", id: x.id })}
          >
            수정
          </button>
        </div>
      )}
    </div>
  );
}
