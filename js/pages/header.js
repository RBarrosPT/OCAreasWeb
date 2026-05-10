import { escapeHtml } from "../utils.js?v=__ASSET_VERSION__";

export function renderHeader(app) {
  const showEditorControls = app.viewMode === "editor";
  const mapName = escapeHtml((app.currentSetName || "Mapa sem nome").trim() || "Mapa sem nome");
  const breadcrumb = showEditorControls
    ? `
      <nav aria-label="breadcrumb" class="header-breadcrumb-wrapper">
        <ol class="breadcrumb header-breadcrumb mb-0">
          <li class="breadcrumb-item">Mapas</li>
          <li class="breadcrumb-item active" aria-current="page">${mapName}</li>
        </ol>
      </nav>
    `
    : "";

  return `
    <div class="header container-fluid">
      <div class="header-main">
        <div class="title"><h2>Outro Chão - Agricultura Biológica, Lda.</h2></div>
        ${breadcrumb}
      </div>
      <div class="header-controls d-flex align-items-center gap-2 flex-wrap">
        ${showEditorControls ? '<button type="button" class="secondary-button btn btn-outline-secondary btn-sm" id="go-home-button">Mapas</button>' : ""}
        <span class="user-badge">${escapeHtml(app.user.username)}</span>
        <button type="button" class="btn btn-secondary" id="logout-button">Sair</button>
        ${showEditorControls ? '<button type="button" class="gear-button btn btn-outline-secondary btn-sm" id="open-settings" aria-label="Definições" aria-haspopup="dialog">&#x26ED;</button>' : ""}
      </div>
    </div>
  `;
}
