import { COLORS } from "./config.js";
import { loadSavedSets, saveSavedSets } from "./storage.js";
import { createSetId, downloadJsonFile, escapeHtml, formatDate, getDataItems, normalizeStateSignature, readFileAsText } from "./utils.js";

export class MapaSVGApp {
	constructor() {
		this.showSetores = false;
		this.zoomLevel = 1.4;
		this.selectedColor = "#f9f9f9ff";
		this.itemColors = {};
		this.colorNames = {};
		this.notes = "";
		this.savedSets = [];
		this.currentSetId = null;
		this.currentSetName = "";
		this.lastSavedSignature = "";
		this.colors = COLORS;
		this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
		this.init();
	}

	init() {
		this.resetWorkingSet();
		this.savedSets = this.sortSavedSets(loadSavedSets());
		window.addEventListener("beforeunload", this.handleBeforeUnload);

		if (this.savedSets.length > 0) {
			this.loadSet(this.savedSets[0].id, false, true);
		} else {
			this.markCurrentStateAsSaved();
		}

		this.render();
	}

	resetWorkingSet() {
		this.selectedColor = "#f9f9f9ff";
		this.itemColors = this.createDefaultItemColors();
		this.colorNames = {};
		this.notes = "";
		this.currentSetId = null;
		this.currentSetName = this.generateSetName();
	}

	createDefaultItemColors() {
		const defaultColor = this.colors.find((colorItem) => colorItem.id === 2)?.color || "#FFFFFF";
		const itemColors = {};

		getDataItems().forEach((item) => {
			itemColors[item.dataName] = defaultColor;
		});

		return itemColors;
	}

	sortSavedSets(savedSets) {
		return [...savedSets].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
	}

	generateSetName() {
		const baseName = "Novo Mapa";
		const existingNames = new Set(this.savedSets.map((item) => item.name));
		let index = this.savedSets.length + 1;

		while (existingNames.has(`${baseName} ${index}`)) {
			index += 1;
		}

		return `${baseName} ${index}`;
	}

	createSnapshot() {
		return {
			itemColors: { ...this.itemColors },
			colorNames: { ...this.colorNames },
			notes: this.notes,
		};
	}

	createComparableState() {
		return {
			currentSetName: this.currentSetName,
			...this.createSnapshot(),
		};
	}

	markCurrentStateAsSaved() {
		this.lastSavedSignature = normalizeStateSignature(this.createComparableState());
	}

	hasUnsavedChanges() {
		return normalizeStateSignature(this.createComparableState()) !== this.lastSavedSignature;
	}

	applySnapshot(snapshot) {
		this.itemColors = { ...this.createDefaultItemColors(), ...(snapshot?.itemColors || {}) };
		this.colorNames = { ...(snapshot?.colorNames || {}) };
		this.notes = snapshot?.notes || "";
	}

	persistSavedSets() {
		saveSavedSets(this.savedSets);
	}

	loadSet(setId, shouldRender = true, skipDirtyCheck = false) {
		if (!skipDirtyCheck && !this.confirmDiscardUnsavedChanges()) {
			return;
		}

		const selectedSet = this.savedSets.find((item) => item.id === setId);
		if (!selectedSet) {
			return;
		}

		this.currentSetId = selectedSet.id;
		this.currentSetName = selectedSet.name;
		this.selectedColor = "#f9f9f9ff";
		this.applySnapshot(selectedSet);
		this.markCurrentStateAsSaved();

		if (shouldRender) {
			this.render();
		}
	}

	persistCurrentSet(asNew = false) {
		const now = new Date().toISOString();
		const trimmedName = (this.currentSetName || "").trim();
		const setName = trimmedName || this.generateSetName();
		const snapshot = this.createSnapshot();

		if (!this.currentSetId || asNew) {
			const newSet = {
				id: createSetId(),
				name: setName,
				createdAt: now,
				updatedAt: now,
				...snapshot,
			};

			this.savedSets = [newSet, ...this.savedSets];
			this.currentSetId = newSet.id;
			this.currentSetName = newSet.name;
		} else {
			this.savedSets = this.savedSets.map((item) => {
				if (item.id !== this.currentSetId) {
					return item;
				}

				return {
					...item,
					name: setName,
					updatedAt: now,
					...snapshot,
				};
			});
		}

		this.savedSets = this.sortSavedSets(this.savedSets);
		this.persistSavedSets();
		this.markCurrentStateAsSaved();
		this.render();
	}

