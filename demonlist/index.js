const router = new HashRouter("#content");

function onLoadDemons({ id }) {
	const levelId = id ? Number(id) : null;
}

router.add("/", {
	template: "/demonlist/fragments/demons.html",
	onLoad: onLoadDemons
});

router.add("demons", {
	template: "/demonlist/fragments/demons.html",
	onLoad: onLoadDemons
});

router.add("demons/:id", {
	template: "/demonlist/fragments/demons.html",
	onLoad: onLoadDemons
});

router.add("terms", {
	template: "/demonlist/fragments/terms.html",
});

router.add("privacy", {
	template: "/demonlist/fragments/privacy.html",
});

router.add("login", {
	template: "/demonlist/fragments/login.html",
});