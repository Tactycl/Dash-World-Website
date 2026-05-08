export class Cache {
	constructor(ttlMs = 1000 * 60 * 60) {
		this.ttlMs = ttlMs;

		let cacheValues = localStorage.getItem("dwDemonlistCache");
		if (cacheValues) {
			try {
				cacheValues = JSON.parse(atob(cacheValues));

			} catch {
				cacheValues = {};
			}
		}

		this.cache = cacheValues ?? {};
		this.pending = new Map();
		if (cacheValues) this.cleanup();

		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "hidden" && this.persistScheduled) {
				this.updateLocalStorageCache();
			}
		});
	}

	isExpired(entry) {
		return !entry || typeof entry.expiry !== "number" || Date.now() > entry.expiry;
	}

	getBucket(cacheKey) {
		return (this.cache[cacheKey] ??= {});
	}

	cleanup() {
		let changed = false;

		for (const cacheKey in this.cache) {
			const bucket = this.cache[cacheKey];
			for (const key in bucket) {
				if (this.isExpired(bucket[key])) {
					delete bucket[key];
					changed = true;
				}
			}
		}

		if (changed) this.updateLocalStorageCache();
	}

	updateLocalStorageCache() {
		try {
			localStorage.setItem("dwDemonlistCache", btoa(JSON.stringify(this.cache)));

		} catch (e) {
			this.cache = {};
			localStorage.removeItem("dwDemonlistCache");
		}
	}

	schedulePersist() {
		if (this.persistScheduled) return;
		this.persistScheduled = true;

		setTimeout(() => {
			this.updateLocalStorageCache();
			this.persistScheduled = false;
		}, 0);
	}

	insertIntoCache(cacheKey, key, value) {
		this.getBucket(cacheKey)[key] = value;
		this.schedulePersist();
	}

	getFromCache(cacheKey, key) {
		const bucket = this.cache[cacheKey];
		const entry = bucket?.[key];

		if (!entry) return null;
		if (this.isExpired(entry)) {
			if (bucket) {
				delete bucket[key];
				this.schedulePersist();
			}
			return null;
		}

		return entry.data;
	}

	async getOrFetch(cacheKey, key, fetchFn) {
		const cached = this.getFromCache(cacheKey, key);
		if (cached) return cached;

		const pendingKey = `${cacheKey}:${key}`;
		if (this.pending.has(pendingKey)) {
			return this.pending.get(pendingKey);
		}

		const promise = (async () => {
			try {
				const result = await fetchFn();

				this.insertIntoCache(cacheKey, key, {
					data: result,
					expiry: Date.now() + this.ttlMs
				});

				return result;

			} catch (error) {
				console.error(error.message);
				return null;

			} finally {
				this.pending.delete(pendingKey);
			}
		})();

		this.pending.set(pendingKey, promise);
		return promise;
	}

	async loadDemonData(id) {
		return this.getOrFetch("levels", id, async () => {
			const response = await fetch(`https://api.tarylem.com/v1/demonlist/demons/${id}`);
			if (!response.ok) {
				throw new Error(`Response status: ${response.status}`);
			}
			return response.json();
		});
	}

	async loadHistory(levelId, limit = 100, cursor = null) {
		const key = `${levelId}:${cursor ?? "start"}:${limit}`;
		return this.getOrFetch("history", key, async () => {
			const url = `https://api.tarylem.com/v1/demonlist/demons/${levelId}/history?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`;

			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`Response status: ${response.status}`);
			}

			return response.json();
		});
	}

	async loadRecords(levelId, limit = 100, cursor = null) {
		const key = `${levelId}:${cursor ?? "start"}:${limit}`;
		return this.getOrFetch("records", key, async () => {
			const url = `https://api.tarylem.com/v1/demonlist/demons/${levelId}/records?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`;

			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`Response status: ${response.status}`);
			}

			return response.json();
		});
	}

	async loadSelfRecords(sort = "desc", status = "all", limit = 100, cursor = null) {
		const key = `${sort}:${status}:${cursor ?? "start"}:${limit}`;
		return this.getOrFetch("selfRecords", key, async () => {
			const url = `https://api.tarylem.com/v1/demonlist/user/me/records?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}&sort=${sort}&status=${status}`;

			const response = await fetch(url, {
				credentials: "include",
			});
			if (!response.ok) {
				throw new Error(`Response status: ${response.status}`);
			}

			return response.json();
		});
	}

	getLevelData(id) {
		return this.getFromCache("levels", id);
	}
}