	deleteCurrentSet() {
		if (this.currentSetId) {
			this.deleteSet(this.currentSetId);
		}
	}

	deleteSet(setId) {
		const target = this.savedSets.find((item) => item.id === setId);
		if (!target) {
			return;
		}

		const shouldDelete = window.confirm(`Apagar o mapa "${target.name}"?`);
		if (!shouldDelete) {
			return;
		}

		this.savedSets = this.savedSets.filter((item) => item.id !== setId);
		this.persistSavedSets();

		if (setId === this.currentSetId) {
			this.resetWorkingSet();
			this.markCurrentStateAsSaved();
		}
		this.render();
	}

	confirmDiscardUnsavedChanges() {
		if (!this.hasUnsavedChanges()) {
			return true;
		}

		return window.confirm("Existem alterações por guardar. Pretende descartá-las?");
	}

	exportSavedSets() {
		const payload = {
			app: "OCAreasWeb",
			version: 1.1,
			exportedAt: new Date().toISOString(),
			savedSets: this.savedSets,
		};
		downloadJsonFile("ocareasweb-mapas.json", payload);
	}

	async importSavedSets(file) {
		if (!file) {
			return;
		}

		try {
			const fileText = await readFileAsText(file);
			const parsed = JSON.parse(fileText);
			const importedSets = Array.isArray(parsed) ? parsed : parsed?.savedSets;

			if (!Array.isArray(importedSets)) {
				throw new Error("O ficheiro não contém uma lista válida de mapas.");
			}

			const reservedNames = new Set(this.savedSets.map((item) => item.name));
			const normalizedSets = importedSets.map((item, index) => this.normalizeImportedSet(item, index, reservedNames));
			this.savedSets = this.sortSavedSets([...normalizedSets, ...this.savedSets]);
			this.persistSavedSets();
			this.loadSet(normalizedSets[0]?.id, true, true);
		} catch (error) {
			window.alert(error.message || "Não foi possível importar o ficheiro selecionado.");
		}
	}

	normalizeImportedSet(item, index, reservedNames) {
		const now = new Date().toISOString();
		const baseName = typeof item?.name === "string" && item.name.trim() ? item.name.trim() : `Importado ${index + 1}`;
		const itemColors = item?.itemColors && typeof item.itemColors === "object" ? item.itemColors : {};
		const colorNames = item?.colorNames && typeof item.colorNames === "object" ? item.colorNames : {};
		const notes = typeof item?.notes === "string" ? item.notes : "";

		return {
			id: createSetId(),
			name: this.createUniqueImportedName(baseName, reservedNames),
			createdAt: item?.createdAt || now,
			updatedAt: now,
			itemColors: { ...this.createDefaultItemColors(), ...itemColors },
			colorNames,
			notes,
		};
	}

	createUniqueImportedName(baseName, reservedNames) {
		if (!reservedNames.has(baseName)) {
			reservedNames.add(baseName);
			return baseName;
		}

		let suffix = 2;
		while (reservedNames.has(`${baseName} (${suffix})`)) {
			suffix += 1;
		}

		const uniqueName = `${baseName} (${suffix})`;
		reservedNames.add(uniqueName);
		return uniqueName;
	}

	render() {
		const app = document.getElementById("app");
		app.innerHTML = `
			<div class="container">
				${this.renderHeader()}
				<div class="main-content">
					${this.renderMap()}
					${this.renderSidebar()}
				</div>
			</div>
			${this.renderModal()}
		`;
		this.attachEventListeners();
	}

	renderHeader() {
		return `
			<div class="header">
				<div class="title">Outro Chão - Agricultura Biológica, Lda.</div>
				<div class="header-controls">
					<button type="button" class="gear-button" id="open-settings" aria-label="Definições" aria-haspopup="dialog">&#x26ED;</button>
				</div>
			</div>
		`;
	}

	renderModal() {
		return `
			<div class="modal-overlay" id="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" hidden>
				<div class="modal-panel">
					<div class="modal-header">
						<span class="modal-title" id="settings-modal-title">Definições</span>
						<button type="button" class="modal-close" id="close-settings" aria-label="Fechar definições">✕</button>
					</div>
					<div class="modal-body">
						<button type="button" class="modal-action-button toggle-button" id="toggle-setores" aria-pressed="${this.showSetores}">
							${this.showSetores ? "Esconder Setores de Rega" : "Mostrar Setores de Rega"}
						</button>
						<button type="button" class="modal-action-button secondary-button" id="export-sets">Exportar JSON</button>
						<label class="modal-action-button import-button" for="import-sets-modal">Importar JSON</label>
						<input type="file" id="import-sets-modal" class="visually-hidden" accept="application/json,.json">
					</div>

                    
                <span class="color-percentage footer-note">@RB 2025 v1.1</span>
				</div>
			</div>
		`;
	}

