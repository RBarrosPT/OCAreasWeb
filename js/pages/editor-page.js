import { escapeHtml, formatDate, getDataItems } from "../utils.js?v=__ASSET_VERSION__";
import { renderHeader } from "./header.js?v=__ASSET_VERSION__";

function renderModal(app) {
  return `
    <div class="modal-overlay" id="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" hidden>
      <div class="modal-panel card shadow-sm">
        <div class="modal-header">
          <span class="modal-title" id="settings-modal-title">Configurações</span>
          <button type="button" class="modal-close btn btn-outline-secondary btn-sm" id="close-settings" aria-label="Fechar definições">✕</button>
        </div>
        <div class="modal-body">
          <button type="button" class="modal-action-button toggle-button btn btn-primary" id="toggle-setores" aria-pressed="${app.showSetores}">
            ${app.showSetores ? "Esconder Setores de Rega" : "Mostrar Setores de Rega"}
          </button>
          <button type="button" class="modal-action-button toggle-button btn btn-danger" id="clear-selection">Limpar seleção</button>
          <label class="modal-action-button form-check d-flex align-items-center gap-2" for="toggle-phase1">
            <input type="checkbox" class="form-check-input mt-0" id="toggle-phase1" ${app.showPhase1 ? "checked" : ""}>
            <span>Mostrar APENAS FASE 1</span>
          </label>
          <label class="modal-action-button form-check d-flex align-items-center gap-2" for="toggle-phase2">
            <input type="checkbox" class="form-check-input mt-0" id="toggle-phase2" ${app.showPhase2 ? "checked" : ""}>
            <span>Mostrar APENAS FASE 2</span>
          </label>
          <label class="modal-action-button form-check d-flex align-items-center gap-2" for="toggle-phase3">
            <input type="checkbox" class="form-check-input mt-0" id="toggle-phase3" ${app.showPhase3 ? "checked" : ""}>
            <span>Mostrar APENAS FASE 3</span>
          </label>
          <!--
          <button type="button" class="modal-action-button secondary-button btn btn-outline-secondary" id="export-sets">Exportar JSON</button>
          <label class="modal-action-button import-button btn btn-outline-secondary" for="import-sets-modal">Importar JSON</label>
          <input type="file" id="import-sets-modal" class="visually-hidden" accept="application/json,.json">
          -->
          </div>
        <span class="color-percentage footer-note">@RB 2025 v1.1</span>
      </div>
    </div>
  `;
}

