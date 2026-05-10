import { escapeHtml } from "../utils.js?v=__ASSET_VERSION__";

export function renderLoginPage(app) {
  const error = app.authError ? `<div class="auth-error">${escapeHtml(app.authError)}</div>` : "";

  return `
    <div class="auth-container container-fluid">
      <div class="auth-card card shadow-sm p-3 p-md-4">
        <h1 class="h4 mb-2">Outro Chão - Mapas</h1>
        <h2 class="h6 mb-1">Entrar</h2>
        <p class="text-muted mb-3">Autenticação obrigatória.</p>
        ${error}

        <label class="set-name-label" for="auth-username">Utilizador</label>
        <input id="auth-username" class="set-name-input form-control" type="text" maxlength="80" placeholder="utilizador" autocomplete="username">

        <label class="set-name-label" for="auth-password">Password</label>
        <div class="password-wrapper">
          <input id="auth-password" class="set-name-input form-control" type="password" maxlength="120" placeholder="password" autocomplete="current-password">
          <button type="button" class="password-toggle btn btn-outline-secondary" id="auth-password-toggle" aria-label="Mostrar password" aria-pressed="false">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>

        <div class="saved-sets-actions d-flex gap-2 flex-wrap">
          <button type="button" class="toggle-button btn btn-primary" id="auth-submit">Entrar</button>
          <button type="button" class="secondary-button btn btn-outline-secondary" id="auth-switch-mode">Criar conta</button>
        </div>
      </div>
    </div>
  `;
}