	renderMap() {
		const baseViewBoxWidth = 900;
		const baseViewBoxHeight = 1000;
		const viewBoxWidth = baseViewBoxWidth; /// this.zoomLevel;
		const viewBoxHeight = baseViewBoxHeight; // / this.zoomLevel;
		const mapTitle = escapeHtml((this.currentSetName || "Mapa sem nome").trim() || "Mapa sem nome");

		return `
			<div class="map-container">
				<div class="map-current-title">Mapa: ${mapTitle}</div>
                <svg class="map-svg" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" role="img" aria-label="Mapa interativo de áreas">
                    ${this.renderSVGItems()}
                </svg>
			</div>
		`;
	}

	renderSVGItems() {
		const dataItems = getDataItems();
		if (!dataItems.length) {
			return '<text x="50" y="50" fill="red">Dados não carregados</text>';
		}

		return dataItems
			.map((item) => {
				const itemColor = this.itemColors[item.dataName] || "#f9f9f9ff";
				const colorObj = this.colors.find((colorItem) => colorItem.color === itemColor);
				const textColor = colorObj ? colorObj.text : "#000000";

				return `
					<g>
						<path d="${item.pathData}"
							fill="${itemColor}"
							stroke="#000000"
							stroke-width="1"
							data-item="${item.dataName}"
							style="cursor: pointer;"
							aria-label="Área ${item.dataName}" />
						<text transform="${item.textTransform}" font-size="11" fill="${textColor}">
							<tspan x="${item.nomeTspanX}" y="${item.nomeTspanY}">${item.dataName}</tspan>
						</text>
						${
							this.showSetores
								? `
							<text transform="${item.setorTransform}" font-size="10" font-weight="bold" fill="#ff0000">
								<tspan x="${item.setorTspanX}" y="${item.setorTspanY}">${item.setorData}</tspan>
							</text>
						`
								: ""
						}
					</g>
				`;
			})
			.join("");
	}

	renderSidebar() {
		return `
			<div class="color-palette">
				<div class="color-palette-title">Legenda</div>
				${this.colors.map((colorItem) => this.renderColorRow(colorItem)).join("")}
				${this.renderNotesSection()}
                ${this.renderSavedSetsSection()}
			</div>
		`;
	}

	renderSavedSetsSection() {
		const currentName = escapeHtml(this.currentSetName);
		const saveStatus = this.hasUnsavedChanges() ? "Alterações por guardar" : "Tudo guardado";

		return `
			<section class="saved-sets-section" aria-labelledby="saved-sets-heading">
				<div class="saved-sets-header">
					<div class="color-palette-title saved-sets-title" id="saved-sets-heading">Lista de Mapas</div>
					<div class="saved-sets-toolbar">
						<div>
							<div class="saved-sets-status-label">Status</div>
							<div class="saved-sets-status ${this.hasUnsavedChanges() ? "dirty" : ""}" aria-live="polite">${saveStatus}</div>
						</div>
						<button type="button" class="secondary-button" id="new-set">Limpar Mapa</button>
					</div>
				</div>
				<label class="set-name-label" for="set-name">Nome do mapa</label>
				<input type="text" id="set-name" class="set-name-input" maxlength="80" placeholder="Nome do mapa" value="${currentName}">
				<div class="saved-sets-actions">
					<button type="button" class="toggle-button" id="save-set">Guardar</button>
					<button type="button" class="secondary-button" id="save-as-set">Guardar Como Novo</button>
				</div>

                <div class="saved-sets-list" role="list" aria-label="Lista de mapas guardados">
					${this.savedSets.length > 0 ? this.savedSets.map((item) => this.renderSavedSetRow(item)).join("") : '<div class="empty-saved-sets">Sem mapas guardados.</div>'}
				</div>

			</section>
		`;
	}

