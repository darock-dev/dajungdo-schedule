import { useEffect, useRef, useState } from "react";
import { useApp } from "../store/AppContext";
import { COLORS, EVENT_EMOJI, TRIP_EMOJI } from "../lib/constants";
import { fmtDate, fmtTime, dday, isPast } from "../lib/date";
import { nickOf } from "../lib/members";
import { Dot, Pill, PhotoGrid, SectionTitle, useAssetSrc } from "../components/common";

const input = "w-full rounded-2xl bg-page px-4 py-3.5 text-[16px] text-ink placeholder:text-ink-mute outline-none focus:ring-2 focus:ring-blue";
const label = "px-1 text-[14px] font-medium text-ink-soft";
const field = "mb-5 flex flex-col gap-2";
/* 색 클래스는 서로 겹치지 않게 각각 따로 써요 (겹치면 회색 배경이 이겨서 흰 글씨가 안 보여요) */
const btn = "rounded-2xl bg-page px-4 py-3.5 text-[15px] font-semibold text-ink";
const btnPrimary = "rounded-2xl bg-blue px-4 py-3.5 text-[15px] font-semibold text-white";
const btnDanger = "rounded-2xl bg-red-soft px-4 py-3.5 text-[15px] font-semibold text-red";
const block = "block w-full text-center";
const errCls = "min-h-[1em] px-1 text-[13px] text-red";

/* 3.5초 안에 한 번 더 누르면 삭제되는 2단계 확인 */
function useConfirm() {
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 3500);
    return () => clearTimeout(t);
  }, [confirm]);
  return [confirm, setConfirm];
}

function EmojiPicker({ list, value, onPick }) {
  return (
    <div className="flex flex-wrap gap-2">
      {list.map(x => (
        <button
          key={x}
          type="button"
          onClick={() => onPick(x)}
          aria-pressed={x === value}
          className={`h-12 w-12 rounded-2xl text-[22px] ${x === value ? "bg-blue-soft ring-2 ring-blue" : "bg-page"}`}
        >
          {x}
        </button>
      ))}
    </div>
  );
}

/* ---------- 시트 레이어 ---------- */
export function SheetLayer() {
  const { sheet, closeSheet } = useApp();
  if (!sheet) return null;

  if (sheet.type === "lightbox") return <Lightbox id={sheet.id} />;

  let body;
  if (sheet.type === "event") body = <EventSheet id={sheet.id} />;
  else if (sheet.type === "eventForm") body = <EventForm key={sheet.id || "new"} id={sheet.id} />;
  else if (sheet.type === "tripForm") body = <TripForm key={sheet.id || "new"} id={sheet.id} />;
  else body = <ProfileSheet first={sheet.first} />;

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-[rgba(25,31,40,.5)]"
      onClick={e => { if (e.target === e.currentTarget) closeSheet(); }}
    >
      <div role="dialog" aria-modal="true" className="relative max-h-[92%] w-full max-w-[520px] overflow-auto rounded-t-[28px] bg-card px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <button
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-page text-[14px] text-ink-soft"
          onClick={closeSheet}
          aria-label="닫기"
        >
          ✕
        </button>
        {body}
      </div>
    </div>
  );
}

