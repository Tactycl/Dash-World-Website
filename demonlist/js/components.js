import { $, $$ } from "./dom.js";

function toggleSelect(element, active = null) { // null toggles, boolean sets state
	if (!element || !element.classList.contains("select")) {
		return;
	}

	const isActive = active ?? !element.classList.contains("active");
	element.classList.toggle("active", isActive);
	element.dispatchEvent(new CustomEvent("select:toggle", {
		detail: { active: isActive },
		bubbles: true,
	}));
}

function initSelect(element) {
	if (element.getAttribute("data-init") === "true") {
		return;
	}

	const selectButton = $(element, ".select-button");
	const selectMenu = $(element, ".select-menu");
	const span = $(element, ".select-button span");
	if (!selectButton || !selectMenu || !span) {
		return;
	}

	span.innerText = "Nothing selected at the moment";
	element.setAttribute("data-choice", "");
	element.setAttribute("data-init", "true");

	selectButton.addEventListener("click", () => {
		toggleSelect(element);
	});

	const options = $$(selectMenu, ".option");
	options.forEach((optionElement) => {
		const dataValue = optionElement.getAttribute("data-value");
		if (!dataValue) {
			return;
		}

		if (optionElement.getAttribute("data-default") === "true") {
			setSelectValue(element, dataValue)
		}

		optionElement.addEventListener("click", () => {
			setSelectValue(element, dataValue);
		});
	});
}

function observeSelects() {
	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			for (const node of mutation.addedNodes) {
				if (!(node instanceof HTMLElement)) continue;
				if (node.classList.contains("select")) {
					initSelect(node);
				}

				const nested = $$(node, ".select");
				nested.forEach(initSelect);
			}
		}
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true,
	});
}

function initSelects() {
	const selects = $$(document, ".select");
	selects.forEach(initSelect);
	observeSelects();
}

export function hydrate(root = document) {
	$$(root, ".select").forEach(initSelect);
}

export function setSelectValue(element, choice, text = null, { silent = false } = {}) {
	if (!element || !element.classList.contains("select")) {
		return;
	}

	const span = $(element, ".select-button span");
	if (!span) return;

	let resolvedText = text;
	if (element.getAttribute("data-dynamic-load") === "true") {
		element.setAttribute("data-choice", choice);
		span.innerText = resolvedText ?? choice;

		if (!silent) {
			element.dispatchEvent(new CustomEvent("select:change", {
				detail: { value: choice, text: resolvedText ?? choice },
				bubbles: true,
			}));
		}

		toggleSelect(element, false);
		return;
	}

	let found = false;
	const options = $$(element, ".select-menu .option");
	for (const option of options) {
		if (found) break;

		if (option.getAttribute("data-value") === String(choice)) {
			const dataText = option.getAttribute("data-text");

			element.setAttribute("data-choice", choice);
			span.innerText = dataText ?? (resolvedText ?? choice);

			resolvedText = dataText ?? resolvedText;
			found = true;
		}
	}

	if (!found) return;
	if (!silent) {
		element.dispatchEvent(new CustomEvent("select:change", {
			detail: { value: choice, text: resolvedText ?? choice },
			bubbles: true,
		}));
	}

	toggleSelect(element, false);
}

export function initComponents() {
	initSelects();
}