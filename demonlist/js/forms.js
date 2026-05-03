import { $, $$, el } from "./dom.js";

function clearFormErrors() {
	const sections = $$(document, ".form-section");
	sections.forEach(section => {
		const error = $(section, ".form-error");
		if (error) error.remove();
	});
}

function clearFormSuccess() {
	const section = $(document, ".form-section.form-submit");
	if (!section) return;

	const success = $(section, ".form-success");
	if (success) success.remove();
}

function renderFormErrors(errors) {
	clearFormErrors();
	clearFormSuccess();

	errors.forEach(err => {
		let section;

		if (err.param) {
			section = $(document, `.form-section[data-param="${err.param}"]`);

		} else {
			section = $(document, ".form-section.form-submit");
		}

		if (!section) return;

		let errorContainer = $(section, ".form-error");
		if (!errorContainer) {
			errorContainer = el("div", "form-error");
			section.appendChild(errorContainer);
		}

		errorContainer.appendChild(el("p", `form-error-item type-${err.type || "validation"}`, err.text));
	});
}

function renderFormSuccess(message = "Your submission has been successfully sent.") {
	clearFormErrors();
	clearFormSuccess();

	const section = $(document, ".form-section.form-submit");
	if (!section) return;

	const container = el("div", "form-success");
	container.appendChild(el("p", "form-success-item", message));

	section.appendChild(container);
}

function getPayload(type) {
	const levelRaw = type === "record" ? $(document, "#levelInput").getAttribute("data-choice") : $(document, "#levelInput").value;
	const progressRaw = $(document, "#progressInput")?.value;

	const payload = {
		levelId: Number(levelRaw),
		videoUrl: $(document, "#videoProofInput").value.trim(),
		note: $(document, "#noteInput").value.trim() || null,
	};

	if (type === "record") {
		payload.progress = Number(progressRaw);
	}

	return payload;
}

export function validateFormInput(type) {
	const submitButton = $(document, "#formSubmitButton");
	const p = getPayload(type);

	const isValid =
		Number.isInteger(p.levelId) && p.levelId > 0 &&
		typeof p.videoUrl === "string" && p.videoUrl.length > 0 &&
		(type !== "record" || (
			Number.isFinite(p.progress) &&
			p.progress >= 0 &&
			p.progress <= 100
		));

	if (!isValid) {
		submitButton.setAttribute("data-disabled", true);

	} else {
		submitButton.removeAttribute("data-disabled");
		
		clearFormErrors();
		clearFormSuccess();
	}
	submitButton.classList.toggle("disabled", !isValid);

	return isValid;
}

export async function submitForm(type) {
	if (!validateFormInput(type)) {
		return;
	}

	const payload = getPayload(type);

	const submitButton = $(document, "#formSubmitButton");
	if (submitButton.getAttribute("data-disabled")) {
		return;
	}

	submitButton.setAttribute("data-disabled", true);
	submitButton.classList.add("loading");

	try {
		const res = await fetch(
			`https://api.tarylem.com/v1/demonlist/submit/${type}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				credentials: "include",
				body: JSON.stringify(payload)
			}
		);

		const data = await res.json();
		if (!res.ok) {
			if (data?.errors) {
				renderFormErrors(data.errors);
			}
			return;
		}

		renderFormSuccess(
			type === "record"
				? "Record submitted successfully. It will be reviewed by a moderator."
				: "Level submitted successfully. It will be reviewed by a moderator."
		);

	} catch (e) {
		console.error("Failed to submit form", e);

	} finally {
		submitButton.removeAttribute("data-disabled");
		submitButton.classList.remove("loading");
	}
}