/* ---------- 사진 크게 보기 ---------- */
function Lightbox({ id }) {
  const { photos, canWrite, members, sheet, setSheet, closeSheet, deletePhoto } = useApp();
  const p = photos.find(x => x.id === id);
  const src = useAssetSrc(p && p.asset);
  const [sure, setSure] = useState(false);
  const goBack = () => (sheet && sheet.back ? setSheet(sheet.back) : closeSheet());

  useEffect(() => { if (!p) goBack(); });

  if (!p) return null;

  const remove = async () => {
    if (!sure) { setSure(true); return; }
    if (await deletePhoto(p)) goBack();
  };

  return (
    <div
      className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-[rgba(25,31,40,.94)] p-5"
      onClick={e => { if (e.target === e.currentTarget) goBack(); }}
    >
      <button
        className="absolute right-4 top-[calc(14px+env(safe-area-inset-top))] grid h-10 w-10 place-items-center rounded-full bg-white/15 text-[15px] text-white"
        onClick={goBack}
        aria-label="닫기"
      >
        ✕
      </button>
      {src ? <img className="max-h-[78%] rounded-2xl" src={src} alt="" /> : <div className="text-[14px] text-white/70">불러오는 중…</div>}
      <div className="mt-4 flex items-center gap-2.5 text-[14px] text-white">
        <Dot id={p.by} size={24} />
        {nickOf(members, p.by)}님이 올린 사진
        {canWrite && (
          <button className={`${btnDanger} px-3 py-1.5 text-[13px]`} onClick={remove}>
            {sure ? "한 번 더 누르면 삭제" : "삭제"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- 일정 상세 ---------- */
function EventSheet({ id }) {
  const { events, photos, canWrite, uid, members, openSheet, closeSheet, deleteEvent, saveReview, conn, uploadPhotos, uploading } = useApp();
  const [confirm, setConfirm] = useConfirm();
  const [reviewSure, setReviewSure] = useConfirm();
  const reviewRef = useRef(null);
  const e = events.find(x => x.id === id);
  const [draft, setDraft] = useState("");
  const myReview = e && e.reviews ? e.reviews[uid] : null;

  useEffect(() => { setDraft(myReview ? myReview.text : ""); }, [myReview && myReview.text]);

  if (!e) return <h3 className="mb-2 mt-1 text-[22px] font-bold text-ink">삭제된 일정이에요</h3>;

  const evPhotos = photos.filter(p => p.eventId === e.id);
  const reviews = Object.entries(e.reviews || {}).filter(([, r]) => r && r.text);
  const n = dday(e.date);
  const dText = n !== null && n >= 0 ? ` · ${n === 0 ? "오늘!" : "D-" + n}` : "";
  const rows = [
    ["날짜", fmtDate(e.date) + dText],
    ["시간", fmtTime(e.time)],
    ["장소", e.place],
    ["메뉴", e.menu],
    ["함께", e.with],
    ["메모", e.memo],
  ].filter(r => r[1]);

  const remove = async () => {
    if (!confirm) { setConfirm(true); return; }
    if (await deleteEvent(e.id)) closeSheet();
  };

  const submitReview = async ev => {
    ev.preventDefault();
    await saveReview(e.id, draft.trim());
  };

  /* 내 후기 삭제: 한 번 누르면 확인, 한 번 더 누르면 지워요 */
  const removeReview = async () => {
    if (!reviewSure) { setReviewSure(true); return; }
    setDraft("");
    await saveReview(e.id, "");
  };

  return (
    <>
      <h3 className="mb-2 mt-1 text-[22px] font-bold leading-[1.35] text-ink">{e.emoji || ""} {e.title}</h3>
      {isPast(e) ? <Pill coral>추억</Pill> : <Pill>다가오는 일정</Pill>}

      <div className="my-4 rounded-[20px] bg-page px-4 py-1">
        {rows.map(([a, b]) => (
          <div key={a} className="flex gap-3 border-b border-line py-3 text-[15px] last:border-b-0">
            <span className="w-12 flex-none text-ink-soft">{a}</span>
            <span className="whitespace-pre-wrap text-ink [overflow-wrap:anywhere]">{b}</span>
          </div>
        ))}
      </div>

      {canWrite && (
        <div className="flex gap-2">
          <button className={`${btn} flex-1`} onClick={() => openSheet({ type: "eventForm", id: e.id })}>수정</button>
          <button className={`${btnDanger} flex-1`} onClick={remove}>
            {confirm ? "한 번 더 누르면 삭제돼요" : "삭제"}
          </button>
        </div>
      )}

      <SectionTitle>
        사진 {evPhotos.length > 0 && <span className="ml-1 text-[14px] font-medium text-ink-soft">{evPhotos.length}장</span>}
      </SectionTitle>
      {conn.assets ? (
        <div className="mb-3 flex items-center gap-3">
          <label className={`${btnPrimary} relative inline-flex cursor-pointer items-center gap-1.5 overflow-hidden`}>
            📷 사진 올리기
            <input
              type="file"
              accept="image/*"
              multiple
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              onChange={ev => {
                const files = [...ev.target.files];
                ev.target.value = "";
                uploadPhotos(files, e.id);
              }}
            />
          </label>
          <span className="text-[13px] text-ink-soft">
            {uploading ? `${uploading}장 올리는 중…` : "여러 장 한 번에 고를 수 있어요"}
          </span>
        </div>
      ) : canWrite ? (
        <p className="text-[13px] text-ink-soft">사진은 편집 권한이 있는 사람만 올릴 수 있어요.</p>
      ) : null}
      {evPhotos.length
        ? <PhotoGrid list={evPhotos} />
        : <div className="rounded-[20px] bg-page px-5 py-6 text-center text-[14px] text-ink-soft">{isPast(e) ? "그날 사진을 올려주세요." : "만난 뒤에 사진을 올리면 이 일정이 추억이 돼요."}</div>}

      <SectionTitle>한줄 후기</SectionTitle>
      {reviews.length ? reviews.map(([rid, r]) => (
        <div key={rid} className="flex items-start gap-3 py-2">
          <Dot id={rid} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[13px] text-ink-soft">
              <span>{nickOf(members, rid)}</span>
              {rid === uid && canWrite && (
                <span className="ml-auto flex gap-1">
                  <button
                    type="button"
                    className="rounded-full bg-page px-2.5 py-1 text-[12.5px] font-semibold text-ink-soft"
                    onClick={() => reviewRef.current && reviewRef.current.focus()}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    className={`rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${reviewSure ? "bg-red text-white" : "bg-red-soft text-red"}`}
                    onClick={removeReview}
                  >
                    {reviewSure ? "한 번 더 누르면 삭제" : "삭제"}
                  </button>
                </span>
              )}
            </div>
            <div className="mt-1 whitespace-pre-wrap rounded-2xl rounded-tl-md bg-page px-4 py-2.5 text-[15px] text-ink [overflow-wrap:anywhere]">{r.text}</div>
          </div>
        </div>
      )) : <p className="text-[14px] text-ink-soft">아직 후기가 없어요.</p>}

      {canWrite && uid && (
        <form className="mt-3 flex gap-2" onSubmit={submitReview}>
          <input
            ref={reviewRef}
            type="text"
            className={`${input} flex-1`}
            maxLength={120}
            placeholder={myReview ? "내 후기 고치기" : "오늘 어땠어?"}
            value={draft}
            onChange={ev => setDraft(ev.target.value)}
            aria-label="한줄 후기"
          />
          <button className={`${btnPrimary} flex-none`} type="submit">남기기</button>
        </form>
      )}
    </>
  );
}

/* ---------- 일정 추가/수정 ---------- */
function EventForm({ id }) {
  const { events, saveEvent, openSheet } = useApp();
  const e = (id && events.find(x => x.id === id)) || {};
  const [emoji, setEmoji] = useState(e.emoji || "🏠");
  const [title, setTitle] = useState(e.title || "");
  const [date, setDate] = useState(e.date || "");
  const [time, setTime] = useState(e.time || "");
  const [place, setPlace] = useState(e.place || "");
  const [menu, setMenu] = useState(e.menu || "");
  const [withWho, setWithWho] = useState(e.with || "");
  const [memo, setMemo] = useState(e.memo || "");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async ev => {
    ev.preventDefault();
    const t = title.trim();
    if (!t) { setErr("일정 이름을 적어주세요."); return; }
    setSaving(true);
    const newId = await saveEvent(id, {
      title: t, emoji, date: date.trim(), time: time.trim(), place: place.trim(),
      menu: menu.trim(), with: withWho.trim(), memo: memo.trim(),
    });
    setSaving(false);
    if (newId) openSheet({ type: "event", id: newId });
  };

  return (
    <>
      <h3 className="mb-5 mt-1 text-[22px] font-bold text-ink">{id ? "일정 수정" : "새 일정"}</h3>
      <form onSubmit={submit}>
        <div className={field}>
          <label className={label}>이모지</label>
          <EmojiPicker list={EVENT_EMOJI} value={emoji} onPick={setEmoji} />
        </div>
        <div className={field}>
          <label className={label} htmlFor="ev-title">무슨 일정?</label>
          <input id="ev-title" type="text" className={input} maxLength={60} placeholder="언제?" value={title} onChange={ev => { setTitle(ev.target.value); setErr(""); }} />
          <div className={errCls}>{err}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className={field}>
            <label className={label} htmlFor="ev-date">날짜 (비워두면 미정)</label>
            <input id="ev-date" type="date" className={input} value={date} onChange={ev => setDate(ev.target.value)} />
          </div>
          <div className={field}>
            <label className={label} htmlFor="ev-time">시간</label>
            <input id="ev-time" type="time" className={input} value={time} onChange={ev => setTime(ev.target.value)} />
          </div>
        </div>
        <div className={field}>
          <label className={label} htmlFor="ev-place">장소</label>
          <input id="ev-place" type="text" className={input} maxLength={60} placeholder="어디서?" value={place} onChange={ev => setPlace(ev.target.value)} />
        </div>
        <div className={field}>
          <label className={label} htmlFor="ev-menu">메뉴</label>
          <input id="ev-menu" type="text" className={input} maxLength={60} placeholder="뭐 먹을 거야?" value={menu} onChange={ev => setMenu(ev.target.value)} />
        </div>
        <div className={field}>
          <label className={label} htmlFor="ev-with">함께하는 사람</label>
          <input id="ev-with" type="text" className={input} maxLength={60} placeholder="누구와 함께해?" value={withWho} onChange={ev => setWithWho(ev.target.value)} />
        </div>
        <div className={field}>
          <label className={label} htmlFor="ev-memo">메모</label>
          <textarea id="ev-memo" className={`${input} min-h-[80px] resize-y`} maxLength={500} placeholder="준비물, 할 일 등" value={memo} onChange={ev => setMemo(ev.target.value)} />
        </div>
        <button className={`${btnPrimary} ${block} py-4`} type="submit" disabled={saving}>
          {id ? "저장" : "일정 추가"}
        </button>
      </form>
    </>
  );
}

/* ---------- 여행지 추가/수정 ---------- */
function TripForm({ id }) {
  const { trips, saveTrip, deleteTrip, closeSheet, setTab, tab } = useApp();
  const [confirm, setConfirm] = useConfirm();
  const x = (id && trips.find(t => t.id === id)) || {};
  const [emoji, setEmoji] = useState(x.emoji || "🌸");
  const [name, setName] = useState(x.name || "");
  const [status, setStatus] = useState(x.status === "planned" ? "planned" : "wish");
  const [when, setWhen] = useState(x.when || "");
  const [memo, setMemo] = useState(x.memo || "");
  const [err, setErr] = useState("");

  const submit = async ev => {
    ev.preventDefault();
    const n = name.trim();
    if (!n) { setErr("여행지 이름을 적어주세요."); return; }
    const ok = await saveTrip(id, { name: n, emoji, status, when: when.trim(), memo: memo.trim() });
    if (ok) {
      closeSheet();
      if (tab !== "trips") setTab("trips");
    }
  };

  const remove = async () => {
    if (!confirm) { setConfirm(true); return; }
    if (await deleteTrip(id)) closeSheet();
  };

  return (
    <>
      <h3 className="mb-5 mt-1 text-[22px] font-bold text-ink">{id ? "여행지 수정" : "가고 싶은 곳"}</h3>
      <form onSubmit={submit}>
        <div className={field}>
          <label className={label}>이모지</label>
          <EmojiPicker list={TRIP_EMOJI} value={emoji} onPick={setEmoji} />
        </div>
        <div className={field}>
          <label className={label} htmlFor="tr-name">어디?</label>
          <input id="tr-name" type="text" className={input} maxLength={40} placeholder="제주도" value={name} onChange={ev => { setName(ev.target.value); setErr(""); }} />
          <div className={errCls}>{err}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className={field}>
            <label className={label} htmlFor="tr-status">상태</label>
            <select id="tr-status" className={input} value={status} onChange={ev => setStatus(ev.target.value)}>
              <option value="wish">희망 여행지</option>
              <option value="planned">확정</option>
            </select>
          </div>
          <div className={field}>
            <label className={label} htmlFor="tr-when">언제?</label>
            <input id="tr-when" type="text" className={input} maxLength={30} placeholder="봄, 2027년 4월" value={when} onChange={ev => setWhen(ev.target.value)} />
          </div>
        </div>
        <div className={field}>
          <label className={label} htmlFor="tr-memo">메모</label>
          <textarea id="tr-memo" className={`${input} min-h-[80px] resize-y`} maxLength={300} placeholder="하고 싶은 것, 맛집" value={memo} onChange={ev => setMemo(ev.target.value)} />
        </div>
        <button className={`${btnPrimary} ${block} py-4`} type="submit">{id ? "저장" : "추가"}</button>
        {id && (
          <button className={`${btnDanger} ${block} mt-2 py-4`} type="button" onClick={remove}>
            {confirm ? "한 번 더 누르면 삭제돼요" : "삭제"}
          </button>
        )}
      </form>
    </>
  );
}

/* ---------- 내 프로필 ---------- */
function ProfileSheet({ first }) {
  const { members, uid, defaultColor, saveProfile, closeSheet } = useApp();
  const me = (uid && members[uid]) || {};
  const [nick, setNick] = useState(me.nick || "");
  const [color, setColor] = useState(me.color || defaultColor);
  const [err, setErr] = useState("");

  const submit = async ev => {
    ev.preventDefault();
    const n = nick.trim();
    if (!n) { setErr("닉네임을 적어주세요."); return; }
    if (!uid) return;
    if (await saveProfile(n, color)) closeSheet();
  };

  return (
    <>
      <h3 className="mb-1 mt-1 text-[22px] font-bold text-ink">{first ? "반가워요! 누구세요?" : "내 프로필"}</h3>
      <p className="text-[14px] text-ink-soft">일정, 사진, 후기에 이 이름과 색이 표시돼요.</p>
      <form onSubmit={submit} className="mt-5">
        <div className={field}>
          <label className={label} htmlFor="pf-nick">닉네임</label>
          <input id="pf-nick" type="text" className={input} maxLength={10} placeholder="땡콩" value={nick} onChange={ev => { setNick(ev.target.value); setErr(""); }} />
          <div className={errCls}>{err}</div>
        </div>
        <div className={field}>
          <label className={label}>내 색깔</label>
          <div className="flex gap-3">
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`색 ${c}`}
                aria-pressed={c === color}
                className={`h-10 w-10 rounded-full ring-offset-2 ${c === color ? "ring-2 ring-ink" : ""}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        <button className={`${btnPrimary} ${block} py-4`} type="submit">저장</button>
      </form>
    </>
  );
}
