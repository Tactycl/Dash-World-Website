let currentUser = null;
let userPromise = null;
let rulePromises = {};

export function tryLogin() {
	window.location.href = "https://api.tarylem.com/v1/demonlist/auth/login";
}

export async function requireAuth() {
	if (!document.cookie.includes("DEMONLIST_LOGGED_IN=1")) {
		window.location.href = "#error/200";
		return null;
	}

	try {
		const user = await loadUser();
		if (!user) {
			window.location.href = "#error/200";
			return null;
		}

		return user;

	} catch (e) {
		console.error(e);
	}

	return null;
}

export function isRuleRead(ruleType) {
	if (rulePromises[ruleType]) return rulePromises[ruleType];

	rulePromises[ruleType] = (async () => {
		try {
			const res = await fetch(`https://api.tarylem.com/v1/demonlist/rules/is-read/${ruleType}`, {
				credentials: "include"
			});
			if (!res.ok) {
				return null;
			}

			const data = await res.json();
			return data["result"]["isRead"];

		} catch {
			return false;
		}
	})();

	return rulePromises[ruleType];
}

export async function readRule(ruleType, ruleVersion) {
	try {
		const res = await fetch(`https://api.tarylem.com/v1/demonlist/rules/read/${ruleType}/${ruleVersion}`, {
			credentials: "include",
			method: "POST",
		});
		if (!res.ok) {
			return;
		}

		const data = await res.json();
		return data["result"] && data["result"]["ok"];

	} catch (e) {
		console.error("Failed to read rules:", e);
	}

	return false;
}

export function loadUser() {
	if (userPromise) return userPromise;

	userPromise = (async () => {
		if (!document.cookie.includes("DEMONLIST_LOGGED_IN=1")) {
			return null;
		}

		try {
			const res = await fetch("https://api.tarylem.com/v1/demonlist/user/me", {
				credentials: "include"
			});
			if (!res.ok) {
				return null;
			}

			const data = await res.json();
			currentUser = data.result;
			return currentUser;

		} catch {
			return null;
		}
	})();

	return userPromise;
}

export function getCurrentUser() {
	return currentUser;
}