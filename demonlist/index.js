import { HashRouter } from "./js/router.js";
import { Cache } from "./js/cache.js";
import { initComponents, setSelectValue } from "./js/components.js";
import { isRuleRead, readRule, requireAuth, loadUser, tryLogin } from "./js/auth.js";
import { submitForm, validateFormInput } from "./js/forms.js";
import { splitCamelCase, loadVideoIFrame, getDateStringFromDate, getCommaNumber, formatDuration, getVideoData, getThumbnailLink } from "./js/helpers.js";
import { createState } from "./js/state.js";
import { $, $$, el } from "./js/dom.js";

const router = new HashRouter("#content");
const cache = new Cache();

const NORMAL_LIST_LENGTH = 100;
const INFINITE_SCROLL_THRESHOLD = 200;
const INFINITE_SCROLL_COOLDOWN = 200;

const demonListState = createState({
	cursor: null,
	isLoading: false,
	hasMore: true,
	selectedLevelId: null
});

const levelInputState = createState({
	cursor: null,
	isLoading: false,
	hasMore: true
});

const historyState = createState({
	cursor: null,
	isLoading: false,
	hasMore: true,
	levelId: null
});

const recordsState = createState({
	cursor: null,
	isLoading: false,
	hasMore: true,
	levelId: null
});

const selfRecordsState = createState({
	cursor: null,
	isLoading: false,
	hasMore: true,
	sort: "desc",
	status: "all"
});

function switchMainPageView(tabName) {
	const views = $$(document, ".list-view");
	views.forEach(view => {
		view.style.display = "none";
	});

	const active = $(document, `#${tabName}List`);
	if (active) active.style.display = "";

	return active;
}

function updateSelectedMainPageTab(tabName) {
	const listTabs = $(document, "#listTabs");
	if (!listTabs) return;

	const buttons = $$(listTabs, ".list-tab-button");
	buttons.forEach((element) => {
		const dataTab = element.getAttribute("data-tab");
		element.classList.toggle(
			"selected",
			dataTab === tabName
		);
	});
}

