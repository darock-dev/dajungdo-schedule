/* 로그인하지 않은 사람을 위한 이 기기(브라우저) 저장소.
 * 공유 DB와 같은 모양(collection / doc / add / update / set / delete / onSnapshot)을 흉내 내서
 * 나머지 앱 코드는 바뀌지 않아요. 데이터는 localStorage에 저장돼요. */

import { SEED_EVENTS, SEED_TRIPS, SEED_VERSION } from "./seed";

const KEY = "dajungdo:data:v1";
const UID_KEY = "dajungdo:uid";
const COLS = ["members", "events", "trips", "photos"];

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return Object.fromEntries(COLS.map(c => [c, raw[c] && typeof raw[c] === "object" ? raw[c] : {}]));
  } catch {
    return Object.fromEntries(COLS.map(c => [c, {}]));
  }
}

let state = read();
const listeners = new Set();

/* 저장에 성공했을 때만 상태를 바꾸고, 바뀐 걸 구독자에게 알려요. 용량이 넘치면 quota_exceeded를 던져요. */
function commit(next) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    throw { code: "quota_exceeded" };
  }
  state = next;
  listeners.forEach(fn => fn());
}

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function subscribe(col, sort, cb) {
  const run = () => {
    let rows = Object.entries(state[col]).map(([id, data]) => ({ id, data }));
    if (sort) {
      rows = rows
        .filter(r => r.data[sort.field] !== undefined)
        .sort((a, b) => cmp(a.data[sort.field], b.data[sort.field]) * (sort.dir === "desc" ? -1 : 1));
    }
    cb({ docs: rows.map(r => ({ id: r.id, data: () => r.data })), metadata: { fromCache: false } });
  };
  listeners.add(run);
  run();
  return () => listeners.delete(run);
}

function collection(col) {
  return {
    orderBy(field, dir = "asc") {
      return { onSnapshot: cb => subscribe(col, { field, dir }, cb) };
    },
    onSnapshot: cb => subscribe(col, null, cb),
    async add(data) {
      const id = newId();
      commit({ ...state, [col]: { ...state[col], [id]: data } });
      return { id };
    },
  };
}

function doc(path) {
  const [col, id] = path.split("/");
  return {
    async update(patch) {
      if (!state[col][id]) throw { code: "not_found" };
      commit({ ...state, [col]: { ...state[col], [id]: { ...state[col][id], ...patch } } });
    },
    async set(data) {
      commit({ ...state, [col]: { ...state[col], [id]: data } });
    },
    async delete() {
      const rest = { ...state[col] };
      delete rest[id];
      commit({ ...state, [col]: rest });
    },
  };
}

export const localDb = { collection, doc };

/* 로그인하지 않은 사람에게 기기마다 하나씩 주는 임시 아이디 */
export function localUserId() {
  let id = localStorage.getItem(UID_KEY);
  if (!id) {
    id = "local-" + newId();
    localStorage.setItem(UID_KEY, id);
  }
  return id;
}

/* 기본 데이터는 이 기기에서 처음 한 번만 넣어요. 나중에 지운 항목은 다시 생기지 않아요. */
if (!localStorage.getItem(SEED_VERSION)) {
  const rows = (list, extra) => Object.fromEntries(list.map(r => [newId(), { ...r, ...extra(r) }]));
  const now = Date.now();
  commit({
    ...state,
    events: { ...state.events, ...rows(SEED_EVENTS, () => ({ reviews: {}, createdBy: null, createdAt: now })) },
    trips: { ...state.trips, ...rows(SEED_TRIPS, () => ({ proposedBy: null, createdAt: now })) },
  });
  localStorage.setItem(SEED_VERSION, "1");
}
