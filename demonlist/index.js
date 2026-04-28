class LevelCache {
	constructor(ttlMs = 1000 * 60 * 60) {
		this.ttlMs = ttlMs;

		let cacheValues = localStorage.getItem("dwLevelCache");
		if (cacheValues) {
			cacheValues = JSON.parse(atob(cacheValues));
		}

		this.cache = cacheValues ?? {};
	}

	isExpired(entry) {
		return !entry || (Date.now() > entry.expiry);
	}

	updateLocalStorageCache() {
		localStorage.setItem("dwLevelCache", btoa(JSON.stringify(this.cache)));
	}

	async loadDemonData(id) {
		try {
			const response = await fetch(`https://api.tarylem.com/v1/demonlist/demons/${id}`);
			if (!response.ok) {
				throw new Error(`Response status: ${response.status}`);
			}

			const result = await response.json();

			this.cache[id] = {
				data: result,
				expiry: Date.now() + this.ttlMs
			};

			this.updateLocalStorageCache();

			return result;

		} catch (error) {
			console.error(error.message);
		}

		return null;
	}

	getLevelData(id) {
		const entry = this.cache[id];

		if (this.isExpired(entry)) {
			delete this.cache[id];
			this.updateLocalStorageCache();
			return null;
		}

		return entry.data;
	}
}

const router = new HashRouter("#content");

const levelCache = new LevelCache();

const demonListState = {
	cursor: null,
	isLoading: false,
	hasMore: true,
	selectedLevelId: null
};

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

function toggleItemView(show = false) {
	const itemView = document.getElementById("itemView");
	if (itemView) {
		let display = show == null ? null : (show == true ? "block" : "none");
		if (!display) {
			display = itemView.style.display == "block" ? "none" : "block";
		}
		itemView.style.display = display;
	}
}

function loadItemView(itemViewTemplateId) {
	const itemView = document.getElementById("itemViewContainer");
	const itemViewCurrentView = itemView.getAttribute("data-view");
	itemView.innerHTML = "";

	if (itemViewTemplateId != null) {
		const template = document.getElementById(itemViewTemplateId);
		const node = template.content.cloneNode(true);
		itemView.append(node);
		itemView.setAttribute("data-view", itemViewTemplateId);

	} else {
		itemView.removeAttribute("data-view");
	}

	return itemView;
}

async function loadView(levelId) {
	const itemView = document.getElementById("itemViewContainer");
	const itemViewCurrentView = itemView.getAttribute("data-view");

	var root = loadItemView("levelViewTemplate");

	var response = levelCache.getLevelData(levelId);
	if (!response) {
		response = await levelCache.loadDemonData(levelId);
		if (!response) return;
	};

	const result = response["result"];

	// MOBILE ACTIONS

	const levelViewCloseButton = root.querySelector("#levelViewMobileActions .close-button");
	levelViewCloseButton.addEventListener("click", () => {
		toggleItemView(false);
	});

	// LEVEL VIEW HEADER

	const levelViewThumbnail = root.querySelector("#levelViewHeader .level-video-container .level-video");
	loadVideoIFrame(levelViewThumbnail, getVideoData(result["level"]["videoProofUrl"]));

	const levelTitle = root.querySelector("#levelViewHeader .level-title");
	levelTitle.innerText = result["level"]["name"];

	const levelPublisher = root.querySelector("#levelViewHeader .level-contributors .level-publisher");
	levelPublisher.innerText = result["level"]["publisherUsername"];

	const levelInfoPills = root.querySelector("#levelViewHeader .level-info-pills");
	levelInfoPills.innerHTML = "";

	const difficultyReadable = String(splitCamelCase(result["level"]["difficulty"]));
	const difficultyPill = document.createElement("span");
	difficultyPill.className = `pill ${difficultyReadable.toLowerCase().replace(" ", "-")}`
	difficultyPill.innerText = difficultyReadable;
	levelInfoPills.append(difficultyPill);

	const ratingPill = document.createElement("span");
	ratingPill.className = `pill ${result["level"]["rating"].toLowerCase()}-rate`
	ratingPill.innerText = `${result["level"]["rating"]} Rate`;
	levelInfoPills.append(ratingPill);

	const levelCreatorsString = result["level"]["creators"]
		.map(c => c["creatorName"])
		.join(", ");

	const levelCreators = root.querySelector("#levelViewHeader .level-info-grid .level-creators");
	levelCreators.innerText = levelCreatorsString;

	const levelVerifier = root.querySelector("#levelViewHeader .level-info-grid .level-verifier");
	levelVerifier.innerText = result["level"]["verifierUsername"];

	const date = new Date(result["level"]["createdAt"] * 1000);
	const levelUploadDate = root.querySelector("#levelViewHeader .level-info-grid .level-upload-date");
	levelUploadDate.innerText = getDateStringFromDate(date);

	const levelSong = root.querySelector("#levelViewHeader .level-info-grid .level-song");
	levelSong.innerText = result["level"]["songName"];

	const copyLevelIdButton = root.querySelector("#copyLevelIdButton");
	const copyLevelIdButtonSpan = root.querySelector("#copyLevelIdButton span");
	copyLevelIdButton.addEventListener("click", () => {
		navigator.clipboard.writeText(String(levelId)).then(() => {
			copyLevelIdButtonSpan.innerText = "Copied!";
			setTimeout(() => {
				copyLevelIdButtonSpan.innerText = "Copy Level ID";
			}, 750);

		}).catch(err => {
			copyLevelIdButtonSpan.innerText = "Failed to copy!";
			setTimeout(() => {
				copyLevelIdButtonSpan.innerText = "Copy Level ID";
			}, 750);
		});
	});

	const submitRecordButton = root.querySelector("#submitRecordButton");
	submitRecordButton.href = `#submit/${levelId}`;
	
	// LEVEL VIEW CONTENT

	const levelDownloads = root.querySelector("#levelViewContent .level-info-grid .level-downloads");
	levelDownloads.innerText = getCommaNumber(result["level"]["downloads"]);

	const levelLikes = root.querySelector("#levelViewContent .level-info-grid .level-likes");
	levelLikes.innerText = getCommaNumber(result["level"]["likes"]);

	const levelObjects = root.querySelector("#levelViewContent .level-info-grid .level-objects");
	levelObjects.innerText = getCommaNumber(result["level"]["objectCount"]);

	const levelCopy = root.querySelector("#levelViewContent .level-info-grid .level-copy");
	levelCopy.innerText = (result["level"]["isCopyable"] == 0 ? "Not Copyable" : (result["level"]["isCopyPasswordProtected"] == 1 ? "Copyable via Password" : "Freely Copyable"));

	const levelLength = root.querySelector("#levelViewContent .level-info-grid .level-length");
	levelLength.innerText = formatDuration(result["level"]["length"]);

	const levelVersion = root.querySelector("#levelViewContent .level-info-grid .level-version");
	levelVersion.innerText = getCommaNumber(result["level"]["version"]);

	const levelCopiedFrom = root.querySelector("#levelViewContent .level-info-grid .level-copied-from");
	levelCopiedFrom.innerText = result["level"]["copiedId"] == null ? "None" : result["level"]["copiedId"];

	const ldmsString = result["ldms"]
		.map(c => `${c["levelName"]} (${c["ldmLevelId"]})`)
		.join(", ");

	const levelLdms = root.querySelector("#levelViewContent .level-info-grid .level-ldms");
	levelLdms.innerText = result["ldms"].length == 0 ? "None" : ldmsString;

	// LEVEL VIEW RECORDS

	const recordRequirement = root.querySelector("#levelViewRecords .records-title .record-requirement");
	recordRequirement.innerText = `${result["level"]["percentage10thPoints"] ?? "100"}%`;

	const verifiedVictors = root.querySelector("#levelViewRecords .records-title .verified-victors");
	verifiedVictors.innerText = "0";

	const verifiedRecords = root.querySelector("#levelViewRecords .records-title .verified-records");
	verifiedRecords.innerText = "0";
}

