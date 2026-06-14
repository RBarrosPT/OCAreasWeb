import { escapeHtml, formatDate } from "../../utils.js?v=__ASSET_VERSION__";

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

function renderEtRows(rows, reductionPercent) {
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

export function renderEtForecastCard(app, options = {}) {
  const importState = app.etImportState || {};
  const rows = Array.isArray(importState.rows) ? importState.rows : [];
  const lastImportedAt = importState.lastImportedAt || "";
  const reductionPercent = Number(importState.reductionPercent) || 20;
  const etIdealHeader = `ET (mm) ideal -${reductionPercent}%`;
  const error = importState.error || "";
  const isLoading = Boolean(importState.loading);
  const remainingSeconds = Math.max(0, Number(importState.remainingSeconds) || 0);
  const timeoutSeconds = 90;
  const elapsedSeconds = Math.min(timeoutSeconds, Math.max(1, timeoutSeconds - remainingSeconds + 1));
  const importLabel = isLoading ? app.t("loadingEtForecast", { elapsed: elapsedSeconds, timeout: timeoutSeconds }) : "Obter previsão";
  const isCollapsed = Boolean(app.homeSectionCollapsed?.etImport);
  const title = options.title || app.t("etImportTitle");
  const reductionOptions = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
    .map((value) => `<option value="${value}" ${value === reductionPercent ? "selected" : ""}>${value}%</option>`)
    .join("");

  return `
    <div class="home-section card p-3">
      <div class="home-card-header d-flex align-items-center justify-content-between gap-2">
        <h3 class="mb-0">${escapeHtml(title)}</h3>
        <button type="button" class="home-card-toggle btn btn-link" data-home-section-toggle="etImport" aria-expanded="${String(!isCollapsed)}" aria-label="${isCollapsed ? app.t("expand") : app.t("navCollapse")} ${escapeHtml(title)}">
          <span class="home-card-toggle-icon ${isCollapsed ? "collapsed" : ""}">▾</span>
        </button>
      </div>
      ${isCollapsed ? "" : `
        <div class="home-card-body">
          <div class="home-et-header d-flex align-items-center justify-content-start gap-2 flex-wrap">
            <div class="home-et-controls d-flex align-items-center gap-2 flex-wrap">
              <label for="home-et-reduction-percent" class="form-label mb-0">Fator de redução (plásticos)</label>
              <select id="home-et-reduction-percent" class="form-select form-select-sm home-et-reduction-select">
                ${reductionOptions}
              </select>
              <button type="button" class="btn btn-outline-primary btn-sm" id="home-import-et" ${isLoading ? "disabled" : ""}>
                ${importLabel}
              </button>
            </div>
          </div>
          ${lastImportedAt ? `<div class="home-et-meta text-muted small mt-2">${escapeHtml(app.t("lastEtForecast", { date: formatDate(lastImportedAt) }))}</div>` : ""}
          ${error ? `<div class="app-flash-message error mt-2" role="alert">${escapeHtml(error)}</div>` : ""}
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
                    ${renderEtRows(rows, reductionPercent)}
                  </tbody>
                </table>
              </div>
            `
            : `<div class="text-muted small mt-2">${escapeHtml(app.t("emptyEtForecast"))}</div>`}
        </div>
      `}
    </div>
  `;
}
