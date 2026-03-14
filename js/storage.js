import { STORAGE_KEY } from "./config.js";

export function loadSavedSets() {
	try {
		const rawSets = window.localStorage.getItem(STORAGE_KEY);
		const parsed = rawSets ? JSON.parse(rawSets) : [];
		return Array.isArray(parsed) ? parsed : [];
	} catch (error) {
		console.error("Não foi possível ler os conjuntos guardados.", error);
		return [];
	}
}

export function saveSavedSets(savedSets) {
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSets));
}
