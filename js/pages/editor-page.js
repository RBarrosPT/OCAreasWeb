import { escapeHtml, formatDate, getDataItems } from "../utils.js?v=__ASSET_VERSION__";
import { renderHeader } from "./header.js?v=__ASSET_VERSION__";

function renderModal(app) {
  const showSetoresPorCor = app.showSetoresPorCor === true;

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
          <label class="modal-action-button form-check d-flex align-items-center gap-2" for="toggle-quadra-info">
            <input type="checkbox" class="form-check-input mt-0" id="toggle-quadra-info" ${app.showQuadraInfo ? "checked" : ""}>
            <span>Mostrar Informações da Quadra</span>
          </label>
          <label class="modal-action-button form-check d-flex align-items-center gap-2" for="toggle-setores-por-cor">
            <input type="checkbox" class="form-check-input mt-0" id="toggle-setores-por-cor" ${showSetoresPorCor ? "checked" : ""}>
            <span>Mostrar Nome Quadras e Setores por côr</span>
          </label>
          <!--
          <button type="button" class="modal-action-button secondary-button btn btn-outline-secondary" id="export-sets">Exportar JSON</button>
          <label class="modal-action-button import-button btn btn-outline-secondary" for="import-sets-modal">Importar JSON</label>
          <input type="file" id="import-sets-modal" class="visually-hidden" accept="application/json,.json">
          -->
          </div>
        <div class="modal-footer-note">
          <span class="color-percentage footer-note">@RB 2025 v1.1</span>
          <span class="color-percentage footer-note">Atualizado 10/05/2026</span>
        </div>
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
          <text transform="${item.textTransform}" font-size="11" fill="${textColor}" style="pointer-events: none;">
            <tspan x="${item.nomeTspanX}" y="${item.nomeTspanY}">${item.dataName}</tspan>
          </text>
          ${
            app.showSetores
              ? `
            <text transform="${item.setorTransform}" font-size="10" font-weight="bold" fill="#ff0000" style="pointer-events: none;">
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
        <div id="map-tooltip" class="map-tooltip" role="tooltip" hidden></div>
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
  const plants = app.getColorPlants(colorItem.color);
  const percentage = app.getColorPercentage(colorItem.color);
  const selectedItems = getDataItems().filter((item) => app.itemColors[item.dataName] === colorItem.color);
  const selectedQuadras = selectedItems.map((item) => escapeHtml(item.dataName));
  const selectedSetores = [...new Set(selectedItems.map((item) => String(item.setorData || "").trim()).filter(Boolean))]
    .map((setor) => escapeHtml(/^S/i.test(setor) ? setor.toUpperCase() : `S${setor}`));
  const quadrasLabel = selectedQuadras.length === 1 ? "Quadra" : "Quadras";
  const quadrasText = selectedQuadras.length ? selectedQuadras.join(", ") : "--";
  const setoresText = selectedSetores.length ? selectedSetores.join(", ") : "--";
  const isSelected = app.selectedColor === colorItem.color;
  const colorName = escapeHtml(app.colorNames[colorItem.color] || "");
  const groupId = `group-color-${colorItem.id}`;
  const sampleStyle = `background-color: ${colorItem.color}; color: ${colorItem.text};`;
  const disabled = app.isReadOnly ? "disabled" : "";
  const showSelectionDetails = app.showSetoresPorCor === true && String(colorItem.color || "").toUpperCase() !== "#FFFFFF";

  return `
    <div class="color-row">
      <button type="button" class="color-select-button ${isSelected ? "selected" : ""}" data-color="${colorItem.color}" aria-label="Selecionar grupo ${colorItem.id}" aria-pressed="${isSelected}">
        ${isSelected ? '<div class="radio-button-inner"></div>' : ""}
      </button>
      <button type="button" class="color-sample" style="${sampleStyle}" data-color="${colorItem.color}" aria-label="Aplicar cor do grupo ${colorItem.id}" ${disabled}></button>
      <div>
        <label class="visually-hidden" for="${groupId}">Notas da cor ${colorItem.id}</label>
        <input type="text" id="${groupId}" class="color-input form-control form-control-sm" placeholder="..." value="${colorName}" data-color="${colorItem.color}" ${disabled}>
        ${
          showSelectionDetails
            ? `<div class="color-selection-details" aria-live="polite">
          <span>${quadrasLabel}: ${quadrasText}</span>
          <span>Setores: ${setoresText}</span>
        </div>`
            : ""
        }
      </div>
      <div class="color-stats">
        <span class="color-count">(${count})</span>
        <span class="color-area">${area} ha</span>
        <span class="color-plants">${plants} plantas</span>
        <span class="color-percentage">${percentage}%</span>
      </div>
    </div>
  `;
}

function renderColoredAreaSummary(app) {
  const defaultColor = "#FFFFFF";
  const selectedItems = getDataItems().filter((item) => {
    const itemColor = String(app.itemColors[item.dataName] || defaultColor).toUpperCase();
    return itemColor !== defaultColor;
  });

  const areaWithoutFirstColor = selectedItems.reduce((total, item) => total + (parseFloat(item?.area) || 0), 0);
  const phase1Area = selectedItems.reduce((total, item) => {
    const itemName = String(item?.dataName || "").trim().toUpperCase();
    if (!itemName.startsWith("1")) {
      return total;
    }

    return total + (parseFloat(item?.area) || 0);
  }, 0);
  const phase2Area = selectedItems.reduce((total, item) => {
    const itemName = String(item?.dataName || "").trim().toUpperCase();
    if (!itemName.startsWith("2")) {
      return total;
    }

    return total + (parseFloat(item?.area) || 0);
  }, 0);
  const phase3Area = selectedItems.reduce((total, item) => {
    const itemName = String(item?.dataName || "").trim().toUpperCase();
    if (!itemName.startsWith("3")) {
      return total;
    }

    return total + (parseFloat(item?.area) || 0);
  }, 0);

  return `<div class="legend-area-summary">Área total selecionada: <strong>${areaWithoutFirstColor.toFixed(2)} ha</strong> | FASE 1: <strong>${phase1Area.toFixed(2)} ha</strong> | FASE 2: <strong>${phase2Area.toFixed(2)} ha</strong> | FASE 3: <strong>${phase3Area.toFixed(2)} ha</strong></div>`;
}

function renderColorSectorSummaryCard(app) {
  const cardState = app.editorCardState?.agronicSummary || { collapsed: false, hideOnPrint: false };
  const isCollapsed = Boolean(cardState.collapsed);
  const hideOnPrint = Boolean(cardState.hideOnPrint);
  const printButtonLabel = hideOnPrint ? "Mostrar na impressão" : "Ocultar na impressão";

  const rows = app.colors
    .slice(1)
    .map((colorItem) => {
      const selectedItems = getDataItems().filter((item) => app.itemColors[item.dataName] === colorItem.color);
      const setores = [...new Set(selectedItems
        .map((item) => String(item?.setorData || "").trim())
        .filter(Boolean))]
        .sort((left, right) => {
          const leftNumber = Number(left);
          const rightNumber = Number(right);

          if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
            return leftNumber - rightNumber;
          }

          return left.localeCompare(right, "pt-PT");
        });

      return {
        colorItem,
        setores,
        quantidadeSetores: setores.length,
        areaTotal: app.getColorArea(colorItem.color),
      };
    });

  const maxSetores = rows.reduce((max, row) => Math.max(max, row.setores.length), 0);
  const setorHeaders = Array.from({ length: maxSetores }, (_, index) => `<th>${index + 1}</th>`).join("");

  const tableRows = rows.map((row) => {
    const setorColumns = Array.from({ length: maxSetores }, (_, index) => {
      const setorValue = row.setores[index] || "-";
      return `<td>${escapeHtml(setorValue)}</td>`;
    }).join("");

    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <span class="color-sample" style="background-color: ${row.colorItem.color}; color: ${row.colorItem.text};" aria-hidden="true"></span>
          </div>
        </td>
        ${setorColumns}
        <td>${row.quantidadeSetores}</td>
        <td>${escapeHtml(row.areaTotal)} ha</td>
      </tr>
    `;
  }).join("");

  return `
    <div class="home-section card p-3 mt-3 ${hideOnPrint ? "editor-card-hide-on-print" : ""}">
      <div class="home-card-header d-flex align-items-center justify-content-between gap-2">
        <h3 class="mb-0">Resumo Setores Rega</h3>
        <div class="d-flex align-items-center gap-1">
          <button type="button" class="home-card-toggle btn btn-link btn-sm" data-editor-card-collapse="agronicSummary" aria-expanded="${String(!isCollapsed)}" aria-label="${isCollapsed ? "Expandir" : "Colapsar"} card Resumo Setores Rega">
            <span class="home-card-toggle-icon ${isCollapsed ? "collapsed" : ""}">▾</span>
          </button>
          <button type="button" class="btn btn-outline-secondary btn-sm" data-editor-card-print-toggle="agronicSummary" aria-pressed="${String(hideOnPrint)}">${printButtonLabel}</button>
        </div>
      </div>
      ${isCollapsed ? "" : `
        <div class="home-card-body">
          <div class="table-responsive mt-2">
            <table class="table table-sm table-striped align-middle mb-0 color-sector-summary-table">
              <thead>
                <tr>
                  <th>Cor</th>
                  ${setorHeaders}
                  <th>Qtd. setores</th>
                  <th>Área total</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </div>
      `}
    </div>
  `;
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