function renderSVGItems(app) {
  const dataItems = getDataItems();
  if (!dataItems.length) {
    return '<text x="50" y="50" fill="red">Dados não carregados</text>';
  }

  const activePhases = [];
  if (app.showPhase1) activePhases.push("1");
  if (app.showPhase2) activePhases.push("2");
  if (app.showPhase3) activePhases.push("3");
  const filteredItems = activePhases.length
    ? dataItems.filter((item) => activePhases.some((phase) => item.dataName.startsWith(phase)))
    : dataItems;

  return filteredItems
    .map((item) => {
      const itemColor = app.itemColors[item.dataName] || "#f9f9f9ff";
      const colorObj = app.colors.find((colorItem) => colorItem.color === itemColor);
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
            app.showSetores
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

function renderMap(app) {
  const baseViewBoxWidth = 900;
  const baseViewBoxHeight = 1000;
  const mapTitle = escapeHtml((app.currentSetName || "Mapa sem nome").trim() || "Mapa sem nome");
  const readOnlyNote = app.isReadOnly ? '<div class="readonly-badge">Mapa partilhado (só leitura)</div>' : "";

  return `
    <div class="map-container col-12 col-xl-6">
      ${readOnlyNote}
      <div class="map-stage">
        <svg class="map-svg" viewBox="0 0 ${baseViewBoxWidth} ${baseViewBoxHeight}" role="img" aria-label="Mapa interativo de áreas">
          ${renderSVGItems(app)}
        </svg>
        <img
          src="assets/editor-overlay-right.svg?v=__ASSET_VERSION__"
          alt=""
          aria-hidden="true"
          class="editor-right-overlay"
          loading="lazy"
          decoding="async"
        >
      </div>
    </div>
  `;
}

function renderColorRow(app, colorItem) {
  const count = app.getColorCount(colorItem.color);
  const area = app.getColorArea(colorItem.color);
  const percentage = app.getColorPercentage(colorItem.color);
  const isSelected = app.selectedColor === colorItem.color;
  const colorName = escapeHtml(app.colorNames[colorItem.color] || "");
  const groupId = `group-color-${colorItem.id}`;
  const sampleStyle = `background-color: ${colorItem.color}; color: ${colorItem.text};`;
  const disabled = app.isReadOnly ? "disabled" : "";

  return `
    <div class="color-row">
      <button type="button" class="color-select-button ${isSelected ? "selected" : ""}" data-color="${colorItem.color}" aria-label="Selecionar grupo ${colorItem.id}" aria-pressed="${isSelected}">
        ${isSelected ? '<div class="radio-button-inner"></div>' : ""}
      </button>
      <button type="button" class="color-sample" style="${sampleStyle}" data-color="${colorItem.color}" aria-label="Aplicar cor do grupo ${colorItem.id}" ${disabled}></button>
      <div>
        <label class="visually-hidden" for="${groupId}">Notas da cor ${colorItem.id}</label>
        <input type="text" id="${groupId}" class="color-input form-control form-control-sm" placeholder="..." value="${colorName}" data-color="${colorItem.color}" ${disabled}>
      </div>
      <div class="color-stats">
        <span class="color-count">(${count})</span>
        <span class="color-area">${area} ha</span>
        <span class="color-percentage">${percentage}%</span>
      </div>
    </div>
  `;
}

function renderColoredAreaSummary(app) {
  const areaWithoutFirstColor = app.colors
    .slice(1)
    .reduce((total, colorItem) => total + parseFloat(app.getColorArea(colorItem.color)), 0);

  return `<div class="legend-area-summary">Área total selecionada: <strong>${areaWithoutFirstColor.toFixed(2)} ha</strong></div>`;
}

function renderNotesSection(app) {
  const notes = escapeHtml(app.notes);
  const disabled = app.isReadOnly ? "disabled" : "";

  return `
    <div class="notes-section">
      <label class="set-name-label" for="notes-input">Notas do mapa</label>
      <textarea id="notes-input" class="notes-input form-control" rows="5" placeholder="Adicione suas notas aqui..." ${disabled}>${notes}</textarea>
    </div>
  `;
}

function renderShareChooserInline(app) {
  if (!app.isOwner) {
    return "";
  }

  const selectableUsers = app.availableUsers.filter((user) => user.username !== app.user.username);
  const filter = app.shareUserFilter.trim().toLowerCase();
  const filteredUsers = filter ? selectableUsers.filter((user) => user.username.toLowerCase().includes(filter)) : selectableUsers;
  const hasShareTargets = filteredUsers.length > 0;

  const usersRows = filteredUsers
    .map((user) => {
      const config = app.shareDraft[user.username] || { shared: false, canEdit: false };
      const checked = config.shared ? "checked" : "";
      const editChecked = config.canEdit ? "checked" : "";
      const editDisabled = config.shared ? "" : "disabled";

      return `
        <div class="share-user-row">
          <label class="share-user-label">
            <input type="checkbox" data-share-user="${escapeHtml(user.username)}" ${checked}>
            <span>${escapeHtml(user.username)}</span>
          </label>
          <label class="share-edit-label">
            <input type="checkbox" data-share-edit-user="${escapeHtml(user.username)}" ${editChecked} ${editDisabled}>
            <span>Edição</span>
          </label>
        </div>
      `;
    })
    .join("");

  return `
    <div class="inline-share-section">
      <label class="set-name-label" for="share-user-filter">Partilhar com utilizadores</label>
      ${!app.currentSetId ? '<div class="saved-set-meta">Se selecionar utilizadores, o mapa deixa de ser apenas próprio quando guardar.</div>' : ""}
      <!-- <input type="text" id="share-user-filter" class="set-name-input form-control form-control-sm" placeholder="Pesquisar utilizador" value="${escapeHtml(app.shareUserFilter)}"> -->
      <div class="share-users-list" role="list">
        ${
          hasShareTargets
            ? usersRows
            : filter
              ? '<div class="empty-saved-sets">Sem resultados para a pesquisa.</div>'
              : '<div class="empty-saved-sets">Sem utilizadores disponíveis.</div>'
        }
      </div>
    </div>
  `;
}

function renderSavedSetRow(app, item) {
  const isActive = item.id === app.currentSetId;
  const itemName = escapeHtml(item.name);
  const updatedAt = escapeHtml(formatDate(item.updatedAt));
  const { count, area } = app.getSavedSetSummary(item);
  const summary = `${count} | ${area} ha`;

  return `
    <div class="saved-set-item ${isActive ? "active" : ""}" role="listitem">
      <button type="button" class="saved-set-load btn btn-light text-start" data-set-id="${item.id}" aria-pressed="${isActive}">
        <span class="saved-set-name">${itemName}</span>
        <span class="saved-set-meta">Atualizado ${updatedAt}</span>
        <span class="saved-set-meta">${summary} · ${item.permission === "owner" ? "proprietário" : item.permission === "edit" ? "edição" : "leitura"}</span>
      </button>
      <button type="button" class="saved-set-delete btn btn-outline-danger btn-sm" data-delete-id="${item.id}" aria-label="Apagar ${itemName}" ${item.canDelete ? "" : "disabled"}>&#x78;</button>
    </div>
  `;
}

function renderSavedSetsSection(app) {
  const currentName = escapeHtml(app.currentSetName);
  const saveStatus = app.isSaving ? "A guardar..." : app.hasUnsavedChanges() ? "Alterações por guardar" : "Tudo guardado";
  const canSave = !app.isReadOnly && !app.isSaving;

  return `
    <section class="saved-sets-section" aria-labelledby="saved-sets-heading">
      <div class="saved-sets-header">
        <div class="color-palette-title saved-sets-title" id="saved-sets-heading">Ações</div>
        <div class="saved-sets-toolbar">
          <div>
            <div class="saved-sets-status-label">Status</div>
            <div class="saved-sets-status ${app.hasUnsavedChanges() ? "dirty" : ""}" aria-live="polite">${saveStatus}</div>
          </div>
          <button type="button" class="secondary-button" id="new-set">Novo Mapa</button>
        </div>
      </div>
      <label class="set-name-label" for="set-name">Nome do mapa</label>
      <input type="text" id="set-name" class="set-name-input form-control" maxlength="80" placeholder="Nome do mapa" value="${currentName}" ${canSave ? "" : "disabled"}>
      ${renderShareChooserInline(app)}
      <div class="saved-sets-actions d-flex gap-2 flex-wrap">
        <button type="button" class="btn btn-success" id="save-set" ${canSave ? "" : "disabled"}>Guardar</button>
        <button type="button" class="btn btn-warning" id="save-as-set" ${app.isOwner && !app.isSaving ? "" : "disabled"}>Guardar Como Novo</button>
        <button type="button" class="btn btn-info" id="copy-own-map" ${app.isOwner && app.currentSetId && !app.isSaving ? "" : "disabled"}>Copiar Mapa</button>
      </div>
    </section>
  `;
}

function renderSidebar(app) {
  return `
    <div class="color-palette col-12 col-xl-6">
      <div class="color-palette-title">Legenda</div>
      ${renderColoredAreaSummary(app)}
      ${app.colors.map((colorItem) => renderColorRow(app, colorItem)).join("")}
      ${renderNotesSection(app)}
      ${renderSavedSetsSection(app)}
    </div>
  `;
}

export function renderEditorPage(app) {
  return `
    <div class="container-fluid">
      ${renderHeader(app)}
      <div class="main-content row g-3">
        ${renderMap(app)}
        ${renderSidebar(app)}
      </div>
    </div>
    ${renderModal(app)}
  `;
}
