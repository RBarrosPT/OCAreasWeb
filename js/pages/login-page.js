import { escapeHtml } from "../utils.js?v=__ASSET_VERSION__";

function renderLanguageSelector(app) {
  return `
    <div class="d-flex justify-content-end mb-3">
      <div class="btn-group" role="group" aria-label="${escapeHtml(app.t("selectLanguage"))}">
        ${["pt", "en", "es"].map((language) => {
          const isActive = app.language === language;
          return `<button type="button" class="btn ${isActive ? "btn-primary" : "btn-outline-secondary"} btn-sm" data-language-switch="${language}" aria-pressed="${String(isActive)}">${escapeHtml(app.t(`language${language.toUpperCase()}`))}</button>`;
        }).join("")}
      </div>
    </div>
  `;
}

export function renderLoginPage(app) {
  const error = app.authError ? `<div class="auth-error">${escapeHtml(app.authError)}</div>` : "";

  return `
    <div class="auth-container container-fluid">
      <div class="auth-card card shadow-sm p-3 p-md-4">
        ${renderLanguageSelector(app)}
        <h1 class="h4 mb-2">${escapeHtml(app.t("welcomeTitle"))}</h1>
        <h2 class="h6 mb-1">${escapeHtml(app.t("loginTitle"))}</h2>
        <p class="text-muted mb-3">${escapeHtml(app.t("authenticationRequired"))}</p>
        ${error}

        <label class="set-name-label" for="auth-username">${escapeHtml(app.t("username"))}</label>
        <input id="auth-username" class="set-name-input form-control" type="text" maxlength="80" placeholder="${escapeHtml(app.t("username"))}" autocomplete="username">

        <label class="set-name-label" for="auth-password">${escapeHtml(app.t("password"))}</label>
        <div class="password-wrapper">
          <input id="auth-password" class="set-name-input form-control" type="password" maxlength="120" placeholder="${escapeHtml(app.t("password"))}" autocomplete="current-password">
          <button type="button" class="password-toggle btn btn-outline-secondary" id="auth-password-toggle" aria-label="${escapeHtml(app.t("passwordToggleShow"))}" aria-pressed="false">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>

        <div class="saved-sets-actions d-flex gap-2 flex-wrap">
          <button type="button" class="toggle-button btn btn-primary" id="auth-submit">${escapeHtml(app.t("loginButton"))}</button>
          <button type="button" class="secondary-button btn btn-outline-secondary" id="auth-switch-mode">${escapeHtml(app.t("switchToRegister"))}</button>
        </div>
      </div>
    </div>
  `;
}
