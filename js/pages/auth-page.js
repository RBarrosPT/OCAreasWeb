import { renderLoginPage } from "./login-page.js?v=__ASSET_VERSION__";
import { renderRegisterPage } from "./register-page.js?v=__ASSET_VERSION__";

export function renderAuthPage(app) {
  return app.authMode === "register" ? renderRegisterPage(app) : renderLoginPage(app);
}