	renderSavedSetRow(item) {
		const isActive = item.id === this.currentSetId;
		const itemName = escapeHtml(item.name);
		const updatedAt = escapeHtml(formatDate(item.updatedAt));
		const { count, area } = this.getSavedSetSummary(item);
		const summary = `${count} | ${area} ha`;

		return `
			<div class="saved-set-item ${isActive ? "active" : ""}" role="listitem">
				<button type="button" class="saved-set-load" data-set-id="${item.id}" aria-pressed="${isActive}">
					<span class="saved-set-name">${itemName}</span>
					<span class="saved-set-meta">Atualizado ${updatedAt}</span>
					<span class="saved-set-meta">${summary}</span>
				</button>
				<button type="button" class="saved-set-delete" data-delete-id="${item.id}" aria-label="Apagar ${itemName}">&#x78;</button>
			</div>
		`;
	}

	getSavedSetSummary(savedSet) {
		const defaultColor = (this.colors.find((colorItem) => colorItem.id === 2)?.color || "#FFFFFF").toUpperCase();
		const itemColors = savedSet?.itemColors && typeof savedSet.itemColors === "object" ? savedSet.itemColors : {};
		const selectedItems = getDataItems().filter((item) => {
			const currentColor = String(itemColors[item.dataName] || defaultColor).toUpperCase();
			return currentColor !== defaultColor;
		});

		const area = selectedItems.reduce((sum, item) => sum + (parseFloat(item?.area) || 0), 0);
		return {
			count: selectedItems.length,
			area: area.toFixed(2),
		};
	}

	renderColorRow(colorItem) {
		const count = this.getColorCount(colorItem.color);
		const area = this.getColorArea(colorItem.color);
		const percentage = this.getColorPercentage(colorItem.color);
		const isSelected = this.selectedColor === colorItem.color;
		const colorName = escapeHtml(this.colorNames[colorItem.color] || "");
		const groupId = `group-color-${colorItem.id}`;
		const sampleStyle = `background-color: ${colorItem.color}; color: ${colorItem.text};`;

		return `
			<div class="color-row">
				<button type="button" class="color-select-button ${isSelected ? "selected" : ""}" data-color="${colorItem.color}" aria-label="Selecionar grupo ${colorItem.id}" aria-pressed="${isSelected}">
					${isSelected ? '<div class="radio-button-inner"></div>' : ""}
				</button>
				<button type="button" class="color-sample" style="${sampleStyle}" data-color="${colorItem.color}" aria-label="Aplicar cor do grupo ${colorItem.id}"></button>
				<div>
					<label class="visually-hidden" for="${groupId}">Notas da cor ${colorItem.id}</label>
					<input type="text" id="${groupId}" class="color-input" placeholder="Notas para esta cor" value="${colorName}" data-color="${colorItem.color}">
				</div>
				<div class="color-stats">
					<span class="color-count">(${count})</span>
					<span class="color-area">${area} ha</span>
					<span class="color-percentage">${percentage}%</span>
				</div>
			</div>
		`;
	}

	renderNotesSection() {
		const notes = escapeHtml(this.notes);
		return `
			<div class="notes-section">
                <label class="set-name-label" for="notes-input">Notas do mapa</label>
				<textarea id="notes-input" class="notes-input" placeholder="Adicione suas notas aqui...">${notes}</textarea>
			</div>
			
		`;
	}

