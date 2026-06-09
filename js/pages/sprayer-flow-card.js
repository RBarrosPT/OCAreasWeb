import { escapeHtml } from "../utils.js?v=__ASSET_VERSION__";

const SPRAYER_FLOW_ROWS = [
  { nozzleDiameter: "0,4", bar: "1,5", lMin: "0,16" },
  { nozzleDiameter: "0,4", bar: "2", lMin: "0,18" },
  { nozzleDiameter: "0,4", bar: "3", lMin: "0,24" },
  { nozzleDiameter: "0,4", bar: "4", lMin: "0,27" },
  { nozzleDiameter: "0,4", bar: "5", lMin: "0,31" },
  { nozzleDiameter: "0,5", bar: "1,5", lMin: "0,22" },
  { nozzleDiameter: "0,5", bar: "2", lMin: "0,24" },
  { nozzleDiameter: "0,5", bar: "3", lMin: "0,34" },
  { nozzleDiameter: "0,5", bar: "4", lMin: "0,4" },
  { nozzleDiameter: "0,5", bar: "5", lMin: "0,48" },
  { nozzleDiameter: "0,6", bar: "1,5", lMin: "0,25" },
  { nozzleDiameter: "0,6", bar: "2", lMin: "0,29" },
  { nozzleDiameter: "0,6", bar: "3", lMin: "0,4" },
  { nozzleDiameter: "0,6", bar: "4", lMin: "0,52" },
  { nozzleDiameter: "0,6", bar: "5", lMin: "0,6" },
  { nozzleDiameter: "0,8", bar: "1,5", lMin: "0,4" },
  { nozzleDiameter: "0,8", bar: "2", lMin: "0,46" },
  { nozzleDiameter: "0,8", bar: "3", lMin: "0,57" },
  { nozzleDiameter: "0,8", bar: "4", lMin: "0,65" },
  { nozzleDiameter: "0,8", bar: "5", lMin: "0,73" },
  { nozzleDiameter: "1,5", bar: "1,5", lMin: "1,06" },
  { nozzleDiameter: "1,5", bar: "2", lMin: "1,23" },
  { nozzleDiameter: "1,5", bar: "3", lMin: "1,51" },
  { nozzleDiameter: "1,5", bar: "4", lMin: "1,74" },
  { nozzleDiameter: "1,5", bar: "5", lMin: "1,95" },
  { nozzleDiameter: "1,8", bar: "1,5", lMin: "1,4" },
  { nozzleDiameter: "1,8", bar: "2", lMin: "1,61" },
  { nozzleDiameter: "1,8", bar: "3", lMin: "1,98" },
  { nozzleDiameter: "1,8", bar: "4", lMin: "2,28" },
  { nozzleDiameter: "1,8", bar: "5", lMin: "2,55" },
  { nozzleDiameter: "2", bar: "1,5", lMin: "1,56" },
  { nozzleDiameter: "2", bar: "2", lMin: "1,8" },
  { nozzleDiameter: "2", bar: "3", lMin: "2,21" },
  { nozzleDiameter: "2", bar: "4", lMin: "2,55" },
  { nozzleDiameter: "2", bar: "5", lMin: "2,85" },
];

function parseLocaleNumber(value, fallback) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  const numeric = Number.parseFloat(normalized);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatLocaleNumber(value, decimals = 2) {
  const fixed = Number(value).toFixed(decimals);
  return fixed
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(".", ",");
}

function calculateLitersPerHectare(totalFlow, speedKmH, rowSpacing) {
  if (!Number.isFinite(totalFlow) || !Number.isFinite(speedKmH) || !Number.isFinite(rowSpacing) || speedKmH <= 0 || rowSpacing <= 0) {
    return 0;
  }

  // L/ha = (600 * Q) / (V * E)
  return (600 * totalFlow) / (speedKmH * rowSpacing);
}

