import { escapeHtml } from "../utils.js?v=__ASSET_VERSION__";
import { getSupportedLanguages } from "../i18n.js?v=__ASSET_VERSION__";

export function renderHeader(app) {
  const showEditorControls = app.viewMode === "editor";
  const mapName = escapeHtml((app.currentSetName || app.t("mapNameMissing")).trim() || app.t("mapNameMissing"));
  const breadcrumb = showEditorControls
    ? `
      <nav aria-label="breadcrumb" class="header-breadcrumb-wrapper">
        <ol class="breadcrumb header-breadcrumb mb-0">
          <li class="breadcrumb-item">${escapeHtml(app.t("maps"))}</li>
          <li class="breadcrumb-item active" aria-current="page">${mapName}</li>
        </ol>
      </nav>
    `
    : "";
  const languageButtons = getSupportedLanguages().map((language) => {
    const isActive = app.language === language;
    return `<button type="button" class="btn ${isActive ? "btn-primary" : "btn-outline-secondary"} btn-sm" data-language-switch="${language}" aria-pressed="${String(isActive)}">${escapeHtml(app.t(`language${language.toUpperCase()}`))}</button>`;
  }).join("");

  return `
    <div class="header container-fluid">
      <div class="header-main">
        <div class="title"><h2>${escapeHtml(app.t("brandTitle"))}</h2></div>
        ${breadcrumb}
      </div>
      <div class="header-controls d-flex align-items-center gap-2 flex-wrap">
        <div class="btn-group" role="group" aria-label="${escapeHtml(app.t("selectLanguage"))}">${languageButtons}</div>
        ${showEditorControls ? `<button type="button" class="secondary-button btn btn-outline-secondary btn-sm" id="go-home-button">${escapeHtml(app.t("goHome"))}</button>` : ""}
        <span class="user-badge">${escapeHtml(app.user.username)}</span>
        <button type="button" class="btn btn-secondary" id="logout-button">${escapeHtml(app.t("logout"))}</button>
        ${showEditorControls ? `<button type="button" class="gear-button btn btn-outline-secondary btn-sm" id="open-settings" aria-label="${escapeHtml(app.t("preferences"))}" aria-haspopup="dialog">&#x26ED;</button>` : ""}
      </div>
    </div>
  `;
}
