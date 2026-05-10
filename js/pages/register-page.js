import { escapeHtml } from "../utils.js?v=__ASSET_VERSION__";

export function renderRegisterPage(app) {
  const error = app.authError ? `<div class="auth-error">${escapeHtml(app.authError)}</div>` : "";

  return `
    <div class="auth-container container-fluid">
      <div class="auth-card card shadow-sm p-3 p-md-4">
        <h1 class="h4 mb-2">Outro Chão - Mapas</h1>
        <h2 class="h6 mb-1">Criar conta</h2>
        <p class="text-muted mb-3">Registo de novo utilizador.</p>
        ${error}

        <label class="set-name-label" for="auth-email">Email autorizado</label>
        <input id="auth-email" class="set-name-input form-control" type="email" maxlength="160" placeholder="email@dominio.pt" autocomplete="email">
        <ul class="email-rules mb-3">
          <li>O email tem de estar previamente autorizado pelo administrador.</li>
          <li>Após o registo, o email autorizado não pode ser reutilizado para outro registo.</li>
        </ul>

        <label class="set-name-label" for="auth-username">Utilizador</label>
        <input id="auth-username" class="set-name-input form-control" type="text" maxlength="80" placeholder="utilizador" autocomplete="username">
        <ul class="auth-rules mb-3" id="rules-username">
          <li data-rule="u-min">Mínimo 6 caracteres</li>
          <li data-rule="u-chars">Apenas letras (A-Z), números (0-9), ponto (.) ou underscore (_)</li>
          <li data-rule="u-nospace">Sem espaços ou outros símbolos</li>
          <li data-rule="u-case">Não diferencia maiúsculas/minúsculas (será convertido automaticamente)</li>
        </ul>

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
        <label class="set-name-label" for="auth-password-confirm">Confirmar password</label>
        <div class="password-wrapper">
          <input id="auth-password-confirm" class="set-name-input form-control" type="password" maxlength="120" placeholder="confirmar password" autocomplete="new-password">
          <button type="button" class="password-toggle btn btn-outline-secondary" id="auth-password-confirm-toggle" aria-label="Mostrar confirmação da password" aria-pressed="false">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
        <ul class="auth-rules mb-3" id="rules-password">
          <li data-rule="p-min">Mínimo 9 caracteres</li>
          <li data-rule="p-upper">Pelo menos 1 letra maiúscula (A-Z)</li>
          <li data-rule="p-lower">Pelo menos 1 letra minúscula (a-z)</li>
          <li data-rule="p-digit">Pelo menos 1 número (0-9)</li>
          <li data-rule="p-symbol">Pelo menos 1 símbolo (ex: ! @ # $ %)</li>
          <li data-rule="p-match">A confirmação da password deve coincidir</li>
        </ul>

        <div class="saved-sets-actions d-flex gap-2 flex-wrap">
          <button type="button" class="toggle-button btn btn-primary" id="auth-submit">Registar</button>
          <button type="button" class="secondary-button btn btn-outline-secondary" id="auth-switch-mode">Já tenho conta</button>
        </div>
      </div>
    </div>
  `;
}
