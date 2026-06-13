import { escapeHtml } from "../utils.js?v=__ASSET_VERSION__";
import { renderHeader } from "./header.js?v=__ASSET_VERSION__";
import { renderSharedMapsCard } from "./home-cards/shared-maps-card.js?v=__ASSET_VERSION__";
import { renderEtForecastCard } from "./home-cards/et-forecast-card.js?v=__ASSET_VERSION__";
import { renderWeatherStationCard } from "./home-cards/weather-station-card.js?v=__ASSET_VERSION__";
import { renderNozzleReferenceCard } from "./home-cards/nozzle-reference-card.js?v=__ASSET_VERSION__";
import { renderSprayerFlowCard } from "./sprayer-flow-card.js?v=__ASSET_VERSION__";
import { renderLhaCard } from "./lha-card.js?v=__ASSET_VERSION__";

const HOME_CARD_TITLES = {
  sharedMaps: "Mapas Partilhados Comigo",
  etImport: "Evapotranspiração (ET) - PREVISÃO dados IRRISTRAT",
  weatherStation: "Leituras estação metrológica - dados IRRISTRAT",
  sprayerFlow: "Calculo débito pulverizadores MAGGIO eletrostático",
  lhaCalculator: "Cálculo L/Ha",
  nozzleReferences: "Tabelas Referencia Bicos",
};

function renderFlashMessage(app) {
  if (!app.flashMessage?.text) {
    return "";
  }

  return `<div class="app-flash-message ${app.flashMessage.type === "success" ? "success" : "error"}" role="status" aria-live="polite">${escapeHtml(app.flashMessage.text)}</div>`;
}

function renderCardContent(app) {
  switch (app.homeCardPage) {
    case "sharedMaps":
      return renderSharedMapsCard(app, { tableId: "shared-maps-page-table", title: HOME_CARD_TITLES.sharedMaps });
    case "etImport":
      return renderEtForecastCard(app, { title: HOME_CARD_TITLES.etImport });
    case "weatherStation":
      return renderWeatherStationCard(app, { title: HOME_CARD_TITLES.weatherStation });
    case "sprayerFlow":
      return renderSprayerFlowCard(app);
    case "lhaCalculator":
      return renderLhaCard(app);
    case "nozzleReferences":
      return renderNozzleReferenceCard({ title: HOME_CARD_TITLES.nozzleReferences });
    default:
      return "";
  }
}

export function renderHomeCardPage(app) {
  const currentTitle = HOME_CARD_TITLES[app.homeCardPage] || "Card";

  return `
    <div class="container-fluid">
      ${renderHeader(app)}
      <div class="home-container container py-3">
        ${renderFlashMessage(app)}
        <div class="home-card-page-toolbar d-flex align-items-center justify-content-between gap-2 flex-wrap">
          <button type="button" class="btn btn-outline-secondary" id="home-card-back">Voltar à página principal</button>
          <span class="home-card-page-title">${escapeHtml(currentTitle)}</span>
        </div>
        ${renderCardContent(app)}
      </div>
    </div>
  `;
}
