import { COLORS } from "./config.js?v=__ASSET_VERSION__";
import { api } from "./api.js?v=__ASSET_VERSION__";
import { downloadJsonFile, escapeHtml, getDataItems, normalizeStateSignature, readFileAsText } from "./utils.js?v=__ASSET_VERSION__";
import { renderAuthPage } from "./pages/auth-page.js?v=__ASSET_VERSION__";
import { renderHomePage } from "./pages/home-page.js?v=__ASSET_VERSION__";
import { renderHomeCardPage } from "./pages/home-card-page.js?v=__ASSET_VERSION__";
import { renderEditorPage } from "./pages/editor-page.js?v=__ASSET_VERSION__";

export class MapaSVGApp {
	constructor() {
		const defaultEtRequestedDate = new Date().toISOString().slice(0, 10);
		this.showSetores = false;
		this.showPhase1 = false;
		this.showPhase2 = false;
		this.showPhase3 = false;
		this.showQuadraInfo = false;
		this.showSetoresPorCor = false;
		this.zoomLevel = 1.4;
		this.colors = COLORS;
		this.selectedColor = "#FFFFFF";
		this.itemColors = {};
		this.colorNames = {};
		this.notes = "";
		this.savedSets = [];
		this.currentSetId = null;
		this.currentSetName = "";
		this.currentPermission = "owner";
		this.currentIsPublic = false;
		this.viewMode = "home";
		this.homeCardPage = null;
		this.lastSavedSignature = "";
		this.user = null;
		this.shares = [];
		this.availableUsers = [];
		this.shareUserFilter = "";
		this.shareDraft = {};
		this.authMode = "login";
		this.authError = "";
		this.isSaving = false;
		this.flashMessage = null;
		this.flashMessageTimeout = null;
		this.etImportCountdownInterval = null;
		this.weatherStationImportCountdownInterval = null;
		this.homeSectionCollapsed = {
			ownMaps: false,
			sharedMaps: true,
			etImport: true,
			weatherStation: true,
			sprayerFlow: true,
			lhaCalculator: true,
		};
		this.editorCardState = {
			agronicSummary: {
				collapsed: false,
				hideOnPrint: false,
			},
			editorEt: {
				collapsed: false,
				hideOnPrint: false,
			},
		};
		this.etImportState = {
			loading: false,
			error: "",
			rows: [],
			lastImportedAt: "",
			remainingSeconds: 0,
			reductionPercent: 20,
			requestedDate: defaultEtRequestedDate,
		};
		this.weatherStationState = {
			loading: false,
			error: "",
			rows: [],
			lastImportedAt: "",
			remainingSeconds: 0,
			reductionPercent: 20,
			requestedDate: defaultEtRequestedDate,
		};
		this.sprayerFlowConfig = {
			nozzles: 14,
			rowSpacing: 3.3,
			speedKmH: 5,
		};
		this.lhaCalculatorConfig = {
			caudal: {
				litrosHectare: 400,
				larguraTrabalho: 5,
				velocidade: 6,
				numBoquilhas: 10,
			},
			produtoAplicado: {
				caudalBoquilha: 2.5,
				numBoquilhas: 12,
				larguraTrabalho: 4.5,
				velocidade: 5,
			},
			velocidade: {
				caudalBoquilha: 3,
				numBoquilhas: 10,
				larguraTrabalho: 5,
				litrosHectare: 450,
			},
		};
		this.handleAppClick = this.handleAppClick.bind(this);
		this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
		this.handleHashChange = this.handleHashChange.bind(this);
		this.init();
	}

	async init() {
		this.resetWorkingSet();
		this.authMode = this.getAuthModeFromHash();
		document.getElementById("app")?.addEventListener("click", this.handleAppClick);
		window.addEventListener("beforeunload", this.handleBeforeUnload);
		window.addEventListener("hashchange", this.handleHashChange);
		this.render();

		try {
			this.user = await api.me();
		} catch {
			api.logout();
			this.user = null;
		}

		if (this.user) {
			await this.refreshMaps();
		}

		this.render();
	}

	applyEtHistory(history) {
		const requestedDate = String(history?.requestedDate || "").trim() || new Date().toISOString().slice(0, 10);
		const rows = Array.isArray(history?.rows) ? history.rows : [];
		const lastImportedAt = String(history?.lastImportedAt || "").trim();

		this.etImportState = {
			...this.etImportState,
			loading: false,
			error: "",
			rows,
			lastImportedAt,
			remainingSeconds: 0,
			reductionPercent: Number.isFinite(Number(this.etImportState?.reductionPercent)) ? Number(this.etImportState.reductionPercent) : 20,
			requestedDate,
		};
	}

	updateEtIdealReductionPercent(value) {
		const numericValue = Number.parseInt(String(value || "20"), 10);
		const allowedValues = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
		const reductionPercent = allowedValues.includes(numericValue) ? numericValue : 20;

		this.etImportState = {
			...this.etImportState,
			reductionPercent,
		};
		this.render();
	}

	applyWeatherStationHistory(history) {
		const requestedDate = String(history?.requestedDate || "").trim() || new Date().toISOString().slice(0, 10);
		const rows = Array.isArray(history?.rows) ? history.rows : [];
		const lastImportedAt = String(history?.lastImportedAt || "").trim();

		this.weatherStationState = {
			...this.weatherStationState,
			loading: false,
			error: "",
			rows,
			lastImportedAt,
			remainingSeconds: 0,
			reductionPercent: Number.isFinite(Number(this.weatherStationState?.reductionPercent)) ? Number(this.weatherStationState.reductionPercent) : 20,
			requestedDate,
		};
	}

	updateWeatherStationIdealReductionPercent(value) {
		const numericValue = Number.parseInt(String(value || "20"), 10);
		const allowedValues = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
		const reductionPercent = allowedValues.includes(numericValue) ? numericValue : 20;

		this.weatherStationState = {
			...this.weatherStationState,
			reductionPercent,
		};
		this.render();
	}

	updateSprayerFlowConfig(values = {}, uiState = {}) {
		const nextConfig = { ...this.sprayerFlowConfig };

		if (Object.prototype.hasOwnProperty.call(values, "nozzles")) {
			const nozzles = Number.parseInt(String(values.nozzles).replace(",", "."), 10);
			if (Number.isFinite(nozzles) && nozzles > 0) {
				nextConfig.nozzles = nozzles;
			}
		}

		if (Object.prototype.hasOwnProperty.call(values, "rowSpacing")) {
			const rowSpacing = Number.parseFloat(String(values.rowSpacing).replace(",", "."));
			if (Number.isFinite(rowSpacing) && rowSpacing > 0) {
				nextConfig.rowSpacing = rowSpacing;
			}
		}

		if (Object.prototype.hasOwnProperty.call(values, "speedKmH")) {
			const speedKmH = Number.parseFloat(String(values.speedKmH).replace(",", "."));
			if (Number.isFinite(speedKmH) && speedKmH > 0) {
				nextConfig.speedKmH = speedKmH;
			}
		}

		this.sprayerFlowConfig = nextConfig;

		const scrollX = window.scrollX;
		const scrollY = window.scrollY;
		const focusId = typeof uiState.focusId === "string" ? uiState.focusId : "";
		const selectionStart = Number.isInteger(uiState.selectionStart) ? uiState.selectionStart : null;
		const selectionEnd = Number.isInteger(uiState.selectionEnd) ? uiState.selectionEnd : null;

		this.render();

		window.scrollTo(scrollX, scrollY);

		if (focusId) {
			const focusedInput = document.getElementById(focusId);
			if (focusedInput instanceof HTMLInputElement) {
				focusedInput.focus({ preventScroll: true });
				if (selectionStart !== null && selectionEnd !== null) {
					const safeStart = Math.max(0, Math.min(selectionStart, focusedInput.value.length));
					const safeEnd = Math.max(safeStart, Math.min(selectionEnd, focusedInput.value.length));
					focusedInput.setSelectionRange(safeStart, safeEnd);
				}
			}
		}
	}

