/* 로그인하지 않은 사람의 사진을 이 기기(IndexedDB)에 저장해요. */

const DB_NAME = "dajungdo-photos";
const STORE = "blobs";
export const LOCAL_PREFIX = "local:";

let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function run(mode, fn) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

const urlCache = new Map();

export const localAssets = {
  async upload(blob) {
    const id = LOCAL_PREFIX + (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
    await run("readwrite", s => s.put(blob, id));
    return { id };
  },
  async delete(id) {
    urlCache.delete(id);
    await run("readwrite", s => s.delete(id));
  },
};

/* 이 기기 사진의 화면용 주소. 없으면 null */
export function localAssetUrl(id) {
  if (!urlCache.has(id)) {
    urlCache.set(id, run("readonly", s => s.get(id)).then(b => (b ? URL.createObjectURL(b) : null)));
  }
  return urlCache.get(id);
}
