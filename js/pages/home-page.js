import { escapeHtml, formatDate } from "../utils.js?v=__ASSET_VERSION__";
import { renderHeader } from "./header.js?v=__ASSET_VERSION__";

function getDateSortValue(dateString) {
  const timestamp = Date.parse(dateString || "");
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function renderFlashMessage(app) {
  if (!app.flashMessage?.text) {
    return "";
  }

  return `<div class="app-flash-message ${app.flashMessage.type === "success" ? "success" : "error"}" role="status" aria-live="polite">${escapeHtml(app.flashMessage.text)}</div>`;
}

function renderOpenButtonLabel() {
  return `
    <span class="home-action-button-content">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M15 3h6v6" />
        <path d="M10 14 21 3" />
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      </svg>
    </span>
  `;
}

function renderDeleteButtonLabel() {
  return `
    <span class="home-action-button-content">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 6h18" />
        <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
      </svg>
    </span>
  `;
}

function renderOwnMapRow(app, item) {
  const owner = item.ownerUsername;
  const updatedAt = escapeHtml(formatDate(item.updatedAt));
  const updatedAtOrder = getDateSortValue(item.updatedAt);
  const sharedWith = Array.isArray(item.sharedWithUsernames) ? item.sharedWithUsernames : [];
  const sharedSummary = sharedWith.length ? sharedWith.join(", ") : "-";
  const canDelete = Boolean(item.canDelete);
  const summary = app.getSavedSetSummary(item);
  const selectedCount = summary.count;
  const selectedArea = `${summary.area} ha`;

  return `
    <tr data-home-open-id="${item.id}" class="home-map-row">
      <td><span class="home-map-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span></td>
      <td data-order="${updatedAtOrder}">${updatedAt}</td>
      <td>${escapeHtml(owner)}</td>
      <td>${escapeHtml(sharedSummary)}</td>
      <td>${selectedCount}</td>
      <td>${escapeHtml(selectedArea)}</td>
      <td>
        <div class="btn-group btn-group-sm" role="group" aria-label="Ações do mapa ${escapeHtml(item.name)}">
          <button type="button" class="primary-button btn btn-primary" data-home-open-button-id="${item.id}" onclick="void globalThis.app.loadSet('${item.id}'); return false;" aria-label="Abrir | Editar ${escapeHtml(item.name)}" title="Vêr | Editar: ${escapeHtml(item.name)}">${renderOpenButtonLabel()}</button>
          <button type="button" class="saved-set-delete btn btn-outline-danger" data-delete-id="${item.id}" aria-label="Eliminar ${escapeHtml(item.name)}" title="Eliminar: ${escapeHtml(item.name)}" ${canDelete ? "" : "disabled"}>${renderDeleteButtonLabel()}</button>
        </div>
      </td>
    </tr>
  `;
}

function renderSharedMapRow(app, item) {
  const updatedAt = escapeHtml(formatDate(item.updatedAt));
  const updatedAtOrder = getDateSortValue(item.updatedAt);
  const permission = item.permission === "edit" ? "Edição" : "Leitura";
  const summary = app.getSavedSetSummary(item);
  const selectedCount = summary.count;
  const selectedArea = `${summary.area} ha`;

  return `
    <tr data-home-open-id="${item.id}" class="home-map-row">
      <td><span class="home-map-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span></td>
      <td data-order="${updatedAtOrder}">${updatedAt}</td>
      <td>${escapeHtml(item.ownerUsername)}</td>
      <td>${permission}</td>
      <td>${selectedCount}</td>
      <td>${escapeHtml(selectedArea)}</td>
      <td>
        <div class="btn-group btn-group-sm" role="group" aria-label="Ações do mapa ${escapeHtml(item.name)}">
          <button type="button" class="primary-button btn btn-primary" data-home-open-button-id="${item.id}" onclick="void globalThis.app.loadSet('${item.id}'); return false;" aria-label="Abrir ${escapeHtml(item.name)}" title="Abrir ${escapeHtml(item.name)}">${renderOpenButtonLabel()}</button>
        </div>
      </td>
    </tr>
  `;
}

function renderOwnMapsDataTable(app, maps, tableId) {
  return `
    <div class="table-responsive">
      <table id="${tableId}" class="table table-striped table-hover align-middle w-100 home-maps-table">
        <thead>
          <tr>
            <th>Nome do mapa</th>
            <th>Atualizado</th>
            <th>Proprietário</th>
            <th>Partilha com</th>
            <th>Nº de Parcelas</th>
            <th>Área</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${maps.map((item) => renderOwnMapRow(app, item)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSharedMapsDataTable(app, maps, tableId) {
  return `
    <div class="table-responsive">
      <table id="${tableId}" class="table table-striped table-hover align-middle w-100 home-maps-table">
        <thead>
          <tr>
            <th>Nome do mapa</th>
            <th>Atualizado</th>
            <th>Proprietário</th>
            <th>Permissão</th>
            <th>Nº de Parcelas</th>
            <th>Área</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${maps.map((item) => renderSharedMapRow(app, item)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function formatEtDisplayDate(row) {
  const isoDate = String(row?.dataCompleta || "").trim();
  if (!isoDate) {
    return String(row?.data || row?.dataOriginal || "-");
  }

  const parsedDate = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return String(row?.data || row?.dataOriginal || isoDate);
  }

  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const weekdayLabel = weekdays[parsedDate.getDay()] || "---";
  const [year, month, day] = isoDate.split("-");

  return `${year}-${month}-${day} ${weekdayLabel}`;
}

function formatIdealEtValue(etValue, reductionPercent = 20) {
  const source = String(etValue || "").trim();
  const numericValue = Number.parseFloat(source.replace(",", "."));

  if (!Number.isFinite(numericValue)) {
    return "N/A";
  }

  const normalizedPercent = Number.isFinite(Number(reductionPercent)) ? Number(reductionPercent) : 20;
  const idealValue = numericValue * (1 - (normalizedPercent / 100));
  return idealValue.toFixed(1);
}

function formatEtValueWithoutUnit(etValue) {
  const source = String(etValue || "").trim();
  const numericValue = Number.parseFloat(source.replace(",", "."));

  if (!Number.isFinite(numericValue)) {
    return "N/A";
  }

  return numericValue.toFixed(1);
}

function renderEtRows(rows, reductionPercent) {
  return rows.map((row) => `
    <tr>
      <td>${escapeHtml(formatEtDisplayDate(row))}</td>
      <td>${escapeHtml(formatEtValueWithoutUnit(row?.et || "0mm"))}</td>
      <td>${escapeHtml(formatIdealEtValue(row?.et || "0mm", reductionPercent))}</td>
      <td>${escapeHtml(String(row?.tempMax || "N/A"))}</td>
      <td>${escapeHtml(String(row?.tempMin || "N/A"))}</td>
    </tr>
  `).join("");
}

function renderWeatherStationRows(rows, reductionPercent) {
  return rows.map((row) => `
    <tr>
      <td>${escapeHtml(formatEtDisplayDate({ dataCompleta: row?.readingDate || row?.data }))}</td>
      <td>${escapeHtml(String(row?.precipitacaoMm || "0.00"))}</td>
      <td>${escapeHtml(String(row?.etMm || "0.00"))}</td>
      <td>${escapeHtml(formatWeatherStationIdealEtValue(row?.etMm || "0.00", reductionPercent))}</td>
      <td>${escapeHtml(String(row?.tempMinC || "N/A"))}</td>
      <td>${escapeHtml(String(row?.tempMaxC || "N/A"))}</td>
    </tr>
  `).join("");
}

function formatWeatherStationIdealEtValue(etValue, reductionPercent = 20) {
  const source = String(etValue || "").trim();
  const numericValue = Number.parseFloat(source.replace(",", "."));

  if (!Number.isFinite(numericValue)) {
    return "N/A";
  }

  const normalizedPercent = Number.isFinite(Number(reductionPercent)) ? Number(reductionPercent) : 20;
  const idealValue = numericValue * (1 - (normalizedPercent / 100));
  return `${idealValue.toFixed(2)}`;
}

function renderEtImportSection(app) {
  const importState = app.etImportState || {};
  const rows = Array.isArray(importState.rows) ? importState.rows : [];
  const requestedDate = importState.requestedDate || "";
  const lastImportedAt = importState.lastImportedAt || "";
  const reductionPercent = Number(importState.reductionPercent) || 20;
  const etIdealHeader = `ET (mm) ideal -${reductionPercent}%`;
  const error = importState.error || "";
  const isLoading = Boolean(importState.loading);
  const remainingSeconds = Math.max(0, Number(importState.remainingSeconds) || 0);
  const timeoutSeconds = 90;
  const elapsedSeconds = Math.min(timeoutSeconds, Math.max(1, timeoutSeconds - remainingSeconds + 1));
  const importLabel = isLoading ? `A obter previsão... (${elapsedSeconds}s / ${timeoutSeconds}s)` : "Obter previsão";
  const isCollapsed = Boolean(app.homeSectionCollapsed?.etImport);
  const reductionOptions = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
    .map((value) => `<option value="${value}" ${value === reductionPercent ? "selected" : ""}>${value}%</option>`)
    .join("");

  return `
    <div class="home-section card p-3">
      <div class="home-card-header d-flex align-items-center justify-content-between gap-2">
        <h3 class="mb-0">Evapotranspiração (ET) - PREVISÃO dados IRRISTRAT</h3>
        <button type="button" class="home-card-toggle btn btn-link" data-home-section-toggle="etImport" aria-expanded="${String(!isCollapsed)}" aria-label="${isCollapsed ? "Expandir" : "Colapsar"} card Evapotranspiração">
          <span class="home-card-toggle-icon ${isCollapsed ? "collapsed" : ""}">▾</span>
        </button>
      </div>
      ${isCollapsed ? "" : `
        <div class="home-card-body">
          <div class="home-et-header d-flex align-items-center justify-content-start gap-2 flex-wrap">
            <div class="home-et-controls d-flex align-items-center gap-2 flex-wrap">
              <label for="home-et-reduction-percent" class="form-label mb-0">Fator de redução (plásticos)</label>
              <select id="home-et-reduction-percent" class="form-select form-select-sm home-et-reduction-select">
                ${reductionOptions}
              </select>
              <button type="button" class="btn btn-outline-primary btn-sm" id="home-import-et" ${isLoading ? "disabled" : ""}>
                ${importLabel}
              </button>
            </div>
          </div>
          ${lastImportedAt ? `<div class="home-et-meta text-muted small mt-2">Última previsão obtida: ${escapeHtml(formatDate(lastImportedAt))}</div>` : ""}
          ${error ? `<div class="app-flash-message error mt-2" role="alert">${escapeHtml(error)}</div>` : ""}
          ${rows.length
            ? `
              <div class="table-responsive mt-2">
                <table class="table table-sm table-striped align-middle home-et-table mb-0">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>ET (mm)</th>
                      <th>${escapeHtml(etIdealHeader)}</th>
                      <th>Temp. ºC Máx.</th>
                      <th>Temp. ºC Mín.</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${renderEtRows(rows, reductionPercent)}
                  </tbody>
                </table>
              </div>
            `
            : '<div class="text-muted small mt-2">Sem previsão ET guardada. Clique em "Obter previsão" para importar.</div>'}
        </div>
      `}
    </div>
  `;
}

function renderWeatherStationSection(app) {
  const stationState = app.weatherStationState || {};
  const rows = Array.isArray(stationState.rows) ? stationState.rows : [];
  const requestedDate = stationState.requestedDate || "";
  const lastImportedAt = stationState.lastImportedAt || "";
  const remainingSeconds = Math.max(0, Number(stationState.remainingSeconds) || 0);
  const timeoutSeconds = 90;
  const elapsedSeconds = Math.min(timeoutSeconds, Math.max(1, timeoutSeconds - remainingSeconds + 1));
  const reductionPercent = Number(stationState.reductionPercent) || 20;
  const etIdealHeader = `ET (mm) ideal -${reductionPercent}%`;
  const error = stationState.error || "";
  const isLoading = Boolean(stationState.loading);
  const importLabel = isLoading ? `A obter leituras... (${elapsedSeconds}s / ${timeoutSeconds}s)` : "Obter leitura estação";
  const isCollapsed = Boolean(app.homeSectionCollapsed?.weatherStation);
  const reductionOptions = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
    .map((value) => `<option value="${value}" ${value === reductionPercent ? "selected" : ""}>${value}%</option>`)
    .join("");

  return `
    <div class="home-section card p-3">
      <div class="home-card-header d-flex align-items-center justify-content-between gap-2">
        <h3 class="mb-0">Leituras estação metrológica - dados IRRISTRAT</h3>
        <button type="button" class="home-card-toggle btn btn-link" data-home-section-toggle="weatherStation" aria-expanded="${String(!isCollapsed)}" aria-label="${isCollapsed ? "Expandir" : "Colapsar"} card Leituras estação metrológica">
          <span class="home-card-toggle-icon ${isCollapsed ? "collapsed" : ""}">▾</span>
        </button>
      </div>
      ${isCollapsed ? "" : `
        <div class="home-card-body">
          <div class="home-et-header d-flex align-items-center justify-content-start gap-2 flex-wrap">
            <div class="home-et-controls d-flex align-items-center gap-2 flex-wrap">
              <label for="home-weather-station-reduction-percent" class="form-label mb-0">Fator de redução (plásticos)</label>
              <select id="home-weather-station-reduction-percent" class="form-select form-select-sm home-et-reduction-select">
                ${reductionOptions}
              </select>
              <button type="button" class="btn btn-outline-primary btn-sm" id="home-import-weather-station" ${isLoading ? "disabled" : ""}>
                ${importLabel}
              </button>
            </div>
          </div>
          ${lastImportedAt ? `<div class="home-et-meta text-muted small mt-2">Última leitura obtida: ${escapeHtml(formatDate(lastImportedAt))}</div>` : ""}
          ${error ? `<div class="app-flash-message error mt-2" role="alert">${escapeHtml(error)}</div>` : ""}
          ${rows.length
            ? `
              <div class="table-responsive mt-2">
                <table class="table table-sm table-striped align-middle home-et-table mb-0">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Precipitação (mm)</th>
                      <th>ET (mm)</th>
                      <th>${escapeHtml(etIdealHeader)}</th>
                      <th>Temp. ºC Mín.</th>
                      <th>Temp. Máx.</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${renderWeatherStationRows(rows, reductionPercent)}
                  </tbody>
                </table>
              </div>
            `
            : '<div class="text-muted small mt-2">Sem leituras da estação meteorológica. Clique em "Obter leitura estação" para importar.</div>'}
        </div>
      `}
    </div>
  `;
}

export function renderHomePage(app) {
  const ownMaps = app.savedSets.filter((item) => item.permission === "owner");
  const sharedMaps = app.savedSets.filter((item) => item.permission !== "owner");
  const canManageBackups = app.user?.username === "ricardo_barros";
  const ownMapsCollapsed = Boolean(app.homeSectionCollapsed?.ownMaps);
  const sharedMapsCollapsed = Boolean(app.homeSectionCollapsed?.sharedMaps);

  return `
    <div class="container-fluid">
      ${renderHeader(app)}
      <div class="home-container container py-3">
        ${renderFlashMessage(app)}
        <div class="home-toolbar d-flex align-items-center gap-2 flex-wrap">
          ${canManageBackups ? `
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <button type="button" class="btn btn-outline-primary" id="home-backup-maps">Cópia de segurança</button>
              <button type="button" class="btn btn-outline-secondary" id="home-restore-maps">Restaurar cópia de segurança</button>
              <input type="file" id="home-restore-file" class="visually-hidden" accept="application/json,.json">
            </div>
          ` : ""}
          <button type="button" class="btn btn-success ms-auto" id="home-new-map">Novo mapa</button>
        </div>
        <div class="home-section card p-3">
          <div class="home-card-header d-flex align-items-center justify-content-between gap-2">
            <h3>Os Meus Mapas</h3>
            <button type="button" class="home-card-toggle btn btn-link" data-home-section-toggle="ownMaps" aria-expanded="${String(!ownMapsCollapsed)}" aria-label="${ownMapsCollapsed ? "Expandir" : "Colapsar"} card Os Meus Mapas">
              <span class="home-card-toggle-icon ${ownMapsCollapsed ? "collapsed" : ""}">▾</span>
            </button>
          </div>
          ${ownMapsCollapsed ? "" : `<div class="home-card-body">${ownMaps.length ? renderOwnMapsDataTable(app, ownMaps, "own-maps-table") : '<div class="empty-saved-sets">Sem mapas próprios.</div>'}</div>`}
        </div>
        <div class="home-section card p-3">
          <div class="home-card-header d-flex align-items-center justify-content-between gap-2">
            <h3>Mapas Partilhados Comigo</h3>
            <button type="button" class="home-card-toggle btn btn-link" data-home-section-toggle="sharedMaps" aria-expanded="${String(!sharedMapsCollapsed)}" aria-label="${sharedMapsCollapsed ? "Expandir" : "Colapsar"} card Mapas Partilhados Comigo">
              <span class="home-card-toggle-icon ${sharedMapsCollapsed ? "collapsed" : ""}">▾</span>
            </button>
          </div>
          ${sharedMapsCollapsed ? "" : `<div class="home-card-body">${sharedMaps.length ? renderSharedMapsDataTable(app, sharedMaps, "shared-maps-table") : '<div class="empty-saved-sets">Sem mapas partilhados.</div>'}</div>`}
        </div>
        ${renderEtImportSection(app)}
        ${renderWeatherStationSection(app)}
      </div>
    </div>
  `;
}
