import { useApp } from "../store/AppContext";
import { parseD, dday, fmtDate, fmtTime, todayStr } from "../lib/date";
import {
  Empty, EventRow, MemberChips, MonthLabel, PhotoGrid, SectionTitle, TripCard, Waves,
} from "../components/common";

const listBox = "overflow-hidden rounded-[20px] bg-card divide-y divide-line";

/* 홈 */
export function HomeView() {
  const { events, photos, trips, canWrite, offline, openSheet, setTab } = useApp();
  const t = todayStr();
  const upcoming = events.filter(e => e.date && e.date >= t);
  const next = upcoming[0];
  const rest = upcoming.slice(next ? 1 : 0, next ? 4 : 3);
  const planned = trips.filter(x => x.status === "planned");
  const canAdd = canWrite && !offline;

  return (
    <>
      <section className="relative overflow-hidden rounded-[20px] bg-blue px-5 py-4 text-white">
        {next ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[12.5px] font-medium opacity-85">다음 만남까지</div>
              <div className="mt-0.5 text-[26px] font-bold leading-none tabular-nums">
                {dday(next.date) === 0 ? "D-DAY" : "D-" + dday(next.date)}
              </div>
              <div className="mt-1.5 truncate text-[14px] font-semibold">{next.emoji || ""} {next.title}</div>
              <div className="truncate text-[12.5px] opacity-85">
                {fmtDate(next.date)}{next.time ? " · " + fmtTime(next.time) : ""}
              </div>
            </div>
            <button
              className="relative flex-none rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-blue-deep"
              onClick={() => openSheet({ type: "event", id: next.id })}
            >
              자세히 보기
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[12.5px] font-medium opacity-85">다음 만남까지</div>
              <div className="mt-0.5 text-[26px] font-bold leading-none">D-?</div>
              <div className="mt-1.5 text-[13px] opacity-85">아직 잡힌 약속이 없어요.</div>
            </div>
            {canAdd && (
              <button className="relative flex-none rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-blue-deep" onClick={() => openSheet({ type: "eventForm" })}>
                일정 추가
              </button>
            )}
          </div>
        )}
        <Waves />
      </section>

      <MemberChips />

      <SectionTitle action="전체 보기" onAction={() => setTab("schedule")}>다가오는 일정</SectionTitle>
      {rest.length ? (
        <div className={listBox}>
          {rest.map(e => <EventRow key={e.id} e={e} />)}
        </div>
      ) : (
        <Empty>{next ? "그다음 일정은 아직 없어요." : "새 일정을 추가하면 여기에 보여요."}</Empty>
      )}

      <SectionTitle action="앨범 보기" onAction={() => setTab("album")}>최근 추억</SectionTitle>
      {photos.length ? <PhotoGrid list={photos.slice(0, 6)} /> : <Empty>일정에 사진을 올리면 여기에 모여요.</Empty>}

      <SectionTitle action="여행 보기" onAction={() => setTab("trips")}>우리 여행</SectionTitle>
      {planned.length ? (
        <div className="flex flex-col gap-3">{planned.map(x => <TripCard key={x.id} x={x} compact />)}</div>
      ) : (
        <Empty>확정된 여행이 아직 없어요.</Empty>
      )}
    </>
  );
}

/* 일정 */
function groupByMonth(arr) {
  const g = new Map();
  arr.forEach(e => {
    const d = parseD(e.date);
    const k = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(e);
  });
  return [...g.entries()];
}

function MonthBlocks({ arr }) {
  return groupByMonth(arr).map(([k, list]) => (
    <div key={k}>
      <MonthLabel>{k}</MonthLabel>
      <div className={listBox}>
        {list.map(e => <EventRow key={e.id} e={e} />)}
      </div>
    </div>
  ));
}

export function ScheduleView() {
  const { events } = useApp();
  const t = todayStr();
  const up = events.filter(e => e.date && e.date >= t);
  const tbd = events.filter(e => !e.date);
  const past = events.filter(e => e.date && e.date < t).reverse();

  return (
    <>
      <SectionTitle>월별 일정</SectionTitle>
      {up.length ? <MonthBlocks arr={up} /> : <Empty>다가오는 일정이 없어요.</Empty>}
      {tbd.length > 0 && (
        <>
          <MonthLabel>날짜 미정</MonthLabel>
          <div className={listBox}>
            {tbd.map(e => <EventRow key={e.id} e={e} />)}
          </div>
        </>
      )}

      <SectionTitle>지난 추억</SectionTitle>
      {past.length ? <MonthBlocks arr={past} /> : <Empty>일정 날짜가 지나면 여기로 옮겨져 추억이 돼요.</Empty>}
    </>
  );
}

/* 여행 */
export function TripsView() {
  const { trips } = useApp();
  const planned = trips.filter(x => x.status === "planned");
  const wish = trips.filter(x => x.status !== "planned");

  return (
    <>
      <SectionTitle>우리 여행 어디가?</SectionTitle>
      <MonthLabel>확정</MonthLabel>
      {planned.length ? <div className="flex flex-col gap-3">{planned.map(x => <TripCard key={x.id} x={x} />)}</div> : <Empty>확정된 여행이 아직 없어요.</Empty>}
      <MonthLabel>희망 여행지</MonthLabel>
      {wish.length ? <div className="flex flex-col gap-3">{wish.map(x => <TripCard key={x.id} x={x} />)}</div> : <Empty>가고 싶은 곳을 추가해 보세요.</Empty>}
    </>
  );
}

/* 앨범 */
export function AlbumView() {
  const { photos, events } = useApp();
  if (!photos.length) {
    return (
      <>
        <SectionTitle>앨범</SectionTitle>
        <Empty>아직 사진이 없어요. 일정을 열고 사진을 올려보세요.</Empty>
      </>
    );
  }
  const evById = Object.fromEntries(events.map(e => [e.id, e]));
  const groups = new Map();
  photos.forEach(p => {
    const k = evById[p.eventId] ? p.eventId : "_etc";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  });
  const keys = [...groups.keys()].sort((a, b) =>
    ((evById[b] || {}).date || "").localeCompare((evById[a] || {}).date || ""));

  return (
    <>
      <SectionTitle>
        앨범 <span className="ml-1 text-[14px] font-medium text-ink-soft">사진 {photos.length}장</span>
      </SectionTitle>
      {keys.map(k => {
        const e = evById[k];
        return (
          <div key={k} className="mb-6">
            <div className="mb-2.5 flex items-baseline justify-between px-1 text-[15px] font-semibold text-ink">
              {e ? (
                <>
                  <span>{e.emoji || ""} {e.title}</span>
                  <span className="text-[13px] font-normal text-ink-soft">{fmtDate(e.date)}</span>
                </>
              ) : <span>기타</span>}
            </div>
            <PhotoGrid list={groups.get(k)} />
          </div>
        );
      })}
    </>
  );
}
