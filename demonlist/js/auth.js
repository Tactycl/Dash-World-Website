let currentUser = null;
let userPromise = null;

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

export async function loadUser() {
	if (userPromise) return userPromise;

	userPromise = (async () => {
		if (!document.cookie.includes("DEMONLIST_LOGGED_IN=1")) {
			return null;
		}

		try {
			const res = await fetch("https://api.tarylem.com/v1/demonlist/user/me", {
				credentials: "include"
			});

			if (!res.ok) return null;

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