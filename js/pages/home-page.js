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

function renderOwnMapsDataTable(app, maps, tableId) {
  return `
    <div class="table-responsive">
      <table id="${tableId}" class="table table-striped table-hover align-middle w-100 home-maps-table">
        <thead>
          <tr>
            <th>${escapeHtml(app.t("mapsTableMapName"))}</th>
            <th>${escapeHtml(app.t("mapsTableUpdated"))}</th>
            <th>${escapeHtml(app.t("mapsTableOwner"))}</th>
            <th>${escapeHtml(app.t("mapsTablePermission"))}</th>
            <th>${escapeHtml(app.t("mapsTableParcels"))}</th>
            <th>${escapeHtml(app.t("mapsTableArea"))}</th>
            <th>${escapeHtml(app.t("mapsTableActions"))}</th>
          </tr>
        </thead>
        <tbody>
          ${maps.map((item) => renderOwnMapRow(app, item)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

export function renderHomePage(app) {
  const ownMaps = app.savedSets.filter((item) => item.permission === "owner");
  const canManageBackups = app.user?.username === "ricardo_barros";
  const ownMapsCollapsed = Boolean(app.homeSectionCollapsed?.ownMaps);
  const feedbackEmail = "mailto:rjgdlbarros@gmail.com?subject=" + encodeURIComponent(app.t("feedbackNoteTitle"));
  const menuItems = [
    { key: "sharedMaps", title: app.t("sharedMapsTitle") },
    { key: "etImport", title: app.t("etImportTitle") },
    { key: "weatherStation", title: app.t("weatherStationTitle") },
    { key: "sprayerFlow", title: app.t("sprayerFlowTitle") },
    { key: "lhaCalculator", title: app.t("lhaCalculatorTitle") },
    { key: "nozzleReferences", title: app.t("nozzleReferencesTitle") },
  ];

  return `
    <div class="container-fluid">
      ${renderHeader(app)}
      <div class="home-container container py-3">
        ${renderFlashMessage(app)}
        <div class="home-toolbar d-flex align-items-center gap-2 flex-wrap">
          <aside class="home-side-menu" aria-label="${escapeHtml(app.t("homeMenuTitle"))}">
            <div class="home-side-menu-header">
              <button type="button" class="btn btn-primary home-menu-toggle" id="home-menu-toggle" aria-controls="home-side-menu-items" aria-expanded="false" aria-label="${escapeHtml(app.t("cardMenuAria"))}">${escapeHtml(app.t("homeMenuToggle"))}</button>
            </div>
            <div class="home-side-menu-items" id="home-side-menu-items">
              
              ${menuItems.map((item) => `
                <button type="button" class="btn btn-outline-secondary home-side-menu-item" data-home-card-nav="${item.key}">
                  ${escapeHtml(item.title)}
                </button>
              `).join("")}
              ${canManageBackups ? `
                <div class="home-side-menu-actions">
                  <button type="button" class="btn btn-outline-primary home-side-menu-item" id="home-backup-maps">${escapeHtml(app.t("backup"))}</button>
                  <button type="button" class="btn btn-outline-secondary home-side-menu-item" id="home-restore-maps">${escapeHtml(app.t("restoreBackup"))}</button>
                  <input type="file" id="home-restore-file" class="visually-hidden" accept="application/json,.json">
                </div>
              ` : ""}
            </div>
          </aside>
          <button type="button" class="btn btn-success ms-auto" id="home-new-map">${escapeHtml(app.t("newMap"))}</button>
        </div>
        <div class="home-main-content">
          <div class="home-section card p-3">
            <div class="home-card-header d-flex align-items-center justify-content-between gap-2">
              <h3>${escapeHtml(app.t("myMapsTitle"))}</h3>
              <button type="button" class="home-card-toggle btn btn-link" data-home-section-toggle="ownMaps" aria-expanded="${String(!ownMapsCollapsed)}" aria-label="${ownMapsCollapsed ? app.t("expand") : app.t("navCollapse")} ${escapeHtml(app.t("myMapsTitle"))}">
                <span class="home-card-toggle-icon ${ownMapsCollapsed ? "collapsed" : ""}">▾</span>
              </button>
            </div>
            ${ownMapsCollapsed ? "" : `<div class="home-card-body">${ownMaps.length ? renderOwnMapsDataTable(app, ownMaps, "own-maps-table") : `<div class="empty-saved-sets">${escapeHtml(app.t("emptySavedMaps"))}</div>`}</div>`}
          </div>
          <div class="alert alert-info mt-3 mb-0" role="note">
            <strong>${escapeHtml(app.t("feedbackNoteTitle"))}:</strong> ${escapeHtml(app.t("feedbackNoteBody"))} <a href="${escapeHtml(feedbackEmail)}">email</a>
          </div>
        </div>
      </div>
    </div>
  `;
}