function initMainPageTabButtons() {
	const listTabs = $(document, "#listTabs");
	if (!listTabs) return;

	const buttons = $$(listTabs, ".list-tab-button");
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

function appendEmptyTableRow(tbody, columnCount, text = "Nothing found.") {
	const row = document.createElement("tr");
	row.className = "separator";

	const cell = document.createElement("td");
	cell.colSpan = columnCount;
	cell.innerText = text;
	cell.className = "empty-table-entry";

	row.appendChild(cell);
	tbody.appendChild(row);
}

function appendHistoryRows(root, entries) {
	const tbody = $(root, "#levelViewHistory tbody");
	const template = $(document, "#levelPositionHistoryItem");

	if (!tbody || !template) return;

	entries.forEach(entry => {
		const node = template.content.cloneNode(true);
		const root = node.firstElementChild

		const date = new Date(entry["validFrom"]);

		$(node, ".history-date").innerText = getDateStringFromDate(date);
		$(node, ".history-placement").innerText = entry["placementRank"];

		var reason = "";
		var correspondingClass = "";
		switch (entry["reasonType"]) {
			case "added":
				reason = "Added to list";
				correspondingClass = "position-history-added";
				break;

			case "movedAbove":
				reason = "Moved";
				correspondingClass = "position-history-ascended";
				break;

			case "movedBelow":
				reason = "Moved";
				correspondingClass = "position-history-descended";
				break;

			case "otherAddedAbove":
				reason = `${entry["reasonLevelName"]} was added above`;
				correspondingClass = "position-history-descended";
				break;

			case "otherMovedAbove":
				reason = `${entry["reasonLevelName"]} was moved above`;
				correspondingClass = "position-history-descended";
				break;

			case "otherMovedBelow":
				reason = `${entry["reasonLevelName"]} was moved below`;
				correspondingClass = "position-history-ascended";
				break;
		}

		$(node, ".history-reason").innerText = reason;
		root.classList.add(correspondingClass);

		tbody.appendChild(node);
	});
}

async function loadHistoryPage(root) {
	if (historyState.get().isLoading || !historyState.get().hasMore) return;
	historyState.set({ isLoading: true });

	try {
		const res = await cache.loadHistory(
			historyState.get().levelId,
			100,
			historyState.get().cursor
		);

		if (!res) return;

		appendHistoryRows(root, res.result);

		historyState.set({
			cursor: res.nextCursor ?? null,
			hasMore: !!res.nextCursor,
		});

		$(root, "#levelViewHistory .level-table-load-more").style.display = historyState.get().hasMore ? "" : "none";

	} catch (e) {
		console.error(e.message);

	} finally {
		historyState.set({ isLoading: false });
	}
}

function appendRecordRows(root, entries) {
	const tbody = $(root, "#levelViewRecords tbody");
	const template = $(document, "#levelRecordItem");

	if (!tbody || !template) return;

	if (!entries || entries.length === 0) {
		appendEmptyTableRow(tbody, 3);
		return;
	}

	entries.forEach(entry => {
		const node = template.content.cloneNode(true);
		const row = node.querySelector("tr");

		const percentage = Number(entry["progress"]);
		const videoUrl = String(entry["videoUrl"]);

		$(node, ".record-username").innerText = entry["username"];
		$(node, ".record-avatar").src = entry["avatarUrl"];
		$(node, ".record-percentage").innerText = `${percentage}%`;
		$(node, ".record-proof-button").href = videoUrl;

		if (percentage >= 100) {
			row.classList.add("completed");
		}

		let iconName = null;
		if (videoUrl.toLowerCase().includes("youtube")) {
			iconName = "youtube"
		}

		const recordProofOriginImage = $(node, ".record-proof-origin");
		if (iconName) {
			recordProofOriginImage.src = `/img/${iconName}.svg`;

		} else {
			recordProofOriginImage.style.display = "none";
		}

		tbody.appendChild(node);
	});
}

async function loadRecordsPage(root) {
	if (recordsState.get().isLoading || !recordsState.get().hasMore) return;
	recordsState.set({ isLoading: true });

	try {
		const res = await cache.loadRecords(
			recordsState.get().levelId,
			100,
			recordsState.get().cursor
		);

		if (!res) return;

		appendRecordRows(root, res.result);

		recordsState.set({
			cursor: res.nextCursor ?? null,
			hasMore: !!res.nextCursor,
		});

		$(root, "#levelViewRecords .level-table-load-more").style.display =
			recordsState.get().hasMore ? "" : "none";

	} catch (e) {
		console.error(e.message);

	} finally {
		recordsState.set({ isLoading: false });
	}
}

function toggleItemView(show = false) {
	const itemView = $(document, "#itemView");
	if (itemView) {
		let display = show == null ? null : (show == true ? "block" : "none");
		if (!display) {
			display = itemView.style.display == "block" ? "none" : "block";
		}
		itemView.style.display = display;
	}
}

function loadItemView(itemViewTemplateId) {
	const itemView = $(document, "#itemViewContainer");
	const itemViewCurrentView = itemView.getAttribute("data-view");
	itemView.innerHTML = "";

	if (itemViewTemplateId != null) {
		const template = $(document, `#${itemViewTemplateId}`);
		const node = template.content.cloneNode(true);
		itemView.append(node);
		itemView.setAttribute("data-view", itemViewTemplateId);

	} else {
		itemView.removeAttribute("data-view");
	}

	return itemView;
}

async function loadView(levelId) {
	const root = loadItemView("levelViewTemplate");

	const response = await cache.loadDemonData(levelId);
	if (!response) return;

	const result = response["result"];

	// MOBILE ACTIONS

	$(root, "#levelViewMobileActions .close-button").addEventListener("click", () => {
		toggleItemView(false);
	});

	// LEVEL VIEW HEADER

	loadVideoIFrame($(root, "#levelViewHeader .level-video-container .level-video"), getVideoData(result["level"]["videoProofUrl"]));

	$(root, "#levelViewHeader .level-title").innerText = result["level"]["name"];
	$(root, "#levelViewHeader .level-contributors .level-publisher").innerText = result["level"]["publisherUsername"];

	const levelInfoPills = $(root, "#levelViewHeader .level-info-pills");
	levelInfoPills.innerHTML = "";

	const difficultyReadable = String(splitCamelCase(result["level"]["difficulty"]));
	levelInfoPills.append(el("span", `pill ${difficultyReadable.toLowerCase().replace(" ", "-")}`, difficultyReadable));
	levelInfoPills.append(el("span", `pill ${result["level"]["rating"].toLowerCase()}-rate`, `${result["level"]["rating"]} Rate`));

	$(root, "#levelViewHeader .info-grid .level-creators").innerText = result["level"]["creators"].map(c => c["creatorName"]).join(", ");
	$(root, "#levelViewHeader .info-grid .level-verifier").innerText = result["level"]["verifierUsername"];
	$(root, "#levelViewHeader .info-grid .level-upload-date").innerText = getDateStringFromDate(new Date(result["level"]["createdAt"] * 1000));
	$(root, "#levelViewHeader .info-grid .level-song").innerText = result["level"]["songName"];

	$(root, "#copyLevelIdButton").addEventListener("click", () => {
		const copyLevelIdButtonLabel = $(root, "#copyLevelIdButton span");
		navigator.clipboard.writeText(String(levelId)).then(() => {
			copyLevelIdButtonLabel.innerText = "Copied!";
			setTimeout(() => {
				copyLevelIdButtonLabel.innerText = "Copy Level ID";
			}, 750);

		}).catch(err => {
			copyLevelIdButtonLabel.innerText = "Failed to copy!";
			setTimeout(() => {
				copyLevelIdButtonLabel.innerText = "Copy Level ID";
			}, 750);
		});
	});

	const submitRecordButton = $(root, "#submitRecordButton");
	if (result["level"]["placementRank"] > NORMAL_LIST_LENGTH) {
		submitRecordButton.style.display = "none";

	} else {
		submitRecordButton.style.display = "";
		submitRecordButton.href = `#submit/record/${levelId}`;
	}
	
	// LEVEL VIEW CONTENT

	$(root, "#levelViewContent .info-grid .level-downloads").innerText = getCommaNumber(result["level"]["downloads"]);
	$(root, "#levelViewContent .info-grid .level-likes").innerText = getCommaNumber(result["level"]["likes"]);
	$(root, "#levelViewContent .info-grid .level-objects").innerText = getCommaNumber(result["level"]["objectCount"]);
	$(root, "#levelViewContent .info-grid .level-copy").innerText = (result["level"]["isCopyable"] == 0 ? "Not Copyable" : (result["level"]["isCopyPasswordProtected"] == 1 ? "Copyable via Password" : "Freely Copyable"));
	$(root, "#levelViewContent .info-grid .level-length").innerText = formatDuration(result["level"]["length"]);
	$(root, "#levelViewContent .info-grid .level-version").innerText = getCommaNumber(result["level"]["version"]);
	$(root, "#levelViewContent .info-grid .level-copied-from").innerText = result["level"]["copiedId"] == null ? "None" : result["level"]["copiedId"];
	$(root, "#levelViewContent .info-grid .level-ldms").innerText = result["ldms"].length == 0 ? "None" : result["ldms"].map(c => `${c["levelName"]} (${c["ldmLevelId"]})`).join(", ");

	// LEVEL VIEW RECORDS

	$(root, "#levelViewRecords .records-title .record-requirement").innerText = `${result["level"]["percentage10thPoints"] ?? "100"}%`;
	$(root, "#levelViewRecords .records-title .verified-victors").innerText = result["records"]["victors"] ?? "0";
	$(root, "#levelViewRecords .records-title .verified-records").innerText = result["records"]["count"] ?? "0";

	// HISTORY STATE

	historyState.set({
		cursor: null,
		hasMore: true,
		levelId: levelId,
	});
	$(root, "#levelViewHistory tbody").innerHTML = "";

	// RECORDS STATE

	recordsState.set({
		cursor: null,
		hasMore: true,
		levelId: levelId,
	});
	$(root, "#levelViewRecords tbody").innerHTML = "";

	// HISTORY

	await loadHistoryPage(root);
	$(root, "#levelViewHistory .load-more-button").addEventListener("click", () => {
		loadHistoryPage(root);
	});

	// RECORDS

	await loadRecordsPage(root);
	$(root, "#levelViewRecords .load-more-button").addEventListener("click", () => {
		loadRecordsPage(root);
	});
}

function updateSelectedMainPageDemon() {
	const elements = $$(document, "#demonsList .list-entry");
	elements.forEach((element) => {
		const rank = Number(element.getAttribute("data-rank"));
		const levelId = Number(element.getAttribute("data-id"));
		if ((levelId == demonListState.get().selectedLevelId) || (!demonListState.get().selectedLevelId && rank == 1)) {
			demonListState.set({ selectedLevelId: levelId });
			element.classList.add("selected");
			loadView(levelId);

		} else {
			element.classList.remove("selected");
		}
	});
}

function loadDemons(response) {
	const levelEntryTemplate = $(document, "#levelEntryTemplate");
	const list = $(document, "#demonsList");
	if (!levelEntryTemplate || !list) return;

	const result = response["result"];
	result.forEach(async (element) => {
		const node = levelEntryTemplate.content.cloneNode(true);
		const root = node.firstElementChild;

		const videoData = getVideoData(element["videoProofUrl"]);
		const thumbnailUrl = await getThumbnailLink(videoData);

		const levelRank = $(node, ".level-rank");
		levelRank.innerText = element["placementRank"];

		const levelName = $(node, ".level-name");
		levelName.innerText = element["levelName"];

		const levelDifficulty = $(node, ".level-difficulty");
		levelDifficulty.innerText = splitCamelCase(element["levelDifficulty"]);

		const levelPublisher = $(node, ".level-publisher");
		levelPublisher.innerText = element["publisherUsername"];

		const levelThumbnail = $(node, ".level-thumbnail");
		levelThumbnail.src = thumbnailUrl;

		const orderOffset = element["placementRank"] > NORMAL_LIST_LENGTH ? 1 : 0;
		root.style.order = element["placementRank"] + orderOffset;
		root.setAttribute("data-id", element["levelId"]);
		root.setAttribute("data-publisher-id", element["publisherId"]);
		root.setAttribute("data-rank", element["placementRank"]);
		root.setAttribute("data-created", element["createdAt"]);

		if ((element["levelId"] == demonListState.get().selectedLevelId) || (!demonListState.get().selectedLevelId && element["placementRank"] == 1)) {
			root.classList.add("selected");
			loadView(element["levelId"]);
		}

		if (element["placementRank"] == NORMAL_LIST_LENGTH + 1) {
			const legacyListTemplate = $(document, "#levelLegacyListItem");
			if (legacyListTemplate) {
				const legacyListNode = legacyListTemplate.content.cloneNode(true);
				const legacyListRoot = legacyListNode.firstElementChild;

				legacyListRoot.style.order = NORMAL_LIST_LENGTH + 1;

				list.appendChild(legacyListNode);
			}
		}

		root.addEventListener("click", () => {
			toggleItemView(true);
			window.location.href = `#demons/${element["levelId"]}`
		});

		list.appendChild(node);
	});
}

async function loadDemonsList() {
	if (demonListState.get().isLoading || !demonListState.get().hasMore) return;
	demonListState.set({ isLoading: true });

	try {
		const cursor = demonListState.get().cursor;

		const response = await fetch(`https://api.tarylem.com/v1/demonlist/demons?limit=100${cursor ? `&cursor=${cursor}` : ""}&includeLegacy=true`);
		if (!response.ok) {
			throw new Error(`Response status: ${response.status}`);
		}

		const result = await response.json();
		loadDemons(result)

		demonListState.set({
			cursor: result.nextCursor ?? null,
			hasMore: !!result.nextCursor,
		});

	} catch(error) {
		console.error(error.message);
		
	} finally {
		demonListState.set({ isLoading: false });
	}
}

function initInfiniteScroll() {
	const list = $(document, "#demonsList");
	if (!list) return;

	let debounce = false;
	let lastTrigger = 0;
	list.addEventListener("scroll", async () => {
		if (debounce || Date.now() - lastTrigger < INFINITE_SCROLL_COOLDOWN) {
			return;
		}

		const isAtBottom = list.scrollHeight - (list.scrollTop + list.clientHeight) <= INFINITE_SCROLL_THRESHOLD;
		if (isAtBottom) {
			debounce = true;
			await loadDemonsList();
			debounce = false;
			lastTrigger = Date.now();
		}
	})
}

async function onLoadDemons(isReloaded, { id }) {
	const isTabFirstTime = onLoadMain(isReloaded, "demons");
	demonListState.set({ selectedLevelId: id ? Number(id) : null });

	if (isTabFirstTime) {
		demonListState.set({
			cursor: null,
			hasMore: true,
		});

		await loadDemonsList();
		initInfiniteScroll();

	} else {
		updateSelectedMainPageDemon();
	}
}

function onLoadLeaderboard(isReloaded, { id }) {
	const isTabFirstTime = onLoadMain(isReloaded, "leaderboard");

	//const playerId = id ? Number(id) : null;
	const list = $(document, "#leaderboardList");
	if (list && isTabFirstTime) {
		const title = document.createElement("h2");
		title.innerText = "This page is currently under construction!";
		title.id = "errorRouterNotification";
		list.appendChild(title);
	}

	loadItemView(null);
}

async function onLoadDashboard(isReloaded, {}) {
	const user = await requireAuth();
	if (!user) {
		return;
	}

	$(document, "#avatarIcon").src = user["avatarUrl"];
	$(document, "#usernameLabel").innerText = user["username"];
	$(document, "#demonsRank").innerText = user["demonsRank"];
	$(document, "#demonsScore").innerText = user["demonsScore"];
	$(document, "#hardestDemon").innerText = user["hardestDemonName"] ?? "None";

	$(document, "#logoutButton").addEventListener("click", async () => {
		fetch("https://api.tarylem.com/v1/demonlist/auth/logout", {
			method: "POST",
			credentials: "include",

		}).catch(err => {
			console.error("Logout request failed:", err);

		}).finally(() => {
			window.location.href = "";
		});
	});
}

function appendLevelInputEntries(entries) {
	const levelInput = $(document, "#levelInput");
	const list = $(levelInput, ".select-menu");
	const template = $(document, "#formLevelEntryTemplate");
	if (!levelInput || !list || !template) {
		return;
	}

	entries.forEach(async (entry) => {
		const node = template.content.cloneNode(true);
		const root = node.firstElementChild;

		const dataValue = entry["levelId"];
		const dataText = `#${entry["placementRank"]} - ${entry["levelName"]}`;
		root.setAttribute("data-value", dataValue);
		root.setAttribute("data-text", dataText);

		const video = getVideoData(entry["videoProofUrl"]);
		const thumbnailUrl = await getThumbnailLink(video);
		root.style.backgroundImage = `url("${thumbnailUrl}")`;
		root.style.order = entry["placementRank"];

		$(node, ".level-rank").innerText = entry["placementRank"];
		$(node, ".level-name").innerText = entry["levelName"];

		root.addEventListener("click", () => {
			setSelectValue(levelInput, dataValue, dataText);
		});

		list.appendChild(node);
	});
}

async function loadLevelInputList() {
	if (levelInputState.get().isLoading || !levelInputState.get().hasMore) return;
	levelInputState.set({ isLoading: true });

	try {
		const cursor = levelInputState.get().cursor;

		const response = await fetch(
			`https://api.tarylem.com/v1/demonlist/demons?limit=100${cursor ? `&cursor=${cursor}` : ""}&includeLegacy=false`
		);

		if (!response.ok) {
			throw new Error(`Response status: ${response.status}`);
		}

		const result = await response.json();

		appendLevelInputEntries(result.result);

		levelInputState.set({
			cursor: result.nextCursor ?? null,
			hasMore: !!result.nextCursor
		});

	} catch (e) {
		console.error(e.message);

	} finally {
		levelInputState.set({ isLoading: false });
	}
}

function initLevelInputScroll() {
	const list = $(document, "#levelInput .select-menu");
	if (!list) return;

	let debounce = false;
	let lastTrigger = 0;
	list.addEventListener("scroll", async () => {
		if (debounce || Date.now() - lastTrigger < INFINITE_SCROLL_COOLDOWN) {
			return;
		}

		const isAtBottom = list.scrollHeight - (list.scrollTop + list.clientHeight) <= INFINITE_SCROLL_THRESHOLD;
		if (isAtBottom) {
			debounce = true;
			await loadLevelInputList();
			debounce = false;
			lastTrigger = Date.now();
		}
	});
}

async function onLoadSubmitForm(isReload, ruleType) {
	if (!isReload) {
		return;
	}

	const formType = ruleType == "submitRecordRules" ? "record" : "level";
	document.addEventListener("select:toggle", (e) => {
		const select = e.target.closest(".select");
		if (!select) return;

		if (select.id === "levelInput" && e.detail.active) {
			loadLevelInputList();
		}
	});

	document.addEventListener("select:change", (e) => {
		const select = e.target.closest(".select");
		if (!select) return;

		if (select.id === "levelInput") {
			validateFormInput(formType);
		}
	});

	const ruleView = $(document, "#ruleView");
	const ruleVersion = ruleView.getAttribute("data-version");

	const isRead = await isRuleRead(ruleType);
	ruleView.setAttribute("data-read", isRead);

	let debounce = false
	$(document, "#ruleAcceptButton").addEventListener("click", async () => {
		if (debounce) {
			return;
		}
		debounce = true;

		try {
			const isRead = await readRule(ruleType, ruleVersion);
			if (isRead) {
				ruleView.setAttribute("data-read", true);
			}

		} catch (e) {
			console.error("Failed to read rules:", e);

		} finally {
			debounce = false;
		}
	});

	validateFormInput(formType);
	$(document, "#formSubmitButton").addEventListener("click", async () => {
		submitForm(formType);
	});

	const fieldInputs = $$(document, ".form-field-input");
	fieldInputs.forEach((element) => {
		element.addEventListener("input", () => {
			validateFormInput(formType);
		})
	});
}

async function onLoadSubmitRecord(isReloaded, { id }) {
	onLoadSubmitForm(isReloaded, "submitRecordRules");

	const user = await requireAuth();
	if (!user) {
		return;
	}

	$(document, "#usernameLabel").innerText = user["username"];
	if (isReloaded) {
		initLevelInputScroll();
	}

	if (id) {
		try {
			const response = await cache.loadDemonData(Number(id));
			if (!response) {
				return;
			}

			const level = response["result"]["level"];
			const input = $(document, "#levelInput");
			setSelectValue(input, id, `#${level["placementRank"]} - ${level["name"]}`)

		} catch (e) {
			console.error("Failed to preload level input:", e);
		}
	}
}

async function onLoadSubmitLevel(isReloaded, {}) {
	onLoadSubmitForm(isReloaded, "submitLevelRules");

	const user = await requireAuth();
	if (!user) {
		return;
	}
	
	$(document, "#usernameLabel").innerText = user["username"];
}

function appendSelfRecords(entries, reset = false) {
	const list = $(document, ".records-list");
	const template = $(document, "#recordTemplate");
	if (!list || !template) {
		return;
	}

	if (reset) {
		list.innerHTML = "";
	}

	if (!entries || entries.length === 0) {
		if (reset) {
			const empty = el("li", "empty-records");
			const title = el("p", null, "No records found.");
			empty.appendChild(title);
			list.appendChild(empty);
		}

		return;
	}

	const tasks = entries.map(async (entry) => {
		const node = template.content.cloneNode(true);

		const root = node.querySelector(".record-item");

		const recordHeader = $(node, ".record-header");

		const levelPlacement = $(node, ".level-placement");
		const levelName = $(node, ".level-name");
		const recordProgress = $(node, ".record-progress");

		const statusLabel = $(node, ".status-label");

		const moderatorContent = $(node, ".mod-content");
		const moderatorUsername = $(node, ".moderator-username");
		const moderatorAvatar = $(node, ".moderator-avatar");
		const moderatorNote = $(node, ".moderator-note");

		const submitDate = $(node, ".submit-date");
		const reviewDate = $(node, ".review-date");

		const buttons = $$(node, ".button-master");

		const goToLevelButton = buttons[0];
		const viewProofButton = buttons[1];

		const videoData = getVideoData(entry["videoProofUrl"]);
		const videoThumbnail = await getThumbnailLink(videoData);

		recordHeader.style.backgroundImage = `url(${videoThumbnail})`;

		levelPlacement.innerText = entry["placementRank"];
		levelName.innerText = entry["levelName"];

		const progress = Number(entry["progress"]);
		recordProgress.innerText = `${progress}%`;

		const status = String(entry["status"]).toLowerCase();

		statusLabel.innerText = status;
		statusLabel.classList.add(status);

		goToLevelButton.href = `#demons/${entry["levelId"]}`;
		viewProofButton.href = entry["videoUrl"];

		submitDate.innerText = getDateStringFromDate(new Date(entry["createdAt"]));
		if (entry["checkedAt"]) {
			reviewDate.innerText = getDateStringFromDate(new Date(entry["checkedAt"]));

		} else {
			reviewDate.parentElement.remove();
		}

		if (entry["status"] != "pending") {
			moderatorContent.classList.add("active");
		}

		if (entry["moderatorUsername"] || entry["moderatorAvatarUrl"] || entry["reason"]) {
			moderatorUsername.innerText = entry["moderatorUsername"] ?? "Unknown";
			if (entry["moderatorAvatarUrl"]) {
				moderatorAvatar.src = entry["moderatorAvatarUrl"];

			} else {
				moderatorAvatar.style.display = "none";
			}

			moderatorNote.innerText = entry["reason"] ?? entry["note"] ?? "No note provided.";

		} else {
			moderatorContent.style.display = "none";
		}

		return node;
	});

	Promise.all(tasks).then((nodes) => {
		for (const node of nodes) {
			list.appendChild(node);
		}
	});
}

async function loadSelfRecordsPage(reset = false) {
	if (!reset && (selfRecordsState.get().isLoading || !selfRecordsState.get().hasMore)) {
		return;
	}

	selfRecordsState.set({ isLoading: true });

	try {
		const state = selfRecordsState.get();
		const res = await cache.loadSelfRecords(
			state.sort,
			state.status,
			100,
			state.cursor
		);

		if (!res) {
			return;
		}

		appendSelfRecords(res.result, reset);

		selfRecordsState.set({
			cursor: res.nextCursor ?? null,
			hasMore: !!res.nextCursor
		});

	} catch (e) {
		console.error(e.message);

	} finally {
		selfRecordsState.set({ isLoading: false });
	}
}

function initRecordsInfiniteScroll() {
	const container = $(document, "#recordsScrollContainer");
	if (!container) {
		return;
	}

	let debounce = false;
	let lastTrigger = 0;

	container.addEventListener("scroll", async () => {
		if (debounce || Date.now() - lastTrigger < INFINITE_SCROLL_COOLDOWN) {
			return;
		}

		const isAtBottom = container.scrollHeight - (container.scrollTop + container.clientHeight) <= INFINITE_SCROLL_THRESHOLD;
		if (isAtBottom) {
			debounce = true;

			await loadSelfRecordsPage();

			debounce = false;
			lastTrigger = Date.now();
		}
	});
}

function initRecordsFilters() {
	const stateFilter = $(document, "#stateFilter");
	const dateFilter = $(document, "#dateFilter");

	if (stateFilter) {
		stateFilter.addEventListener("select:change", async () => {
			const value = stateFilter.getAttribute("data-choice") ?? "all";

			selfRecordsState.set({
				status: value
			});

			await loadSelfRecordsPage(true);
		});
	}

	if (dateFilter) {
		dateFilter.addEventListener("select:change", async () => {
			const value = dateFilter.getAttribute("data-choice") ?? "desc";

			selfRecordsState.set({
				sort: value
			});

			await loadSelfRecordsPage(true);
		});
	}
}

async function onLoadRecords(isReloaded, { }) {
	const user = await requireAuth();
	if (!user) {
		return;
	}

	if (isReloaded) {
		initRecordsInfiniteScroll();
		initRecordsFilters();
	}

	selfRecordsState.set({
		cursor: null,
		isLoading: false,
		hasMore: true,
		sort: "desc",
		status: "all"
	});

	await loadSelfRecordsPage(true);
}

function onLoadError(isReloaded, { id }) {
	id = id ? Number(id) : null;
	if (!id) {
		window.location.href = "";
		return;
	}

	let errorTitle = "";
	switch (id) {
		case 100:
			errorTitle = "Login failed, you need a Dash World account first";
			break;

		case 110:
			errorTitle = "Login failed, there was an error with the roblox oauth";
			break;

		case 200:
			errorTitle = "You need to login first to do this action";
			break;

		default:
			errorTitle = "Unknown error";
	}

	$(document, "#errorCode").innerText = id;
	$(document, "#errorDescription").innerText = errorTitle;
}

async function init() {
	const myAccountButton = $(document, "#myAccountButton");
	const myAccountButtonLabel = $(document, "#myAccountButton span span");

	let isAuthenticated = false;
	if (!document.cookie.includes("DEMONLIST_LOGGED_IN=1")) {
		myAccountButtonLabel.innerText = "Login";
		myAccountButton.addEventListener("click", tryLogin);
		return;
	}

	try {
		const user = await loadUser();
		isAuthenticated = !!user;

	} catch(e) {
		console.error(e);
	}

	myAccountButtonLabel.innerText = isAuthenticated ? "My Account" : "Login";
	myAccountButton.addEventListener("click", async () => {
		if (!isAuthenticated) {
			tryLogin();
			return;
		}

		window.location.href = "#dashboard";
	});

	initComponents();
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

router.add("submit/record", {
	template: "/demonlist/fragments/submitRecord.html",
	onLoad: onLoadSubmitRecord
});

router.add("submit/record/:id", {
	template: "/demonlist/fragments/submitRecord.html",
	onLoad: onLoadSubmitRecord
});

router.add("submit/level", {
	template: "/demonlist/fragments/submitLevel.html",
	onLoad: onLoadSubmitLevel
});

// Records

router.add("records", {
	template: "/demonlist/fragments/records.html",
	onLoad: onLoadRecords
});

// Dashboard

router.add("dashboard", {
	template: "/demonlist/fragments/dashboard.html",
	onLoad: onLoadDashboard
});

// Other
router.add("terms", {
	template: "/demonlist/fragments/terms.html",
});

router.add("privacy", {
	template: "/demonlist/fragments/privacy.html",
});

router.add("error/:id", {
	template: "/demonlist/fragments/error.html",
	onLoad: onLoadError
})

init();