function updateSelectedMainPageDemon() {
	const list = document.getElementById("demonsList");
	if (!list) return;

	const elements = list.querySelectorAll(".list-entry");
	elements.forEach((element) => {
		const rank = Number(element.getAttribute("data-rank"));
		const levelId = Number(element.getAttribute("data-id"));
		if ((levelId == demonListState.selectedLevelId) || (!demonListState.selectedLevelId && rank == 1)) {
			demonListState.selectedLevelId = levelId;
			element.classList.add("selected");
			loadView(levelId);

		} else {
			element.classList.remove("selected");
		}
	});
}

function loadDemons(response) {
	const levelEntryTemplate = document.getElementById("levelEntryTemplate");
	const list = document.getElementById("demonsList");
	if (!levelEntryTemplate || !list) return;

	const result = response["result"];
	result.forEach(async (element) => {
		const node = levelEntryTemplate.content.cloneNode(true);
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

		if ((element["levelId"] == demonListState.selectedLevelId) || (!demonListState.selectedLevelId && element["placementRank"] == 1)) {
			root.classList.add("selected");
			loadView(element["levelId"]);
		}

		root.addEventListener("click", () => {
			toggleItemView(true);
			window.location.href = `#demons/${element["levelId"]}`
		});

		list.appendChild(node);
	});
}

async function loadDemonsList() {
	if (demonListState.isLoading) return;
	if (!demonListState.hasMore) return;
	demonListState.isLoading = true;

	try {
		const cursor = demonListState.cursor;

		const response = await fetch(`https://api.tarylem.com/v1/demonlist/demons?limit=25${cursor ? `&cursor=${cursor}` : ""}`);
		if (!response.ok) {
			throw new Error(`Response status: ${response.status}`);
		}

		const result = await response.json();
		loadDemons(result)

		demonListState.cursor = result.nextCursor ?? null;
		demonListState.hasMore = !!result.nextCursor;

	} catch(error) {
		console.error(error.message);
		
	} finally {
		demonListState.isLoading = false;
	}
}

function initInfiniteScroll() {
	const list = document.getElementById("demonsList");
	if (!list) return;

	list.addEventListener("scroll", () => {
		const isAtBottom = list.scrollTop + list.clientHeight >= list.scrollHeight;
		if (isAtBottom) {
			loadDemonsList();
		}
	})
}

async function onLoadDemons(isReloaded, { id }) {
	const isTabFirstTime = onLoadMain(isReloaded, "demons");
	demonListState.selectedLevelId = id ? Number(id) : null;

	if (isTabFirstTime) {
		demonListState.cursor = null;
		demonListState.hasMore = true;

		await loadDemonsList();
		initInfiniteScroll();

	} else {
		updateSelectedMainPageDemon();
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

	loadItemView(null);
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

// Submit

router.add("submit", {
	template: "/demonlist/fragments/submit.html"
});

router.add("submit/:id", {
	template: "/demonlist/fragments/submit.html"
})

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