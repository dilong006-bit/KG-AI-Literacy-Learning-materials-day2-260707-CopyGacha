/**
 * 이력 저장소 (F10 / PRD §5.3).
 * 기본: IndexedDB (대량·비동기 I/O). 미지원/차단(사생활 보호 모드 등) 시 LocalStorage로 폴백.
 * 모든 API는 Promise를 반환해 호출부가 저장 방식과 무관하게 동작한다.
 */
const DB_NAME = 'headline-roulette';
const DB_VERSION = 1;
const STORE = 'history';
const LS_FALLBACK_KEY = 'hr_history_fallback';

let dbPromise = null;
let useFallback = false;

const openDB = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('generatedAt', 'generatedAt');
        store.createIndex('formula', 'formula');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
  });

  return dbPromise;
};

// ---- LocalStorage 폴백 구현 ----
const lsReadAll = () => {
  try {
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};
const lsWriteAll = (list) => {
  localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(list));
};
// LocalStorage 폴백 업서트(id 기준 병합 저장)
const lsUpsert = (list) => {
  const map = new Map(lsReadAll().map((e) => [e.id, e]));
  list.forEach((e) => map.set(e.id, e));
  lsWriteAll([...map.values()]);
};

const withStore = async (mode, fn) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result;
    try {
      result = fn(store);
    } catch (err) {
      reject(err);
      return;
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
};

const sortDesc = (list) =>
  [...list].sort((a, b) => (a.generatedAt < b.generatedAt ? 1 : -1));

export const historyStore = {
  /** 모든 이력을 최신순으로 반환 */
  async getAll() {
    if (useFallback) return sortDesc(lsReadAll());
    try {
      const items = await withStore('readonly', (store) => {
        const acc = [];
        return new Promise((resolve, reject) => {
          const cursorReq = store.openCursor();
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor) {
              acc.push(cursor.value);
              cursor.continue();
            } else {
              resolve(acc);
            }
          };
          cursorReq.onerror = () => reject(cursorReq.error);
        });
      });
      return sortDesc(items);
    } catch {
      useFallback = true;
      return sortDesc(lsReadAll());
    }
  },

  /** 단건/다건 저장(업서트) */
  async put(entries) {
    const list = Array.isArray(entries) ? entries : [entries];
    if (useFallback) {
      lsUpsert(list);
      return;
    }
    try {
      await withStore('readwrite', (store) => list.forEach((e) => store.put(e)));
    } catch {
      useFallback = true;
      lsUpsert(list);
    }
  },

  /** 단건 삭제 */
  async remove(id) {
    if (useFallback) {
      lsWriteAll(lsReadAll().filter((e) => e.id !== id));
      return;
    }
    try {
      await withStore('readwrite', (store) => store.delete(id));
    } catch {
      useFallback = true;
      lsWriteAll(lsReadAll().filter((e) => e.id !== id));
    }
  },

  /** 전체 삭제 */
  async clear() {
    if (useFallback) {
      lsWriteAll([]);
      return;
    }
    try {
      await withStore('readwrite', (store) => store.clear());
    } catch {
      useFallback = true;
      lsWriteAll([]);
    }
  },
};
