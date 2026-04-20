interface CacheRecord<T> {
	key: string;
	indexVersion: string;
	value: T;
	storedAt: number;
}

const DB_NAME = 'etso-texoro-search-cache';
const DB_VERSION = 1;
const JSON_STORE = 'json';
const TEXT_STORE = 'texts';

const openDatabase = async (): Promise<IDBDatabase | null> => {
	if (typeof indexedDB === 'undefined') return null;

	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onerror = () => reject(request.error ?? new Error('IndexedDB open error'));
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(JSON_STORE)) {
				db.createObjectStore(JSON_STORE, { keyPath: 'key' });
			}
			if (!db.objectStoreNames.contains(TEXT_STORE)) {
				db.createObjectStore(TEXT_STORE, { keyPath: 'key' });
			}
		};
		request.onsuccess = () => resolve(request.result);
	});
};

const txDone = async (tx: IDBTransaction): Promise<void> =>
	new Promise((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
		tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
	});

export class IndexedDbCache {
	#dbPromise: Promise<IDBDatabase | null>;

	constructor() {
		this.#dbPromise = openDatabase();
	}

	async getJson<T>(key: string, indexVersion: string): Promise<T | null> {
		const db = await this.#dbPromise;
		if (!db) return null;
		return new Promise((resolve, reject) => {
			const tx = db.transaction(JSON_STORE, 'readonly');
			const store = tx.objectStore(JSON_STORE);
			const request = store.get(key);
			request.onerror = () => reject(request.error ?? new Error('IndexedDB read error'));
			request.onsuccess = () => {
				const record = request.result as CacheRecord<T> | undefined;
				if (!record || record.indexVersion !== indexVersion) {
					resolve(null);
					return;
				}
				resolve(record.value);
			};
		});
	}

	async setJson<T>(key: string, indexVersion: string, value: T): Promise<void> {
		const db = await this.#dbPromise;
		if (!db) return;
		const tx = db.transaction(JSON_STORE, 'readwrite');
		tx.objectStore(JSON_STORE).put({
			key,
			indexVersion,
			value,
			storedAt: Date.now()
		} as CacheRecord<T>);
		await txDone(tx);
	}

	async getText(key: string, indexVersion: string): Promise<string | null> {
		const db = await this.#dbPromise;
		if (!db) return null;
		return new Promise((resolve, reject) => {
			const tx = db.transaction(TEXT_STORE, 'readonly');
			const store = tx.objectStore(TEXT_STORE);
			const request = store.get(key);
			request.onerror = () => reject(request.error ?? new Error('IndexedDB read error'));
			request.onsuccess = () => {
				const record = request.result as CacheRecord<string> | undefined;
				if (!record || record.indexVersion !== indexVersion) {
					resolve(null);
					return;
				}
				resolve(record.value);
			};
		});
	}

	async setText(key: string, indexVersion: string, value: string): Promise<void> {
		const db = await this.#dbPromise;
		if (!db) return;
		const tx = db.transaction(TEXT_STORE, 'readwrite');
		tx.objectStore(TEXT_STORE).put({
			key,
			indexVersion,
			value,
			storedAt: Date.now()
		} as CacheRecord<string>);
		await txDone(tx);
	}

	async clearMismatchedVersion(currentVersion: string): Promise<void> {
		const db = await this.#dbPromise;
		if (!db) return;

		for (const storeName of [JSON_STORE, TEXT_STORE]) {
			const tx = db.transaction(storeName, 'readwrite');
			const store = tx.objectStore(storeName);
			const request = store.openCursor();
			request.onsuccess = () => {
				const cursor = request.result;
				if (!cursor) return;
				const value = cursor.value as CacheRecord<unknown>;
				if (value.indexVersion !== currentVersion) {
					cursor.delete();
				}
				cursor.continue();
			};
			await txDone(tx);
		}
	}
}
