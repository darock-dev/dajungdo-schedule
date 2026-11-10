import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { COLORS } from "../lib/constants";
import { compress } from "../lib/image";
import { localDb, localUserId } from "../lib/localDb";
import { localAssets } from "../lib/localAssets";
import { supabase } from "../lib/supabase";
import { supabaseDb, supabaseAssets, seedSharedOnce } from "../lib/supabaseDb";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const NOT_LOADED = { members: false, events: false, trips: false, photos: false };

/* 주소 뒤에 ?guest 를 붙이면 게스트 모드예요. 버튼은 그대로 보이고, 눌렀을 때 읽기만 가능하다고 알려줘요. */
export const GUEST_MSG = "게스트 모드에선 읽기만 가능해요!";
const WRITE_SHEETS = ["eventForm", "tripForm", "profile"];
const isGuestUrl = () => {
  try { return new URLSearchParams(window.location.search).has("guest"); } catch { return false; }
};

/** 공유 저장소(있으면) 또는 이 기기 저장소에 쓰고, 실시간 목록을 한곳에서 관리해요. */
export function AppProvider({ children }) {
  const [conn, setConn] = useState({ db: null, assets: null, uid: null, canWrite: true, offline: false, mode: null, ready: false });
  const [members, setMembers] = useState({});
  const [events, setEvents] = useState([]);
  const [trips, setTrips] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loaded, setLoaded] = useState(NOT_LOADED);
  const [timedOut, setTimedOut] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [sheet, setSheet] = useState(null);
  const [tab, setTab] = useState("home");
  const [toastState, setToastState] = useState(null);
  const timers = useRef({ slow: null, toast: null });
  const onboarded = useRef(false);
  const [guest] = useState(isGuestUrl);

  const toast = useCallback(msg => {
    setToastState({ msg, key: Date.now() });
    clearTimeout(timers.current.toast);
    timers.current.toast = setTimeout(() => setToastState(null), 2600);
  }, []);

  /* ---------- 연결 & 실시간 구독 ---------- */
  useEffect(() => {
    let alive = true;
    const unsubs = [];

    (async () => {
      /* 로그인 없이 링크만 있으면 누구나 쓸 수 있어요. Supabase 키가 설정돼 있으면 공유 저장소를 쓰고, 없으면 이 기기에 저장해요. */
      const uid = localUserId();
      const shared = !!supabase;
      const next = shared
        ? { db: supabaseDb, assets: supabaseAssets, uid, canWrite: true, offline: false, mode: "shared", ready: true }
        : { db: localDb, assets: localAssets, uid, canWrite: true, offline: false, mode: "local", ready: true };
      setConn(next);
      if (shared) seedSharedOnce();
      const store = next.db;

      timers.current.slow = setTimeout(() => alive && setTimedOut(true), 10000);
      const done = key => setLoaded(l => ({ ...l, [key]: true }));
      const fail = e => {
        clearTimeout(timers.current.slow);
        setTimedOut(false);
        if (e && e.code === "revoked") setConn(c => ({ ...c, offline: true }));
      };

      unsubs.push(store.collection("members").onSnapshot(snap => {
        const m = {};
        snap.docs.forEach(d => { m[d.id] = d.data(); });
        setMembers(m);
        if (!snap.metadata.fromCache) done("members");
      }, fail));

      unsubs.push(store.collection("events").orderBy("date", "asc").onSnapshot(snap => {
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        if (!snap.metadata.fromCache) done("events");
      }, fail));

      unsubs.push(store.collection("trips").onSnapshot(snap => {
        setTrips(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        if (!snap.metadata.fromCache) done("trips");
      }, fail));

      unsubs.push(store.collection("photos").orderBy("createdAt", "desc").onSnapshot(snap => {
        setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        if (!snap.metadata.fromCache) done("photos");
      }, fail));
    })();

    return () => {
      alive = false;
      clearTimeout(timers.current.slow);
      unsubs.forEach(u => typeof u === "function" && u());
    };
  }, []);

  const uid = conn.uid;
  const canWrite = conn.canWrite;
  const allLoaded = Object.values(loaded).every(Boolean);
  const slow = timedOut && !allLoaded;

  /* 처음 들어왔는데 이름이 없으면 프로필부터 물어봐요 (한 번만) */
  useEffect(() => {
    if (!onboarded.current && !guest && loaded.members && uid && canWrite && !members[uid] && !sheet) {
      onboarded.current = true;
      setSheet({ type: "profile", first: true });
    }
  }, [loaded.members, members, uid, canWrite, sheet, guest]);

  /* 시트가 열려 있을 때 뒤 화면 스크롤 막기 + Esc로 닫기 */
  useEffect(() => { document.body.style.overflow = sheet ? "hidden" : ""; }, [sheet]);
  useEffect(() => {
    const onKey = e => {
      if (e.key !== "Escape") return;
      setSheet(s => (!s ? s : s.type === "lightbox" && s.back ? s.back : null));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- 쓰기 ---------- */
  const write = useCallback(async (fn, okMsg) => {
    if (guest) { window.alert(GUEST_MSG); return false; }
    try {
      await fn();
      if (okMsg) toast(okMsg);
      return true;
    } catch (e) {
      if (e && e.code === "invalid_argument") {
        setConn(c => ({ ...c, canWrite: false }));
        toast("이 계정은 보기만 할 수 있어요.");
      } else if (e && e.code === "quota_exceeded") toast("저장 공간이 가득 찼어요. 안 쓰는 항목을 지워주세요.");
      else toast("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return false;
    }
  }, [toast, guest]);

  const { db, assets } = conn;

  const saveEvent = async (id, data) => {
    if (!db) return null;
    let newId = id;
    const ok = await write(async () => {
      if (id) await db.doc("events/" + id).update(data);
      else {
        const r = await db.collection("events").add({ ...data, reviews: {}, createdBy: uid || null, createdAt: Date.now() });
        newId = r.id;
      }
    }, id ? "저장했어요." : "일정을 추가했어요.");
    return ok ? newId : null;
  };

  const deleteEvent = async id => {
    if (!db) return false;
    const ok = await write(() => db.doc("events/" + id).delete(), "일정을 삭제했어요.");
    if (ok) {
      for (const p of photos.filter(p => p.eventId === id)) {
        try {
          await db.doc("photos/" + p.id).delete();
          if (assets) await assets.delete(p.asset).catch(() => {});
        } catch { /* 한 장 실패해도 계속 */ }
      }
    }
    return ok;
  };

  const saveTrip = (id, data) => write(
    () => id
      ? db.doc("trips/" + id).update(data)
      : db.collection("trips").add({ ...data, proposedBy: uid || null, createdAt: Date.now() }),
    id ? "저장했어요." : "여행지를 추가했어요."
  );

  const deleteTrip = id => write(() => db.doc("trips/" + id).delete(), "여행지를 삭제했어요.");

  const saveProfile = (nick, color) => write(
    () => db.doc("members/" + uid).set({ nick, color, updatedAt: Date.now() }),
    "반가워요, " + nick + "!"
  );

  const saveReview = (eventId, text) => {
    const ev = events.find(x => x.id === eventId);
    if (!uid || !db || !ev) return;
    const reviews = ev.reviews || {};
    return write(
      () => db.doc("events/" + eventId).update({ reviews: { ...reviews, [uid]: { text, at: Date.now() } } }),
      text ? "후기를 남겼어요." : "후기를 지웠어요."
    );
  };

  const deletePhoto = async p => {
    if (!db) return false;
    const ok = await write(() => db.doc("photos/" + p.id).delete(), "사진을 삭제했어요.");
    if (ok && assets) assets.delete(p.asset).catch(() => {});
    return ok;
  };

  const uploadPhotos = async (files, eventId) => {
    if (!files.length) return;
    if (guest) { window.alert(GUEST_MSG); return; }
    if (!assets) { toast("사진은 편집 권한이 있는 사람만 올릴 수 있어요."); return; }
    setUploading(files.length);
    let ok = 0;
    for (const f of files) {
      try {
        const b = await compress(f);
        const r = await assets.upload(b, { type: "image/jpeg" });
        await db.collection("photos").add({ eventId, asset: r.id, by: uid || null, createdAt: Date.now() });
        ok++;
      } catch (e) {
        const c = e && e.code;
        toast(c === "decode" ? "이 사진은 읽을 수 없어요. 다른 사진을 골라주세요."
          : c === "too_large" ? "사진이 너무 커요 (20MB 이하만)."
          : c === "quota_or_state" || c === "quota_exceeded" ? "사진 저장 공간이 가득 찼어요."
          : c === "rate_limited" ? "잠시 후 다시 올려주세요."
          : "사진을 올리지 못했어요. 다시 시도해 주세요.");
      }
      setUploading(n => Math.max(0, n - 1));
    }
    if (ok) toast(`사진 ${ok}장을 올렸어요.`);
  };

  const openSheet = useCallback(s => {
    if (guest && WRITE_SHEETS.includes(s.type)) { window.alert(GUEST_MSG); return; }
    setSheet(s);
  }, [guest]);
  const closeSheet = useCallback(() => setSheet(null), []);
  const openLightbox = useCallback(id => setSheet(cur => ({ type: "lightbox", id, back: cur })), []);

  const value = {
    conn, uid, canWrite, guest, offline: conn.offline, mode: conn.mode,
    members, events, trips, photos,
    slow, uploading, toastState, toast,
    tab, setTab, sheet, setSheet, openSheet, closeSheet, openLightbox,
    write, saveEvent, deleteEvent, saveTrip, deleteTrip,
    saveProfile, saveReview, deletePhoto, uploadPhotos,
    defaultColor: COLORS[Object.keys(members).length % COLORS.length],
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