	updateLhaCalculatorConfig(sectionKey, fieldKey, value, uiState = {}) {
		if (!sectionKey || !fieldKey || !(sectionKey in this.lhaCalculatorConfig)) {
			return;
		}

		const currentSection = this.lhaCalculatorConfig[sectionKey];
		if (!currentSection || !(fieldKey in currentSection)) {
			return;
		}

		const parsedValue = Number.parseFloat(String(value ?? "").replace(",", "."));
		const normalizedValue = Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : currentSection[fieldKey];

		this.lhaCalculatorConfig = {
			...this.lhaCalculatorConfig,
			[sectionKey]: {
				...currentSection,
				[fieldKey]: normalizedValue,
			},
		};

		const scrollX = window.scrollX;
		const scrollY = window.scrollY;
		const focusId = typeof uiState.focusId === "string" ? uiState.focusId : "";
		const selectionStart = Number.isInteger(uiState.selectionStart) ? uiState.selectionStart : null;
		const selectionEnd = Number.isInteger(uiState.selectionEnd) ? uiState.selectionEnd : null;

		this.render();

		window.scrollTo(scrollX, scrollY);

		if (focusId) {
			const focusedInput = document.getElementById(focusId);
			if (focusedInput instanceof HTMLInputElement) {
				focusedInput.focus({ preventScroll: true });
				if (selectionStart !== null && selectionEnd !== null) {
					const safeStart = Math.max(0, Math.min(selectionStart, focusedInput.value.length));
					const safeEnd = Math.max(safeStart, Math.min(selectionEnd, focusedInput.value.length));
					focusedInput.setSelectionRange(safeStart, safeEnd);
				}
			}
		}
	}

	getAuthModeFromHash() {
		return window.location.hash === "#register" ? "register" : "login";
	}

	setAuthMode(mode) {
		this.authMode = mode === "register" ? "register" : "login";
		const targetHash = this.authMode === "register" ? "#register" : "#login";
		if (window.location.hash !== targetHash) {
			window.history.replaceState(null, "", targetHash);
		}
	}

	handleHashChange() {
		if (this.user) {
			return;
		}

		const nextMode = this.getAuthModeFromHash();
		if (nextMode === this.authMode) {
			return;
		}

		this.authMode = nextMode;
		this.authError = "";
		this.render();
	}

	get isReadOnly() {
		return this.currentPermission === "read";
	}

	get isOwner() {
		return this.currentPermission === "owner";
	}

	createDefaultItemColors() {
		const defaultColor = this.colors.find((colorItem) => colorItem.id === 2)?.color || "#f3a8a8";
		const itemColors = {};

		getDataItems().forEach((item) => {
			itemColors[item.dataName] = defaultColor;
		});

		return itemColors;
	}

	normalizeObject(value, fallback = {}) {
		if (value && typeof value === "object" && !Array.isArray(value)) {
			return value;
		}

		if (typeof value === "string") {
			try {
				const parsed = JSON.parse(value);
				if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
					return parsed;
				}
			} catch {
				return fallback;
			}
		}