function renderEditorEtRows(rows, reductionPercent) {
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

function renderEditorEtSection(app) {
  const cardState = app.editorCardState?.editorEt || { collapsed: false, hideOnPrint: false };
  const isCollapsed = Boolean(cardState.collapsed);
  const hideOnPrint = Boolean(cardState.hideOnPrint);
  const printButtonLabel = hideOnPrint ? "Mostrar na impressão" : "Ocultar na impressão";

  const importState = app.etImportState || {};
  const rows = Array.isArray(importState.rows) ? importState.rows : [];
  const lastImportedAt = importState.lastImportedAt || "";
  const reductionPercent = Number(importState.reductionPercent) || 20;
  const etIdealHeader = `ET (mm) ideal -${reductionPercent}%`;
  const reductionOptions = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
    .map((value) => `<option value="${value}" ${value === reductionPercent ? "selected" : ""}>${value}%</option>`)
    .join("");

  return `
    <div class="home-section card p-3 mt-3 ${hideOnPrint ? "editor-card-hide-on-print" : ""}">
      <div class="home-card-header d-flex align-items-center justify-content-between gap-2">
        <h3 class="mb-0">Evapotranspiração (ET) - PREVISÃO dados IRRISTRAT</h3>
        <div class="d-flex align-items-center gap-1">
          <button type="button" class="home-card-toggle btn btn-link btn-sm" data-editor-card-collapse="editorEt" aria-expanded="${String(!isCollapsed)}" aria-label="${isCollapsed ? "Expandir" : "Colapsar"} card Evapotranspiração">
            <span class="home-card-toggle-icon ${isCollapsed ? "collapsed" : ""}">▾</span>
          </button>
          <button type="button" class="btn btn-outline-secondary btn-sm" data-editor-card-print-toggle="editorEt" aria-pressed="${String(hideOnPrint)}">${printButtonLabel}</button>
        </div>
      </div>
      ${isCollapsed ? "" : `
        <div class="home-card-body">
          <div class="home-et-header d-flex align-items-center justify-content-start gap-2 flex-wrap">
            <div class="home-et-controls d-flex align-items-center gap-2 flex-wrap">
              <label for="home-et-reduction-percent" class="form-label mb-0">Fator de redução (plásticos)</label>
              <select id="home-et-reduction-percent" class="form-select form-select-sm home-et-reduction-select">
                ${reductionOptions}
              </select>
            </div>
          </div>
          ${lastImportedAt ? `<div class="home-et-meta text-muted small mt-2">Última importação: ${escapeHtml(formatDate(lastImportedAt))}</div>` : ""}
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
                    ${renderEditorEtRows(rows, reductionPercent)}
                  </tbody>
                </table>
              </div>
            `
            : '<div class="text-muted small mt-2">Sem dados ET guardados.</div>'}
        </div>
      `}
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
  const canViewRestrictedCards = app.user?.username === "ricardo_barros";

  return `
    <div class="color-palette col-12 col-xl-6">
      <div class="color-palette-title">Legenda</div>
      ${renderColoredAreaSummary(app)}
      ${app.colors.map((colorItem) => renderColorRow(app, colorItem)).join("")}
      ${renderNotesSection(app)}
      ${canViewRestrictedCards ? renderColorSectorSummaryCard(app) : ""}
      ${canViewRestrictedCards ? renderEditorEtSection(app) : ""}
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
