import { getCurrentLanguage, getLocaleForLanguage, translate } from "./i18n.js?v=__ASSET_VERSION__";

export function getDataItems() {
	return Array.isArray(globalThis.dadosOc) ? globalThis.dadosOc : [];
}

export function escapeHtml(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

export function formatDate(dateString) {
	if (!dateString) {
		return translate(getCurrentLanguage(), "noDate");
	}

	return new Intl.DateTimeFormat(getLocaleForLanguage(getCurrentLanguage()), {
		dateStyle: "short",
		timeStyle: "short",
	}).format(new Date(dateString));
}

export function createSetId() {
	return `set-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeStateSignature(state) {
	return JSON.stringify({
		currentSetName: (state.currentSetName || "").trim(),
		itemColors: state.itemColors || {},
		colorNames: state.colorNames || {},
		notes: state.notes || "",
	});
}

export function downloadJsonFile(filename, data) {
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

export function readFileAsText(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result || ""));
		reader.onerror = () => reject(new Error(translate(getCurrentLanguage(), "flashImportError")));
		reader.readAsText(file);
	});
}