		return fallback;
	}

	resetWorkingSet() {
		const shouldKeepAvailableUsers = Boolean(this.user);
		this.selectedColor = "#FFFFFF";
		this.itemColors = this.createDefaultItemColors();
		this.colorNames = {};
		this.notes = "";
		this.currentSetId = null;
		this.currentSetName = this.generateSetName();
		this.currentPermission = "owner";
		this.currentIsPublic = false;
		this.shares = [];
		if (!shouldKeepAvailableUsers) {
			this.availableUsers = [];
		}
		this.shareUserFilter = "";
		this.shareDraft = {};
		this.markCurrentStateAsSaved();
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
			shareDraft: this.getShareDraftComparable(),
		};
	}

	getShareDraftComparable() {
		if (!this.isOwner) {
			return [];
		}

		return Object.entries(this.shareDraft)
			.filter(([, config]) => Boolean(config?.shared))
			.map(([username, config]) => ({ username, canEdit: Boolean(config?.canEdit) }))
			.sort((left, right) => left.username.localeCompare(right.username));
	}

	markCurrentStateAsSaved() {
		this.lastSavedSignature = normalizeStateSignature(this.createComparableState());
	}

	hasUnsavedChanges() {
		if (this.viewMode !== "editor") {
			return false;
		}

		return normalizeStateSignature(this.createComparableState()) !== this.lastSavedSignature;
	}

	applyMap(map) {
		this.currentSetId = map.id;
		this.currentSetName = map.name;
		this.currentPermission = map.permission || "read";
		this.currentIsPublic = Boolean(map.isPublic);
		this.selectedColor = "#FFFFFF";
		const itemColors = this.normalizeObject(map.itemColors, {});
		const colorNames = this.normalizeObject(map.colorNames, {});
		this.itemColors = { ...this.createDefaultItemColors(), ...itemColors };
		this.colorNames = { ...colorNames };
		this.notes = map.notes || "";
		this.shareDraft = {};
		this.markCurrentStateAsSaved();
	}

	buildShareDraftFromCurrentShares() {
		const nextDraft = {};
		this.availableUsers.forEach((user) => {
			nextDraft[user.username] = { shared: false, canEdit: false };
		});

		this.shares.forEach((share) => {
			nextDraft[share.username] = {
				shared: true,
				canEdit: Boolean(share.canEdit),
			};
		});

		this.shareDraft = nextDraft;
	}

	async syncMapShares(mapId) {
		if (!this.isOwner || !mapId) {
			return;
		}

		const currentShares = await api.listShares(mapId);
		const desiredEntries = Object.entries(this.shareDraft).filter(([, config]) => Boolean(config?.shared));
		const desiredUsernames = new Set(desiredEntries.map(([username]) => username));

		for (const [username, config] of desiredEntries) {
			const targetUser = this.availableUsers.find((user) => user.username === username);
			if (!targetUser) {
				continue;
			}

			await api.upsertShare(
				mapId,
				{ userId: targetUser.id, username: targetUser.username },
				Boolean(config?.canEdit),
			);
		}

		for (const share of currentShares) {
			if (!desiredUsernames.has(share.username)) {
				await api.deleteShare(mapId, share.id);
			}
		}

		this.shares = await api.listShares(mapId);
		this.buildShareDraftFromCurrentShares();
		this.markCurrentStateAsSaved();
	}

	async refreshMaps(selectMapId = null) {
		const [maps, users, etHistory, weatherStationHistory] = await Promise.all([
			api.listMaps(),
			api.listUsers(),
			api.getEtHistory(),
			api.getWeatherStationHistory(),
		]);
		this.savedSets = this.sortSavedSets(maps);
		this.availableUsers = Array.isArray(users) ? users : [];
		this.applyEtHistory(etHistory);
		this.applyWeatherStationHistory(weatherStationHistory);

		if (!this.savedSets.length) {
			this.resetWorkingSet();
			this.viewMode = "home";
			return;
		}

		if (selectMapId) {
			const selected = this.savedSets.find((item) => item.id === selectMapId) || this.savedSets[0];
			this.applyMap(selected);
			if (this.isOwner && this.currentSetId) {
				this.shares = await api.listShares(this.currentSetId);
				this.buildShareDraftFromCurrentShares();
				this.markCurrentStateAsSaved();
			} else {
				this.shares = [];
				this.shareDraft = {};
			}
			this.viewMode = "editor";
			return;
		}

		if (this.viewMode === "editor" && this.currentSetId) {
			const current = this.savedSets.find((item) => item.id === this.currentSetId);
			if (current) {
				this.applyMap(current);
				if (this.isOwner) {
					this.shares = await api.listShares(current.id);
					this.buildShareDraftFromCurrentShares();
					this.markCurrentStateAsSaved();
				} else {
					this.shares = [];
					this.shareDraft = {};
				}
				return;
			}
		}

		this.currentSetId = null;
		this.currentSetName = "";
		this.currentPermission = "owner";
		this.currentIsPublic = false;
		this.shares = [];
		this.shareDraft = {};
		this.viewMode = "home";
	}

	confirmDiscardUnsavedChanges() {
		if (!this.hasUnsavedChanges()) {
			return true;
		}

		return window.confirm("Existem alterações por guardar. Pretende descartá-las?");
	}

	async loadSet(setId, skipDirtyCheck = false) {
		if (!skipDirtyCheck && !this.confirmDiscardUnsavedChanges()) {
			return;
		}

		const selected = this.savedSets.find((item) => item.id === setId);
		if (!selected) {
			return;
		}

		this.applyMap(selected);
		this.viewMode = "editor";
		if (this.isOwner) {
			this.shares = await api.listShares(selected.id);
			this.buildShareDraftFromCurrentShares();
			this.markCurrentStateAsSaved();
		} else {
			this.shares = [];
			this.shareDraft = {};
		}
		this.render();
	}

	async persistCurrentSet(asNew = false) {
		if (!this.user) {
			return;
		}

		if (this.isReadOnly) {
			window.alert("Este mapa é só de leitura.");
			return;
		}

		this.syncEditorFieldsToState();

		const payload = {
			name: (this.currentSetName || "").trim() || this.generateSetName(),
			...this.createSnapshot(),
		};

		const isCreating = !this.currentSetId || asNew;
		this.isSaving = true;
		this.render();

		try {
			let saved;
			if (isCreating) {
				saved = await api.createMap(payload);
			} else {
				saved = await api.updateMap(this.currentSetId, payload);
			}

			if (saved?.id && (this.isOwner || isCreating)) {
				await this.syncMapShares(saved.id);
			}

			this.viewMode = "home";
			await this.refreshMaps();
			this.setFlashMessage("success", isCreating ? "Mapa guardado com sucesso." : "Mapa atualizado com sucesso.");
		} catch (error) {
			window.alert(error.message || "Não foi possível guardar o mapa.");
		} finally {
			this.isSaving = false;
			this.render();
		}
	}

	async deleteSet(setId) {
		const target = this.savedSets.find((item) => item.id === setId);
		if (!target) {
			return;
		}

		if (!target.canDelete) {
			window.alert("Só o proprietário pode apagar o mapa.");
			return;
		}

		const shouldDelete = window.confirm(`Apagar o mapa "${target.name}"?`);
		if (!shouldDelete) {
			return;
		}

		await api.deleteMap(setId);
		await this.refreshMaps();
		this.render();
	}

	async copyCurrentMap() {
		if (!this.currentSetId || !this.isOwner) {
			window.alert("Só pode copiar mapas seus.");
			return;
		}

		const copied = await api.copyMap(this.currentSetId);
		await this.refreshMaps(copied.id);
		this.render();
	}

	async backupMaps() {
		if (!this.user) {
			return;
		}

		try {
			const payload = await api.backupMaps();
			const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
			downloadJsonFile(`ocmapas-backup-${stamp}.json`, payload);
			this.setFlashMessage("success", "Backup descarregado com sucesso.");
			this.render();
		} catch (error) {
			window.alert(error.message || "Não foi possível criar o backup dos mapas.");
		}
	}

	async importEtData() {
		if (!this.user || this.etImportState.loading) {
			return;
		}

		const timeoutMs = 90000;
		const timeoutSeconds = Math.ceil(timeoutMs / 1000);
		this.etImportState = {
			...this.etImportState,
			loading: true,
			error: "",
			remainingSeconds: timeoutSeconds,
		};
		this.startEtImportCountdown(timeoutSeconds);
		this.render();

		try {
			const history = await api.importEt("", timeoutMs);
			this.applyEtHistory(history);
			this.setFlashMessage("success", `Previsão ET obtida: ${this.etImportState.rows.length} registo(s).`);
		} catch (error) {
			this.etImportState = {
				...this.etImportState,
				loading: false,
				error: error.message || "Não foi possível obter a previsão ET.",
				remainingSeconds: 0,
			};
		} finally {
			this.stopEtImportCountdown();
		}

		this.render();
	}

	async loadEtHistoryData() {
		if (!this.user || this.etImportState.loading) {
			return;
		}

		const requestedDate = document.getElementById("home-et-date")?.value || this.etImportState.requestedDate;
		this.etImportState = {
			...this.etImportState,
			loading: true,
			error: "",
			requestedDate,
		};
		this.render();

		try {
			const history = await api.getEtHistory(requestedDate);
			this.applyEtHistory(history);
			if (this.etImportState.rows.length) {
				this.setFlashMessage("success", `Histórico ET carregado: ${this.etImportState.rows.length} registo(s).`);
			} else {
				this.setFlashMessage("success", "Sem histórico ET guardado para a data selecionada.");
			}
		} catch (error) {
			this.etImportState = {
				...this.etImportState,
				loading: false,
				error: error.message || "Não foi possível carregar o histórico ET.",
				remainingSeconds: 0,
			};
		}

		this.render();
	}

	async importWeatherStationData() {
		if (!this.user || this.weatherStationState.loading) {
			return;
		}

		const timeoutMs = 90000;
		const timeoutSeconds = Math.ceil(timeoutMs / 1000);
		this.weatherStationState = {
			...this.weatherStationState,
			loading: true,
			error: "",
			remainingSeconds: timeoutSeconds,
		};
		this.startWeatherStationImportCountdown(timeoutSeconds);
		this.render();

		try {
			const history = await api.importWeatherStation("", timeoutMs);
			this.applyWeatherStationHistory(history);
			this.setFlashMessage("success", `Leituras da estação obtidas: ${this.weatherStationState.rows.length} registo(s).`);
		} catch (error) {
			this.weatherStationState = {
				...this.weatherStationState,
				loading: false,
				error: error.message || "Não foi possível importar dados da estação meteorológica.",
				remainingSeconds: 0,
			};
		} finally {
			this.stopWeatherStationImportCountdown();
		}

		this.render();
	}

	async loadWeatherStationHistoryData() {
		if (!this.user || this.weatherStationState.loading) {
			return;
		}

		const requestedDate = document.getElementById("home-weather-station-date")?.value || this.weatherStationState.requestedDate;
		this.weatherStationState = {
			...this.weatherStationState,
			loading: true,
			error: "",
			requestedDate,
		};
		this.render();

		try {
			const history = await api.getWeatherStationHistory(requestedDate);
			this.applyWeatherStationHistory(history);
			if (this.weatherStationState.rows.length) {
				this.setFlashMessage("success", `Histórico da estação meteorológica carregado: ${this.weatherStationState.rows.length} registo(s).`);
			} else {
				this.setFlashMessage("success", "Sem histórico da estação meteorológica guardado para a data selecionada.");
			}
		} catch (error) {
			this.weatherStationState = {
				...this.weatherStationState,
				loading: false,
				error: error.message || "Não foi possível carregar o histórico da estação meteorológica.",
			};
		}

		this.render();
	}

	startEtImportCountdown(startSeconds) {
		this.stopEtImportCountdown();

		let secondsLeft = Math.max(0, Number(startSeconds) || 0);
		this.etImportState = {
			...this.etImportState,
			remainingSeconds: secondsLeft,
		};

		this.etImportCountdownInterval = window.setInterval(() => {
			if (!this.etImportState.loading) {
				this.stopEtImportCountdown();
				return;
			}

			secondsLeft = Math.max(0, secondsLeft - 1);
			this.etImportState = {
				...this.etImportState,
				remainingSeconds: secondsLeft,
			};
			this.render();

			if (secondsLeft <= 0) {
				this.stopEtImportCountdown();
			}
		}, 1000);
	}

	startWeatherStationImportCountdown(startSeconds) {
		this.stopWeatherStationImportCountdown();

		let secondsLeft = Math.max(0, Number(startSeconds) || 0);
		this.weatherStationState = {
			...this.weatherStationState,
			remainingSeconds: secondsLeft,
		};

		this.weatherStationImportCountdownInterval = window.setInterval(() => {
			if (!this.weatherStationState.loading) {
				this.stopWeatherStationImportCountdown();
				return;
			}

			secondsLeft = Math.max(0, secondsLeft - 1);
			this.weatherStationState = {
				...this.weatherStationState,
				remainingSeconds: secondsLeft,
			};
			this.render();

			if (secondsLeft <= 0) {
				this.stopWeatherStationImportCountdown();
			}
		}, 1000);
	}

	stopEtImportCountdown() {
		if (this.etImportCountdownInterval) {
			window.clearInterval(this.etImportCountdownInterval);
			this.etImportCountdownInterval = null;
		}
	}

	stopWeatherStationImportCountdown() {
		if (this.weatherStationImportCountdownInterval) {
			window.clearInterval(this.weatherStationImportCountdownInterval);
			this.weatherStationImportCountdownInterval = null;
		}
	}

	async restoreMapsFromBackupFile(file) {
		if (!file || !this.user) {
			return;
		}

		try {
			const fileText = await readFileAsText(file);
			const parsed = JSON.parse(fileText);
			const mapsToRestore = Array.isArray(parsed)
				? parsed
				: Array.isArray(parsed?.maps)
					? parsed.maps
					: Array.isArray(parsed?.savedSets)
						? parsed.savedSets
						: [];

			if (!mapsToRestore.length) {
				throw new Error("O ficheiro não contém mapas para restaurar.");
			}

			let firstCreatedId = null;
			let restoredCount = 0;
			for (let index = 0; index < mapsToRestore.length; index += 1) {
				const item = mapsToRestore[index] || {};
				const created = await api.createMap({
					name: (item.name || `Restaurado ${index + 1}`).trim(),
					itemColors: item.itemColors || item.item_colors || {},
					colorNames: item.colorNames || item.color_names || {},
					notes: typeof item.notes === "string" ? item.notes : "",
				});

				if (!firstCreatedId) {
					firstCreatedId = created.id;
				}

				if (item.isPublic === true) {
					await api.updateVisibility(created.id, true);
				}

				const shares = Array.isArray(item.shares) ? item.shares : [];
				for (const share of shares) {
					const username = String(share?.username || "").trim();
					if (!username) {
						continue;
					}

					const targetUser = this.availableUsers.find((user) => user.username === username);
					if (!targetUser || targetUser.username === this.user.username) {
						continue;
					}

					await api.upsertShare(
						created.id,
						{ userId: targetUser.id, username: targetUser.username },
						Boolean(share?.canEdit),
					);
				}

				restoredCount += 1;
			}

			await this.refreshMaps(firstCreatedId || undefined);
			this.setFlashMessage("success", `Restauro concluído: ${restoredCount} mapa(s) importado(s).`);
			this.render();
		} catch (error) {
			window.alert(error.message || "Não foi possível restaurar o backup.");
		}
	}

	exportSavedSets() {
		const payload = {
			app: "OCMapas",
			version: 2.0,
			exportedAt: new Date().toISOString(),
			savedSets: this.savedSets.map((item) => ({
				name: item.name,
				itemColors: item.itemColors,
				colorNames: item.colorNames,
				notes: item.notes,
				createdAt: item.createdAt,
				updatedAt: item.updatedAt,
			})),
		};
		downloadJsonFile("ocmapas-mapas.json", payload);
	}

	async importSavedSets(file) {
		if (!file || !this.user) {
			return;
		}

		try {
			const fileText = await readFileAsText(file);
			const parsed = JSON.parse(fileText);
			const importedSets = Array.isArray(parsed) ? parsed : parsed?.savedSets;

			if (!Array.isArray(importedSets)) {
				throw new Error("O ficheiro não contém uma lista válida de mapas.");
			}

			let firstId = null;
			for (let index = 0; index < importedSets.length; index += 1) {
				const item = importedSets[index] || {};
				const created = await api.createMap({
					name: (item.name || `Importado ${index + 1}`).trim(),
					itemColors: item.itemColors || {},
					colorNames: item.colorNames || {},
					notes: typeof item.notes === "string" ? item.notes : "",
				});
				if (!firstId) {
					firstId = created.id;
				}
			}

			await this.refreshMaps(firstId || undefined);
			this.render();
		} catch (error) {
			window.alert(error.message || "Não foi possível importar o ficheiro selecionado.");
		}
	}

	async handleAuthSubmit(mode) {
		const username = document.getElementById("auth-username")?.value || "";
		const email = document.getElementById("auth-email")?.value || "";
		const password = document.getElementById("auth-password")?.value || "";
		const passwordConfirm = document.getElementById("auth-password-confirm")?.value || "";

		this.authError = "";
		this.render();

		if (mode === "register" && password !== passwordConfirm) {
			this.authError = "A confirmação da password não coincide.";
			this.render();
			return;
		}

		try {
			this.user = mode === "register"
				? await api.register(username, email, password)
				: await api.login(username, password);
			await this.refreshMaps();
			this.render();
		} catch (error) {
			this.authError = error.message || "Falha de autenticação.";
			this.render();
		}
	}

	logout() {
		api.logout();
		this.user = null;
		this.stopEtImportCountdown();
		this.stopWeatherStationImportCountdown();
		this.setAuthMode("login");
		this.authError = "";
		this.clearFlashMessage();
		this.savedSets = [];
		this.etImportState = {
			loading: false,
			error: "",
			rows: [],
			lastImportedAt: "",
			remainingSeconds: 0,
			reductionPercent: 20,
			requestedDate: new Date().toISOString().slice(0, 10),
		};
		this.weatherStationState = {
			loading: false,
			error: "",
			rows: [],
			lastImportedAt: "",
			remainingSeconds: 0,
			reductionPercent: 20,
			requestedDate: new Date().toISOString().slice(0, 10),
		};
		this.resetWorkingSet();
		this.viewMode = "home";
		this.render();
	}

	setFlashMessage(type, text) {
		if (this.flashMessageTimeout) {
			window.clearTimeout(this.flashMessageTimeout);
			this.flashMessageTimeout = null;
		}

		this.flashMessage = { type, text };
		this.flashMessageTimeout = window.setTimeout(() => {
			this.flashMessage = null;
			this.flashMessageTimeout = null;
			this.render();
		}, 4000);
	}

	clearFlashMessage() {
		if (this.flashMessageTimeout) {
			window.clearTimeout(this.flashMessageTimeout);
			this.flashMessageTimeout = null;
		}

		this.flashMessage = null;
	}

	goHome() {
		if (this.viewMode === "editor" && !this.confirmDiscardUnsavedChanges()) {
			return;
		}

		this.viewMode = "home";
		this.homeCardPage = null;
		this.render();
	}

	openHomeCardPage(cardKey) {
		const allowedCards = ["sharedMaps", "etImport", "weatherStation", "sprayerFlow", "lhaCalculator", "nozzleReferences"];
		if (!allowedCards.includes(cardKey)) {
			return;
		}

		this.homeSectionCollapsed = {
			...this.homeSectionCollapsed,
			[cardKey]: false,
		};
		this.homeCardPage = cardKey;
		this.viewMode = "homeCard";
		this.render();
	}

	closeHomeCardPage() {
		this.homeCardPage = null;
		this.viewMode = "home";
		this.render();
	}

	render() {
		const app = document.getElementById("app");

		if (!this.user) {
			app.innerHTML = renderAuthPage(this);
			this.attachEventListeners();
			return;
		}

		if (this.viewMode === "home") {
			app.innerHTML = renderHomePage(this);
			this.attachEventListeners();
			this.initializeHomeDataTables();
			return;
		}

		if (this.viewMode === "homeCard") {
			app.innerHTML = renderHomeCardPage(this);
			this.attachEventListeners();
			this.initializeHomeDataTables();
			return;
		}

		app.innerHTML = renderEditorPage(this);

		this.attachEventListeners();
	}

	initializeHomeDataTables() {
		if (this.viewMode !== "home") {
			if (this.viewMode !== "homeCard") {
				return;
			}
		}

		const jq = window.jQuery;
		if (!jq || !jq.fn || !jq.fn.DataTable) {
			return;
		}

		["own-maps-table", "shared-maps-page-table"].forEach((tableId) => {
			const table = document.getElementById(tableId);
			if (!table) {
				return;
			}

			if (jq.fn.dataTable.isDataTable(table)) {
				jq(table).DataTable().destroy();
			}

			const isOwnMapsTable = tableId === "own-maps-table";
			jq(table).DataTable({
				pageLength: 10,
				lengthChange: true,
				lengthMenu: [[10, 20, -1], [10, 20, "Todos"]],
				order: [[1, "desc"]],
				columnDefs: [{ targets: [6], orderable: false, searchable: false }],
				language: {
					search: "Pesquisar:",
					lengthMenu: `Mostrar _MENU_ ${isOwnMapsTable ? "mapas" : "mapas partilhados"}`,
					zeroRecords: "Sem resultados",
					info: "A mostrar _START_ a _END_ de _TOTAL_ mapas",
					infoEmpty: "Sem mapas",
					paginate: {
						first: "Primeira",
						last: "Última",
						next: "Seguinte",
						previous: "Anterior",
					},
				},
			});
		});
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

		const disabled = this.isReadOnly ? "disabled" : "";
		return `
			<div class="color-row">
				<button type="button" class="color-select-button ${isSelected ? "selected" : ""}" data-color="${colorItem.color}" aria-label="Selecionar grupo ${colorItem.id}" aria-pressed="${isSelected}">
					${isSelected ? '<div class="radio-button-inner"></div>' : ""}
				</button>
				<button type="button" class="color-sample" style="${sampleStyle}" data-color="${colorItem.color}" aria-label="Aplicar cor do grupo ${colorItem.id}" ${disabled}></button>
				<div>
					<label class="visually-hidden" for="${groupId}">Notas da cor ${colorItem.id}</label>
					<input type="text" id="${groupId}" class="color-input" placeholder="Notas para esta cor" value="${colorName}" data-color="${colorItem.color}" ${disabled}>
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
		const disabled = this.isReadOnly ? "disabled" : "";
		return `
			<div class="notes-section">
                <label class="set-name-label" for="notes-input">Notas do mapa</label>
				<textarea id="notes-input" class="notes-input" placeholder="Adicione suas notas aqui..." ${disabled}>${notes}</textarea>
			</div>
			
		`;
	}

	async handleAppClick(event) {
		const target = event.target instanceof Element ? event.target : event.target?.parentElement;
		if (!target) {
			return;
		}

		const collapseButton = target.closest("button[data-home-section-toggle]");
		if (collapseButton) {
			event.preventDefault();
			event.stopPropagation();
			const sectionKey = collapseButton.getAttribute("data-home-section-toggle");
			this.toggleHomeSection(sectionKey);
			return;
		}

		const editorCardCollapseButton = target.closest("button[data-editor-card-collapse]");
		if (editorCardCollapseButton) {
			event.preventDefault();
			event.stopPropagation();
			const cardKey = editorCardCollapseButton.getAttribute("data-editor-card-collapse");
			this.toggleEditorCardCollapse(cardKey);
			return;
		}

		const editorCardPrintButton = target.closest("button[data-editor-card-print-toggle]");
		if (editorCardPrintButton) {
			event.preventDefault();
			event.stopPropagation();
			const cardKey = editorCardPrintButton.getAttribute("data-editor-card-print-toggle");
			this.toggleEditorCardPrintVisibility(cardKey);
			return;
		}

		const deleteButton = target.closest(".home-maps-table [data-delete-id]");
		if (deleteButton) {
			event.preventDefault();
			event.stopPropagation();
			const setId = deleteButton.getAttribute("data-delete-id");
			await this.deleteSet(setId);
			return;
		}

		const openButton = target.closest("button[data-home-open-button-id]");
		if (openButton) {
			event.preventDefault();
			event.stopPropagation();
			const setId = openButton.getAttribute("data-home-open-button-id");
			await this.loadSet(setId);
			return;
		}

		const openRow = target.closest("tr[data-home-open-id]");
		if (!openRow || target.closest("button, a, input, label")) {
			return;
		}

		const setId = openRow.getAttribute("data-home-open-id");
		await this.loadSet(setId);
	}

	toggleHomeSection(sectionKey) {
		if (!sectionKey || !(sectionKey in this.homeSectionCollapsed)) {
			return;
		}

		this.homeSectionCollapsed = {
			...this.homeSectionCollapsed,
			[sectionKey]: !this.homeSectionCollapsed[sectionKey],
		};
		this.render();
	}

	toggleEditorCardCollapse(cardKey) {
		if (!cardKey || !(cardKey in this.editorCardState)) {
			return;
		}

		this.editorCardState = {
			...this.editorCardState,
			[cardKey]: {
				...this.editorCardState[cardKey],
				collapsed: !this.editorCardState[cardKey].collapsed,
			},
		};

		this.render();
	}

	toggleEditorCardPrintVisibility(cardKey) {
		if (!cardKey || !(cardKey in this.editorCardState)) {
			return;
		}

		this.editorCardState = {
			...this.editorCardState,
			[cardKey]: {
				...this.editorCardState[cardKey],
				hideOnPrint: !this.editorCardState[cardKey].hideOnPrint,
			},
		};

		this.render();
	}

	buildMapTooltipHtml(item) {
		const linhasArray = Array.isArray(item?.linhas) ? item.linhas : [];
		const linhasValue = linhasArray.length ? linhasArray.join(", ") : "Sem dados";
		const linhasCount = linhasArray.length;

		return `
			<div class="map-tooltip-content">
				<div class="map-tooltip-line"><strong>Nome da quadra:</strong> ${escapeHtml(item?.dataName || "-")}</div>
				<div class="map-tooltip-line"><strong>Área (ha):</strong> ${escapeHtml(item?.area || "-")}</div>
				<div class="map-tooltip-line"><strong>Número do setor de rega:</strong> ${escapeHtml(item?.setorData || "-")}</div>
				<div class="map-tooltip-divider"></div>
				<div class="map-tooltip-construction">(Em construção)</div>
				<div class="map-tooltip-line"><strong>Número de plantas:</strong> ${escapeHtml(item?.nPlantas || "-")}</div>
				<div class="map-tooltip-line"><strong>Número de linhas:</strong> ${escapeHtml(linhasCount)}</div>
				<div class="map-tooltip-line"><strong>Disposição:</strong> ${escapeHtml(linhasValue)}</div>
				<div class="map-tooltip-orientation-title">Orientação (esquerda->direita, sul->norte):</div>
				<img src="assets/tooltip-orientacao.svg?v=__ASSET_VERSION__" alt="Orientação de contagem" class="map-tooltip-image">
			</div>
		`;
	}

	positionMapTooltip(event) {
		const tooltip = document.getElementById("map-tooltip");
		if (!tooltip || tooltip.hidden) {
			return;
		}

		const offset = 14;
		let left = event.clientX + offset;
		let top = event.clientY + offset;

		const { innerWidth, innerHeight } = window;
		const maxLeft = innerWidth - tooltip.offsetWidth - 8;
		const maxTop = innerHeight - tooltip.offsetHeight - 8;

		left = Math.max(8, Math.min(left, maxLeft));
		top = Math.max(8, Math.min(top, maxTop));

		tooltip.style.left = `${left}px`;
		tooltip.style.top = `${top}px`;
	}

	showMapTooltip(itemName, event) {
		const tooltip = document.getElementById("map-tooltip");
		if (!tooltip || !this.showQuadraInfo) {
			return;
		}

		const item = getDataItems().find((dataItem) => dataItem.dataName === itemName);
		if (!item) {
			tooltip.hidden = true;
			return;
		}

		tooltip.innerHTML = this.buildMapTooltipHtml(item);
		tooltip.hidden = false;
		this.positionMapTooltip(event);
	}

	hideMapTooltip() {
		const tooltip = document.getElementById("map-tooltip");
		if (!tooltip) {
			return;
		}

		tooltip.hidden = true;
		tooltip.innerHTML = "";
	}

	attachEventListeners() {
		document.getElementById("auth-submit")?.addEventListener("click", () => this.handleAuthSubmit(this.authMode));
		document.getElementById("auth-switch-mode")?.addEventListener("click", () => {
			this.setAuthMode(this.authMode === "register" ? "login" : "register");
			this.authError = "";
			this.render();
		});

		const setRule = (id, ok) => {
			document.querySelector(`[data-rule="${id}"]`)?.classList.toggle("rule-ok", ok);
		};

		document.getElementById("auth-password-toggle")?.addEventListener("click", () => {
			const input = document.getElementById("auth-password");
			const btn = document.getElementById("auth-password-toggle");
			if (!input || !btn) return;
			const isVisible = input.type === "text";
			input.type = isVisible ? "password" : "text";
			btn.setAttribute("aria-pressed", String(!isVisible));
			btn.setAttribute("aria-label", isVisible ? "Mostrar password" : "Esconder password");
		});

		document.getElementById("auth-password-confirm-toggle")?.addEventListener("click", () => {
			const input = document.getElementById("auth-password-confirm");
			const btn = document.getElementById("auth-password-confirm-toggle");
			if (!input || !btn) return;
			const isVisible = input.type === "text";
			input.type = isVisible ? "password" : "text";
			btn.setAttribute("aria-pressed", String(!isVisible));
			btn.setAttribute("aria-label", isVisible ? "Mostrar confirmação da password" : "Esconder confirmação da password");
		});

		document.getElementById("auth-username")?.addEventListener("input", (e) => {
			const v = e.target.value.trim().toLowerCase();
			setRule("u-min",     v.length >= 6);
			setRule("u-chars",   /^[a-z0-9._]+$/.test(v) && v.length > 0);
			setRule("u-nospace", !/\s/.test(e.target.value) && v.length > 0);
			setRule("u-case",    v.length > 0);
		});

		document.getElementById("auth-password")?.addEventListener("input", (e) => {
			const v = e.target.value;
			setRule("p-min",    v.length >= 9);
			setRule("p-upper",  /[A-Z]/.test(v));
			setRule("p-lower",  /[a-z]/.test(v));
			setRule("p-digit",  /[0-9]/.test(v));
			setRule("p-symbol", /[^a-zA-Z0-9]/.test(v));
			const confirmValue = document.getElementById("auth-password-confirm")?.value || "";
			const hasConfirmField = Boolean(document.querySelector('[data-rule="p-match"]'));
			if (hasConfirmField) {
				setRule("p-match", v.length > 0 && confirmValue.length > 0 && v === confirmValue);
			}
		});

		document.getElementById("auth-password-confirm")?.addEventListener("input", (e) => {
			const passwordValue = document.getElementById("auth-password")?.value || "";
			const confirmValue = e.target.value;
			setRule("p-match", passwordValue.length > 0 && confirmValue.length > 0 && passwordValue === confirmValue);
		});
		document.getElementById("logout-button")?.addEventListener("click", () => this.logout());
		document.getElementById("go-home-button")?.addEventListener("click", () => this.goHome());
		document.getElementById("home-backup-maps")?.addEventListener("click", async () => {
			await this.backupMaps();
		});
		document.getElementById("home-restore-maps")?.addEventListener("click", () => {
			document.getElementById("home-restore-file")?.click();
		});
		document.getElementById("home-restore-file")?.addEventListener("change", async (event) => {
			const [file] = event.target.files || [];
			await this.restoreMapsFromBackupFile(file);
			event.target.value = "";
		});
		document.getElementById("home-new-map")?.addEventListener("click", () => this.handleNewSet());
		document.getElementById("home-menu-toggle")?.addEventListener("click", () => {
			const menuItems = document.getElementById("home-side-menu-items");
			const toggle = document.getElementById("home-menu-toggle");
			if (!menuItems || !toggle) {
				return;
			}

			const willOpen = !menuItems.classList.contains("is-open");
			menuItems.classList.toggle("is-open", willOpen);
			toggle.setAttribute("aria-expanded", String(willOpen));
		});
		document.querySelectorAll("[data-home-card-nav]").forEach((button) => {
			button.addEventListener("click", () => {
				const cardKey = button.getAttribute("data-home-card-nav");
				const menuItems = document.getElementById("home-side-menu-items");
				const toggle = document.getElementById("home-menu-toggle");
				if (window.matchMedia("(max-width: 768px)").matches && menuItems) {
					menuItems.classList.remove("is-open");
					if (toggle) {
						toggle.setAttribute("aria-expanded", "false");
					}
				}
				this.openHomeCardPage(cardKey);
			});
		});
		document.getElementById("home-card-back")?.addEventListener("click", () => this.closeHomeCardPage());
		document.getElementById("home-import-et")?.addEventListener("click", async () => {
			await this.importEtData();
		});
		document.getElementById("home-et-reduction-percent")?.addEventListener("change", (event) => {
			this.updateEtIdealReductionPercent(event.target.value);
		});
		document.getElementById("home-import-weather-station")?.addEventListener("click", async () => {
			await this.importWeatherStationData();
		});
		document.getElementById("home-weather-station-reduction-percent")?.addEventListener("change", (event) => {
			this.updateWeatherStationIdealReductionPercent(event.target.value);
		});
		document.getElementById("sprayer-nozzles-input")?.addEventListener("change", (event) => {
			this.updateSprayerFlowConfig(
				{ nozzles: event.target.value },
				{
					focusId: event.target.id,
					selectionStart: event.target.selectionStart,
					selectionEnd: event.target.selectionEnd,
				},
			);
		});
		document.getElementById("sprayer-row-spacing-input")?.addEventListener("change", (event) => {
			this.updateSprayerFlowConfig(
				{ rowSpacing: event.target.value },
				{
					focusId: event.target.id,
					selectionStart: event.target.selectionStart,
					selectionEnd: event.target.selectionEnd,
				},
			);
		});
		document.getElementById("sprayer-speed-input")?.addEventListener("change", (event) => {
			this.updateSprayerFlowConfig(
				{ speedKmH: event.target.value },
				{
					focusId: event.target.id,
					selectionStart: event.target.selectionStart,
					selectionEnd: event.target.selectionEnd,
				},
			);
		});

		const attachLhaInput = (inputId, sectionKey, fieldKey) => {
			const input = document.getElementById(inputId);
			if (!input) {
				return;
			}

			const handleInputUpdate = (event) => {
				this.updateLhaCalculatorConfig(
					sectionKey,
					fieldKey,
					event.target.value,
					{
						focusId: event.target.id,
						selectionStart: event.target.selectionStart,
						selectionEnd: event.target.selectionEnd,
					},
				);
			};

			input.addEventListener("change", handleInputUpdate);
		};

		attachLhaInput("lha-caudal-litros-hectare", "caudal", "litrosHectare");
		attachLhaInput("lha-caudal-largura", "caudal", "larguraTrabalho");
		attachLhaInput("lha-caudal-velocidade", "caudal", "velocidade");
		attachLhaInput("lha-caudal-boquilhas", "caudal", "numBoquilhas");
		attachLhaInput("lha-produto-caudal", "produtoAplicado", "caudalBoquilha");
		attachLhaInput("lha-produto-boquilhas", "produtoAplicado", "numBoquilhas");
		attachLhaInput("lha-produto-largura", "produtoAplicado", "larguraTrabalho");
		attachLhaInput("lha-produto-velocidade", "produtoAplicado", "velocidade");
		attachLhaInput("lha-velocidade-caudal", "velocidade", "caudalBoquilha");
		attachLhaInput("lha-velocidade-boquilhas", "velocidade", "numBoquilhas");
		attachLhaInput("lha-velocidade-largura", "velocidade", "larguraTrabalho");
		attachLhaInput("lha-velocidade-litros-hectare", "velocidade", "litrosHectare");

		if (!this.user) {
			return;
		}

		document.getElementById("zoom-in")?.addEventListener("click", () => this.handleZoomIn());
		document.getElementById("zoom-out")?.addEventListener("click", () => this.handleZoomOut());
		document.getElementById("toggle-setores")?.addEventListener("click", () => this.toggleSetores());
		document.getElementById("clear-selection")?.addEventListener("click", () => this.clearSelection());
		document.getElementById("toggle-phase1")?.addEventListener("change", (event) => this.togglePhase1(event.target.checked));
		document.getElementById("toggle-phase2")?.addEventListener("change", (event) => this.togglePhase2(event.target.checked));
		document.getElementById("toggle-phase3")?.addEventListener("change", (event) => this.togglePhase3(event.target.checked));
		document.getElementById("toggle-quadra-info")?.addEventListener("change", (event) => this.toggleQuadraInfo(event.target.checked));
		document.getElementById("toggle-setores-por-cor")?.addEventListener("change", (event) => this.toggleSetoresPorCor(event.target.checked));
		document.getElementById("new-set")?.addEventListener("click", () => this.handleNewSet());
		document.getElementById("save-set")?.addEventListener("click", async () => {
			await this.persistCurrentSet(false);
		});
		document.getElementById("save-as-set")?.addEventListener("click", async () => {
			await this.persistCurrentSet(true);
		});
		document.getElementById("copy-own-map")?.addEventListener("click", async () => {
			await this.copyCurrentMap();
		});
		document.getElementById("print-share-map")?.addEventListener("click", async () => {
			await this.handlePrintAndShareMap();
		});
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
			if (btn.closest(".home-maps-table")) {
				return;
			}
			btn.addEventListener("click", async (event) => {
				event.stopPropagation();
				const setId = btn.getAttribute("data-delete-id");
				await this.deleteSet(setId);
			});
		});

		document.getElementById("toggle-public")?.addEventListener("change", async (event) => {
			if (!this.currentSetId || !this.isOwner) {
				return;
			}

			const updated = await api.updateVisibility(this.currentSetId, Boolean(event.target.checked));
			await this.refreshMaps(updated.id);
			this.render();
		});

		document.getElementById("share-user-filter")?.addEventListener("input", (event) => {
			this.shareUserFilter = event.target.value;
			this.render();
		});

		document.querySelectorAll("[data-share-user]").forEach((element) => {
			element.addEventListener("change", (event) => {
				const username = event.currentTarget.getAttribute("data-share-user");
				const isChecked = Boolean(event.currentTarget.checked);
				const current = this.shareDraft[username] || { shared: false, canEdit: false };
				this.shareDraft[username] = {
					shared: isChecked,
					canEdit: isChecked ? current.canEdit : false,
				};
				this.updateDirtyState();
				this.render();
			});
		});

		document.querySelectorAll("[data-share-edit-user]").forEach((element) => {
			element.addEventListener("change", (event) => {
				const username = event.currentTarget.getAttribute("data-share-edit-user");
				const current = this.shareDraft[username] || { shared: false, canEdit: false };
				if (!current.shared) {
					return;
				}
				this.shareDraft[username] = {
					shared: true,
					canEdit: Boolean(event.currentTarget.checked),
				};
				this.updateDirtyState();
			});
		});

		document.querySelectorAll("[data-share-id]").forEach((button) => {
			button.addEventListener("click", async () => {
				if (!this.currentSetId || !this.isOwner) {
					return;
				}
				const shareId = button.getAttribute("data-share-id");
				await api.deleteShare(this.currentSetId, shareId);
				this.shares = await api.listShares(this.currentSetId);
				this.buildShareDraftFromCurrentShares();
				this.render();
			});
		});
		document.getElementById("set-name")?.addEventListener("input", (event) => {
			this.currentSetName = event.target.value;
			this.updateDirtyState();
		});

		document.querySelectorAll("[data-set-id]").forEach((element) => {
			element.addEventListener("click", async (event) => {
				const setId = event.currentTarget.getAttribute("data-set-id");
				await this.loadSet(setId);
			});
		});

		document.querySelectorAll("path[data-item]").forEach((path) => {
			path.addEventListener("mouseenter", (event) => {
				const itemName = event.currentTarget.getAttribute("data-item");
				if (!itemName) {
					return;
				}
				this.showMapTooltip(itemName, event);
			});

			path.addEventListener("mousemove", (event) => {
				this.positionMapTooltip(event);
			});

			path.addEventListener("mouseleave", () => {
				this.hideMapTooltip();
			});

			path.addEventListener("click", (event) => {
				if (this.isReadOnly) {
					return;
				}
				const itemName = event.target.getAttribute("data-item");
				this.handleItemPress(itemName);
			});
		});

		document.querySelectorAll("button[data-color]").forEach((element) => {
			element.addEventListener("click", (event) => {
				if (this.isReadOnly) {
					return;
				}
				const color = event.currentTarget.getAttribute("data-color");
				this.selectColor(color);
			});
		});

		document.querySelectorAll("input[data-color]").forEach((element) => {
			const handleColorInput = (event) => {
				if (this.isReadOnly) {
					return;
				}
				const color = event.currentTarget.getAttribute("data-color");
				if (!color) {
					return;
				}
				this.updateColorName(color, event.currentTarget.value);
			};
			element.addEventListener("input", handleColorInput);
			element.addEventListener("change", handleColorInput);
		});

		const notesInput = document.querySelector(".notes-input");
		if (notesInput) {
			this.adjustNotesInputHeight(notesInput);
			notesInput.addEventListener("input", (event) => {
				this.adjustNotesInputHeight(event.target);
				if (this.isReadOnly) {
					return;
				}
				this.updateNotes(event.target.value);
			});
		}
	}

	adjustNotesInputHeight(textareaElement) {
		if (!(textareaElement instanceof HTMLTextAreaElement)) {
			return;
		}

		textareaElement.style.height = "auto";
		textareaElement.style.height = `${textareaElement.scrollHeight}px`;
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

	clearSelection() {
		const whiteColor = "#FFFFFF";
		getDataItems().forEach((item) => {
			this.itemColors[item.dataName] = whiteColor;
		});
		this.selectedColor = whiteColor;
		this.render();
	}

	togglePhase1(forceValue = null) {
		this.showPhase1 = typeof forceValue === "boolean" ? forceValue : !this.showPhase1;
		this.render();
	}

	togglePhase2(forceValue = null) {
		this.showPhase2 = typeof forceValue === "boolean" ? forceValue : !this.showPhase2;
		this.render();
	}

	togglePhase3(forceValue = null) {
		this.showPhase3 = typeof forceValue === "boolean" ? forceValue : !this.showPhase3;
		this.render();
	}

	toggleQuadraInfo(forceValue = null) {
		this.showQuadraInfo = typeof forceValue === "boolean" ? forceValue : !this.showQuadraInfo;
		this.render();
	}

	toggleSetoresPorCor(forceValue = null) {
		this.showSetoresPorCor = typeof forceValue === "boolean" ? forceValue : !this.showSetoresPorCor;
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

	syncEditorFieldsToState() {
		if (this.viewMode !== "editor") {
			return;
		}

		const setNameInput = document.getElementById("set-name");
		if (setNameInput) {
			this.currentSetName = setNameInput.value;
		}

		const notesInput = document.getElementById("notes-input");
		if (notesInput) {
			this.notes = notesInput.value;
		}

		document.querySelectorAll("input[data-color]").forEach((element) => {
			const color = element.getAttribute("data-color");
			if (!color) {
				return;
			}
			this.colorNames[color] = element.value;
		});
	}

	handleNewSet() {
		if (!this.confirmDiscardUnsavedChanges()) {
			return;
		}

		this.resetWorkingSet();
		this.viewMode = "editor";
		this.markCurrentStateAsSaved();
		this.render();
	}

	async handlePrintAndShareMap() {
		const mapName = (this.currentSetName || "Mapa sem nome").trim() || "Mapa sem nome";
		window.print();

		const shareText = `Mapa ${mapName}`;
		const shareUrl = window.location.href;

		if (navigator.share) {
			try {
				await navigator.share({
					title: mapName,
					text: shareText,
					url: shareUrl,
				});
				return;
			} catch {
				return;
			}
		}

		if (navigator.clipboard?.writeText) {
			try {
				await navigator.clipboard.writeText(shareUrl);
				window.alert("Ligação do mapa copiada para a área de transferência.");
				return;
			} catch {
				return;
			}
		}

		window.alert(`Partilhe esta ligação: ${shareUrl}`);
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

	getColorPlants(color) {
		const selectedItems = Object.keys(this.itemColors).filter((itemName) => this.itemColors[itemName] === color);
		const totalPlants = selectedItems.reduce((sum, itemName) => {
			const item = getDataItems().find((dataItem) => dataItem.dataName === itemName);
			const plants = parseInt(item?.nPlantas, 10) || 0;
			return sum + plants;
		}, 0);
		return totalPlants;
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