function renderSprayerFlowRows(nozzles, rowSpacing, speedKmH) {
  const groupedRows = SPRAYER_FLOW_ROWS.reduce((groups, row) => {
    const diameter = row.nozzleDiameter;
    if (!groups.has(diameter)) {
      groups.set(diameter, []);
    }
    groups.get(diameter).push(row);
    return groups;
  }, new Map());

  const orderedGroups = Array.from(groupedRows.entries()).sort(([leftDiameter], [rightDiameter]) => {
    if (leftDiameter === "2") {
      return 1;
    }
    if (rightDiameter === "2") {
      return -1;
    }
    return 0;
  });

  return orderedGroups
    .map(([diameter, rows]) => `
      <tr class="home-sprayer-group-row">
        <td colspan="4">Diâmetro bico: ${escapeHtml(diameter)}</td>
      </tr>
      ${rows.map((row) => {
        const flowPerNozzle = parseLocaleNumber(row.lMin, 0);
        const totalFlow = flowPerNozzle * nozzles;
        const litersPerHectare = calculateLitersPerHectare(totalFlow, speedKmH, rowSpacing);

        return `
          <tr>
            <td>${escapeHtml(row.bar)}</td>
            <td>${escapeHtml(row.lMin)}</td>
            <td>${escapeHtml(formatLocaleNumber(totalFlow))}</td>
            <td>${escapeHtml(formatLocaleNumber(litersPerHectare, 0))}</td>
          </tr>
        `;
      }).join("")}
    `)
    .join("");
}

export function renderSprayerFlowCard(app) {
  const isCollapsed = Boolean(app.homeSectionCollapsed?.sprayerFlow);
  const config = app.sprayerFlowConfig || {};
  const nozzles = parseLocaleNumber(config.nozzles, 14);
  const rowSpacing = parseLocaleNumber(config.rowSpacing, 3.3);
  const speedKmH = parseLocaleNumber(config.speedKmH, 5);

  return `
    <div class="home-section card p-3">
      <div class="home-card-header d-flex align-items-center justify-content-between gap-2">
        <h3 class="mb-0">Calculo débito pulverizadores MAGGIO eletrostático</h3>
        <button type="button" class="home-card-toggle btn btn-link" data-home-section-toggle="sprayerFlow" aria-expanded="${String(!isCollapsed)}" aria-label="${isCollapsed ? "Expandir" : "Colapsar"} card Calculo débito pulverizadores">
          <span class="home-card-toggle-icon ${isCollapsed ? "collapsed" : ""}">▾</span>
        </button>
      </div>
      ${isCollapsed ? "" : `
        <div class="home-card-body">
          <div class="home-sprayer-form row g-2 align-items-end">
            <div class="col-12 col-md-4">
              <label for="sprayer-nozzles-input" class="form-label mb-1">Nº de bicos:</label>
              <input id="sprayer-nozzles-input" class="form-control form-control-sm" type="text" inputmode="numeric" value="${escapeHtml(formatLocaleNumber(nozzles, 0))}">
            </div>
            <div class="col-12 col-md-4">
              <label for="sprayer-row-spacing-input" class="form-label mb-1">Compasso entre linhas (m):</label>
              <input id="sprayer-row-spacing-input" class="form-control form-control-sm" type="text" inputmode="decimal" value="${escapeHtml(formatLocaleNumber(rowSpacing))}">
            </div>
            <div class="col-12 col-md-4">
              <label for="sprayer-speed-input" class="form-label mb-1">Velocidade (Km / h) :</label>
              <input id="sprayer-speed-input" class="form-control form-control-sm" type="text" inputmode="decimal" value="${escapeHtml(formatLocaleNumber(speedKmH))}">
            </div>
          </div>
          <div class="table-responsive mt-2">
            <table class="table table-sm table-striped table-hover align-middle mb-0 home-sprayer-flow-table">
              <thead>
                <tr>
                  <th>Pressão (BAR)</th>
                  <th>L/min</th>
                  <th>Caudal Total L/min</th>
                  <th>L/ha</th>
                </tr>
              </thead>
              <tbody>
                ${renderSprayerFlowRows(nozzles, rowSpacing, speedKmH)}
              </tbody>
            </table>
          </div>
        </div>
      `}
    </div>
  `;
}