	attachEventListeners() {
		document.getElementById("zoom-in")?.addEventListener("click", () => this.handleZoomIn());
		document.getElementById("zoom-out")?.addEventListener("click", () => this.handleZoomOut());
		document.getElementById("toggle-setores")?.addEventListener("click", () => this.toggleSetores());
		document.getElementById("new-set")?.addEventListener("click", () => this.handleNewSet());
		document.getElementById("save-set")?.addEventListener("click", () => this.persistCurrentSet(false));
		document.getElementById("save-as-set")?.addEventListener("click", () => this.persistCurrentSet(true));
		document.getElementById("open-settings")?.addEventListener("click", () => this.openModal());
		document.getElementById("close-settings")?.addEventListener("click", () => this.closeModal());
		document.getElementById("settings-modal")?.addEventListener("click", (event) => {
			if (event.target === event.currentTarget) this.closeModal();
		});
		document.getElementById("export-sets")?.addEventListener("click", () => this.exportSavedSets());
		document.getElementById("import-sets-modal")?.addEventListener("change", async (event) => {
			const [file] = event.target.files || [];
			await this.importSavedSets(file);
			event.target.value = "";
			this.closeModal();
		});
		document.querySelectorAll("[data-delete-id]").forEach((btn) => {
			btn.addEventListener("click", (event) => {
				event.stopPropagation();
				const setId = btn.getAttribute("data-delete-id");
				this.deleteSet(setId);
			});
		});
		document.getElementById("set-name")?.addEventListener("input", (event) => {
			this.currentSetName = event.target.value;
			this.updateDirtyState();
		});
		document.getElementById("import-sets")?.addEventListener("change", async (event) => {
			const [file] = event.target.files || [];
			await this.importSavedSets(file);
			event.target.value = "";
		});

		document.querySelectorAll("[data-set-id]").forEach((element) => {
			element.addEventListener("click", (event) => {
				const setId = event.currentTarget.getAttribute("data-set-id");
				this.loadSet(setId);
			});
		});

		document.querySelectorAll("path[data-item]").forEach((path) => {
			path.addEventListener("click", (event) => {
				const itemName = event.target.getAttribute("data-item");
				this.handleItemPress(itemName);
			});
		});

		document.querySelectorAll("button[data-color]").forEach((element) => {
			element.addEventListener("click", (event) => {
				const color = event.currentTarget.getAttribute("data-color");
				this.selectColor(color);
			});
		});

		document.querySelectorAll(".color-input").forEach((input) => {
			input.addEventListener("input", (event) => {
				const color = event.target.getAttribute("data-color");
				this.updateColorName(color, event.target.value);
			});
		});

		document.querySelector(".notes-input")?.addEventListener("input", (event) => {
			this.updateNotes(event.target.value);
		});
	}

	updateDirtyState() {
		const status = document.querySelector(".saved-sets-status");
		if (!status) {
			return;
		}

		const isDirty = this.hasUnsavedChanges();
		status.textContent = isDirty ? "Alterações por guardar" : "Tudo guardado";
		status.classList.toggle("dirty", isDirty);
	}

	openModal() {
		const modal = document.getElementById("settings-modal");
		if (modal) {
			modal.hidden = false;
			document.getElementById("close-settings")?.focus();
		}
	}

	closeModal() {
		const modal = document.getElementById("settings-modal");
		if (modal) {
			modal.hidden = true;
			document.getElementById("open-settings")?.focus();
		}
	}

	handleBeforeUnload(event) {
		if (!this.hasUnsavedChanges()) {
			return;
		}

		event.preventDefault();
		event.returnValue = "";
	}

	handleZoomIn() {
		this.zoomLevel = Math.min(this.zoomLevel + 0.1, 2);
		this.render();
	}

	handleZoomOut() {
		this.zoomLevel = Math.max(this.zoomLevel - 0.1, 0.7);
		this.render();
	}

	toggleSetores() {
		this.showSetores = !this.showSetores;
		this.render();
	}

	selectColor(color) {
		this.selectedColor = color;
		this.render();
	}

	handleItemPress(itemName) {
		this.itemColors[itemName] = this.selectedColor;
		this.render();
	}

	updateColorName(color, name) {
		this.colorNames[color] = name;
		this.updateDirtyState();
	}

	updateNotes(text) {
		this.notes = text;
		this.updateDirtyState();
	}

	handleNewSet() {
		if (!this.confirmDiscardUnsavedChanges()) {
			return;
		}

		this.resetWorkingSet();
		this.markCurrentStateAsSaved();
		this.render();
	}

	getColorCount(color) {
		return Object.values(this.itemColors).filter((itemColor) => itemColor === color).length;
	}

	getColorArea(color) {
		const selectedItems = Object.keys(this.itemColors).filter((itemName) => this.itemColors[itemName] === color);
		const totalArea = selectedItems.reduce((sum, itemName) => {
			const item = getDataItems().find((dataItem) => dataItem.dataName === itemName);
			const area = parseFloat(item?.area) || 0;
			return sum + area;
		}, 0);
		return totalArea.toFixed(2);
	}

	getTotalArea() {
		return getDataItems().reduce((sum, item) => {
			const area = parseFloat(item?.area) || 0;
			return sum + area;
		}, 0);
	}

	getColorPercentage(color) {
		const colorArea = parseFloat(this.getColorArea(color));
		const totalArea = this.getTotalArea();
		const percentage = totalArea > 0 ? (colorArea / totalArea) * 100 : 0;
		return percentage.toFixed(1);
	}
}
