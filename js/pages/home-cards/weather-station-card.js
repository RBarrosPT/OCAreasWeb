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

function formatWeatherStationIdealEtValue(etValue, reductionPercent = 20) {
  const source = String(etValue || "").trim();
  const numericValue = Number.parseFloat(source.replace(",", "."));

  if (!Number.isFinite(numericValue)) {
    return "N/A";
  }

  const normalizedPercent = Number.isFinite(Number(reductionPercent)) ? Number(reductionPercent) : 20;
  const idealValue = numericValue * (1 - (normalizedPercent / 100));
  return `${idealValue.toFixed(2)}`;
}

function renderWeatherStationRows(rows, reductionPercent) {
  return rows.map((row) => `
    <tr>
      <td>${escapeHtml(formatEtDisplayDate({ dataCompleta: row?.readingDate || row?.data }))}</td>
      <td>${escapeHtml(String(row?.precipitacaoMm || "0.00"))}</td>
      <td>${escapeHtml(String(row?.etMm || "0.00"))}</td>
      <td>${escapeHtml(formatWeatherStationIdealEtValue(row?.etMm || "0.00", reductionPercent))}</td>
      <td>${escapeHtml(String(row?.tempMinC || "N/A"))}</td>
      <td>${escapeHtml(String(row?.tempMaxC || "N/A"))}</td>
    </tr>
  `).join("");
}

export function renderWeatherStationCard(app, options = {}) {
  const stationState = app.weatherStationState || {};
  const rows = Array.isArray(stationState.rows) ? stationState.rows : [];
  const lastImportedAt = stationState.lastImportedAt || "";
  const remainingSeconds = Math.max(0, Number(stationState.remainingSeconds) || 0);
  const timeoutSeconds = 90;
  const elapsedSeconds = Math.min(timeoutSeconds, Math.max(1, timeoutSeconds - remainingSeconds + 1));
  const reductionPercent = Number(stationState.reductionPercent) || 20;
  const etIdealHeader = `ET (mm) ideal -${reductionPercent}%`;
  const error = stationState.error || "";
  const isLoading = Boolean(stationState.loading);
  const importLabel = isLoading ? app.t("loadingWeatherStation", { elapsed: elapsedSeconds, timeout: timeoutSeconds }) : "Obter leitura estação";
  const isCollapsed = Boolean(app.homeSectionCollapsed?.weatherStation);
  const title = options.title || app.t("weatherStationTitle");
  const reductionOptions = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
    .map((value) => `<option value="${value}" ${value === reductionPercent ? "selected" : ""}>${value}%</option>`)
    .join("");

  return `
    <div class="home-section card p-3">
      <div class="home-card-header d-flex align-items-center justify-content-between gap-2">
        <h3 class="mb-0">${escapeHtml(title)}</h3>
        <button type="button" class="home-card-toggle btn btn-link" data-home-section-toggle="weatherStation" aria-expanded="${String(!isCollapsed)}" aria-label="${isCollapsed ? app.t("expand") : app.t("navCollapse")} ${escapeHtml(title)}">
          <span class="home-card-toggle-icon ${isCollapsed ? "collapsed" : ""}">▾</span>
        </button>
      </div>
      ${isCollapsed ? "" : `
        <div class="home-card-body">
          <div class="home-et-header d-flex align-items-center justify-content-start gap-2 flex-wrap">
            <div class="home-et-controls d-flex align-items-center gap-2 flex-wrap">
              <label for="home-weather-station-reduction-percent" class="form-label mb-0">Fator de redução (plásticos)</label>
              <select id="home-weather-station-reduction-percent" class="form-select form-select-sm home-et-reduction-select">
                ${reductionOptions}
              </select>
              <button type="button" class="btn btn-outline-primary btn-sm" id="home-import-weather-station" ${isLoading ? "disabled" : ""}>
                ${importLabel}
              </button>
            </div>
          </div>
          ${lastImportedAt ? `<div class="home-et-meta text-muted small mt-2">${escapeHtml(app.t("lastWeatherReading", { date: formatDate(lastImportedAt) }))}</div>` : ""}
          ${error ? `<div class="app-flash-message error mt-2" role="alert">${escapeHtml(error)}</div>` : ""}
          ${rows.length
            ? `
              <div class="table-responsive mt-2">
                <table class="table table-sm table-striped align-middle home-et-table mb-0">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Precipitação (mm)</th>
                      <th>ET (mm)</th>
                      <th>${escapeHtml(etIdealHeader)}</th>
                      <th>Temp. ºC Mín.</th>
                      <th>Temp. Máx.</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${renderWeatherStationRows(rows, reductionPercent)}
                  </tbody>
                </table>
              </div>
            `
            : `<div class="text-muted small mt-2">${escapeHtml(app.t("emptyWeatherStation"))}</div>`}
        </div>
      `}
    </div>
  `;
}
