import { escapeHtml } from "../../utils.js?v=__ASSET_VERSION__";

const NOZZLE_REFERENCE_LINKS = [
  {
    label: "ALBUZ ATR 60º",
    url: "https://albuz-spray.com/en/pdf/arbo-viticulture-NON-ISO-ATR-60.pdf",
  },
  {
    label: "ALBUZ ATR 80º",
    url: "https://albuz-spray.com/en/pdf/arbo-viticulture-NON-ISO-ATR-80.pdf",
  },
  {
    label: "MANEZ LOZANO ALBUZ ATR 80º",
    url: "https://manezylozano.com/wp-content/uploads/2018/04/BOQUILLA-ALBUZ-ATR-80-1.pdf",
  },
  {
    label: "ASJ HCI 80º",
    url: "https://asjnozzle.it/wp-content/uploads/ugelli_a_cono__HCI80.pdf",
  },
  {
    label: "ASJ CATÁLOGO",
    url: "https://asjnozzle.it/wp-content/uploads/Catalogo_ASJ_DC6013A_Rev-02.pdf",
  },
  {
    label: "MAGGIO CATÁLOGO",
    url: "https://www.maggiosrl.com/wp-content/uploads/2025/12/Listino-A4-2025-Rev.2-Italiano-SENZA-PREZZI.pdf",
  },
  
];

export function renderNozzleReferenceCard(options = {}) {
  const title = options.title || "Tabelas Referencia Bicos";

  return `
    <div class="home-section card p-3">
      <div class="home-card-header d-flex align-items-center justify-content-between gap-2">
        <h3 class="mb-0">${escapeHtml(title)}</h3>
      </div>
      <div class="home-card-body">
        <div class="list-group list-group-flush">
          ${NOZZLE_REFERENCE_LINKS.map((item) => `
            <a class="list-group-item list-group-item-action" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(item.label)}
            </a>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}
