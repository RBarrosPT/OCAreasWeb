import { escapeHtml, formatDate } from "../../utils.js?v=__ASSET_VERSION__";

function getDateSortValue(dateString) {
  const timestamp = Date.parse(dateString || "");
  return Number.isNaN(timestamp) ? 0 : timestamp;
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

function renderSharedMapsDataTable(app, maps, tableId) {
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
          ${maps.map((item) => renderSharedMapRow(app, item)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

export function renderSharedMapsCard(app, options = {}) {
  const tableId = options.tableId || "shared-maps-page-table";
  const title = options.title || app.t("sharedMapsTitle");
  const sharedMaps = app.savedSets.filter((item) => item.permission !== "owner");
  const isCollapsed = Boolean(app.homeSectionCollapsed?.sharedMaps);

  return `
    <div class="home-section card p-3">
      <div class="home-card-header d-flex align-items-center justify-content-between gap-2">
        <h3 class="mb-0">${escapeHtml(title)}</h3>
        <button type="button" class="home-card-toggle btn btn-link" data-home-section-toggle="sharedMaps" aria-expanded="${String(!isCollapsed)}" aria-label="${isCollapsed ? app.t("expand") : app.t("navCollapse")} ${escapeHtml(app.t("sharedMapsTitle"))}">
          <span class="home-card-toggle-icon ${isCollapsed ? "collapsed" : ""}">▾</span>
        </button>
      </div>
      ${isCollapsed ? "" : `<div class="home-card-body">${sharedMaps.length ? renderSharedMapsDataTable(app, sharedMaps, tableId) : `<div class="empty-saved-sets">${escapeHtml(app.t("emptySharedMaps"))}</div>`}</div>`}
    </div>
  `;
}
