const router = new HashRouter("#content");

function switchMainPageView(tabName) {
	const views = document.querySelectorAll(".list-view");

	views.forEach(view => {
		view.style.display = "none";
	});

	const active = document.getElementById(`${tabName}List`);
	if (active) active.style.display = "";

	return active;
}

function updateSelectedMainPageTab(tabName) {
	const listTabs = document.getElementById("listTabs");
	if (!listTabs) return;

	const buttons = listTabs.querySelectorAll(".list-tab-button");
	buttons.forEach((element) => {
		const dataTab = element.getAttribute("data-tab");
		element.classList.toggle(
			"selected",
			dataTab === tabName
		);
	});
}

function initMainPageTabButtons() {
	const listTabs = document.getElementById("listTabs");
	if (!listTabs) return;

	const buttons = listTabs.querySelectorAll(".list-tab-button");
	buttons.forEach((element) => {
		const dataTab = element.getAttribute("data-tab");
		element.addEventListener("click", () => {
			window.location.href = `#${dataTab}`;
		});
	});
}

function onLoadMain(isReloaded, tabName) {
	if (isReloaded) initMainPageTabButtons();
	updateSelectedMainPageTab(tabName);

	const activeView = switchMainPageView(tabName);
	if (!activeView) return false;

	if (!activeView.getAttribute("data-initialized")) {
		activeView.setAttribute("data-initialized", "true");
		return true;
	}

	return false;
}

function updateSelectedMainPageDemon(selectedLevelId) {
	const list = document.getElementById("demonsList");
	if (!list) return;

	const elements = list.querySelectorAll(".list-entry");
	elements.forEach((element) => {
		const rank = Number(element.getAttribute("data-rank"));
		const levelId = Number(element.getAttribute("data-id"));
		if ((selectedLevelId && levelId == selectedLevelId) || (!selectedLevelId && rank == 1)) {
			element.classList.add("selected");

		} else {
			element.classList.remove("selected");
		}
	});
}

function loadDemons(selectedLevelId, response) {
	const demonEntryTemplate = document.getElementById("demonEntryTemplate");
	const list = document.getElementById("demonsList");
	if (!demonEntryTemplate || !list) return;

	const result = response["result"];
	result.forEach(async (element) => {
		const node = demonEntryTemplate.content.cloneNode(true);
		const root = node.firstElementChild;

		const videoData = getVideoData(element["videoProofUrl"]);
		const thumbnailUrl = await getThumbnailLink(videoData);

		const levelRank = node.querySelector(".level-rank");
		levelRank.innerText = element["placementRank"];

		const levelName = node.querySelector(".level-name");
		levelName.innerText = element["levelName"];

		const levelDifficulty = node.querySelector(".level-difficulty");
		levelDifficulty.innerText = splitCamelCase(element["levelDifficulty"]);

		const levelPublisher = node.querySelector(".level-publisher");
		levelPublisher.innerText = element["publisherUsername"];

		const levelThumbnail = node.querySelector(".level-thumbnail");
		levelThumbnail.src = thumbnailUrl;

		root.style.order = element["placementRank"];
		root.setAttribute("data-id", element["levelId"]);
		root.setAttribute("data-publisher-id", element["publisherId"]);
		root.setAttribute("data-rank", element["placementRank"]);
		root.setAttribute("data-created", element["createdAt"]);

		if ((selectedLevelId && element["levelId"] == selectedLevelId) || (!selectedLevelId && element["placementRank"] == 1)) {
			root.classList.add("selected");
		}

		root.addEventListener("click", () => {
			window.location.href = `#demons/${element["levelId"]}`
		});

		list.appendChild(node);
	});
}

async function loadDemonsList(selectedLevelId, cursor) {
	try {
		const demonsResponse = await fetch(`https://api.tarylem.com/v1/demonlist/demons?limit=75${cursor ? `&cursor=${cursor}` : ""}`);
		if (!demonsResponse.ok) {
			throw new Error(`Response status: ${demonsResponse.status}`);
		}

		const result = await demonsResponse.json();
		loadDemons(selectedLevelId, result)

	} catch(error) {
		console.error(error.message);
	}
}

async function onLoadDemons(isReloaded, { id }) {
	const isTabFirstTime = onLoadMain(isReloaded, "demons");
	
	const selectedLevelId = id ? Number(id) : null;
	if (isTabFirstTime) {
		loadDemonsList(selectedLevelId);

	} else {
		updateSelectedMainPageDemon(selectedLevelId)
	}
}

function onLoadLeaderboard(isReloaded, { id }) {
	const isTabFirstTime = onLoadMain(isReloaded, "leaderboard");

	//const playerId = id ? Number(id) : null;
	const list = document.getElementById("leaderboardList");
	if (list && isTabFirstTime) {
		const title = document.createElement("h2");
		title.innerText = "This page is currently under construction!";
		title.id = "errorRouterNotification";
		list.appendChild(title);
	}
}

// Demons
router.add("/", {
	template: "/demonlist/fragments/main.html",
	onLoad: onLoadDemons
});

router.add("demons", {
	template: "/demonlist/fragments/main.html",
	onLoad: onLoadDemons
});

router.add("demons/:id", {
	template: "/demonlist/fragments/main.html",
	onLoad: onLoadDemons
});

// Leaderboard
router.add("leaderboard", {
	template: "/demonlist/fragments/main.html",
	onLoad: onLoadLeaderboard
});

router.add("leaderboard/:id", {
	template: "/demonlist/fragments/main.html",
	onLoad: onLoadLeaderboard
});


// Other
router.add("terms", {
	template: "/demonlist/fragments/terms.html",
});

router.add("privacy", {
	template: "/demonlist/fragments/privacy.html",
});

router.add("login", {
	template: "/demonlist/fragments/login.html",
});