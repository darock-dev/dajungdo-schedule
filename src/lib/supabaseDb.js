/* Supabase 공유 저장소. 이 기기 저장소(localDb.js)와 같은 모양(collection / doc / add / update / set / delete / onSnapshot)이라
 * 나머지 앱 코드는 그대로 써요. 모든 문서는 docs 테이블 한 곳에 (col, id, data) 로 저장돼요. */
import { supabase, PHOTO_BUCKET } from "./supabase";
import { SEED_EVENTS, SEED_TRIPS, SEED_VERSION } from "./seed";

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

const check = ({ error }) => { if (error) throw error; };
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

async function fetchCol(col) {
  const { data, error } = await supabase.from("docs").select("id,data").eq("col", col);
  if (error) throw error;
  return data.map(r => ({ id: r.id, data: r.data }));
}

async function fetchOne(col, id) {
  const { data, error } = await supabase.from("docs").select("data").eq("col", col).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? data.data : null;
}

/* 변경이 생기면 해당 컬렉션을 다시 읽어요. (세 명이 쓰는 규모라 이 방식이면 충분해요) */
function subscribe(col, sort, cb) {
  let alive = true;
  const load = async () => {
    try {
      let rows = await fetchCol(col);
      if (sort) {
        rows = rows
          .filter(r => r.data[sort.field] !== undefined)
          .sort((a, b) => cmp(a.data[sort.field], b.data[sort.field]) * (sort.dir === "desc" ? -1 : 1));
      }
      if (alive) cb({ docs: rows.map(r => ({ id: r.id, data: () => r.data })), metadata: { fromCache: false } });
    } catch { /* 네트워크 오류면 다음 변경 때 다시 읽어요 */ }
  };
  load();
  const channel = supabase
    .channel("docs-" + col + "-" + newId())
    .on("postgres_changes", { event: "*", schema: "public", table: "docs" }, load)
    .subscribe();
  return () => {
    alive = false;
    supabase.removeChannel(channel);
  };
}

function collection(col) {
  return {
    orderBy(field, dir = "asc") {
      return { onSnapshot: cb => subscribe(col, { field, dir }, cb) };
    },
    onSnapshot: cb => subscribe(col, null, cb),
    async add(data) {
      const id = newId();
      check(await supabase.from("docs").insert({ col, id, data }));
      return { id };
    },
  };
}

function doc(path) {
  const [col, id] = path.split("/");
  return {
    async update(patch) {
      const cur = await fetchOne(col, id);
      if (!cur) throw { code: "not_found" };
      check(await supabase.from("docs").update({ data: { ...cur, ...patch } }).eq("col", col).eq("id", id));
    },
    async set(data) {
      check(await supabase.from("docs").upsert({ col, id, data }, { onConflict: "col,id" }));
    },
    async delete() {
      check(await supabase.from("docs").delete().eq("col", col).eq("id", id));
    },
  };
}

export const supabaseDb = { collection, doc };

/* 사진은 Storage 버킷에 올리고, asset 값은 "sb:경로" 형식으로 저장해요. */
export const SB_PREFIX = "sb:";

export const supabaseAssets = {
  async upload(blob) {
    const path = newId() + ".jpg";
    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: "image/jpeg" });
    if (error) throw error;
    return { id: SB_PREFIX + path };
  },
  async delete(asset) {
    const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([asset.slice(SB_PREFIX.length)]);
    if (error) throw error;
  },
};

export function supabaseAssetUrl(asset) {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(asset.slice(SB_PREFIX.length)).data.publicUrl;
}

/* 기본 데이터는 공유 저장소에 처음 한 번만 넣어요. 'meta' 표식 행이 이미 있으면 건너뛰어요. */
export async function seedSharedOnce() {
  const { error } = await supabase.from("docs").insert({ col: "meta", id: SEED_VERSION, data: {} });
  if (error) return; // 이미 넣었거나 실패: 다시 넣지 않아요
  const now = Date.now();
  const rows = [
    ...SEED_EVENTS.map(d => ({ col: "events", id: newId(), data: { ...d, reviews: {}, createdBy: null, createdAt: now } })),
    ...SEED_TRIPS.map(d => ({ col: "trips", id: newId(), data: { ...d, proposedBy: null, createdAt: now } })),
  ];
  await supabase.from("docs").insert(rows);
}
